const utf8 = new TextDecoder();
const encode = new TextEncoder();
const sheetNS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const uncompressedLimit = 40 * 1024 * 1024;

function nodes(doc, name) {
  return [...doc.getElementsByTagNameNS('*', name)];
}

function parse(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (nodes(doc, 'parsererror').length) throw new Error('O arquivo contém uma parte XML inválida.');
  return doc;
}

function serialize(doc) {
  return encode.encode(new XMLSerializer().serializeToString(doc));
}

function readZip(buffer) {
  const raw = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const short = offset => view.getUint16(offset, true);
  const word = offset => view.getUint32(offset, true);
  let end = raw.length - 22;
  while (end >= Math.max(0, raw.length - 65557)) {
    if (word(end) === 0x06054b50 && end + 22 + short(end + 20) === raw.length) break;
    end--;
  }
  if (end < Math.max(0, raw.length - 65557) || short(end + 4) || short(end + 6)) {
    throw new Error('Selecione um arquivo XLSX ou XLSM do Excel.');
  }
  const entries = new Map();
  const count = short(end + 10);
  let offset = word(end + 16);
  for (let i = 0; i < count; i++) {
    if (word(offset) !== 0x02014b50) throw new Error('Estrutura da planilha incompatível.');
    const flags = short(offset + 8);
    if (flags & 1) throw new Error('Arquivos criptografados não podem ser abertos.');
    const method = short(offset + 10);
    const size = word(offset + 20);
    const fullSize = word(offset + 24);
    const nameLength = short(offset + 28);
    const next = offset + 46 + nameLength + short(offset + 30) + short(offset + 32);
    const nameBytes = raw.subarray(offset + 46, offset + 46 + nameLength);
    const name = utf8.decode(nameBytes);
    const local = word(offset + 42);
    if (word(local) !== 0x04034b50) throw new Error('Estrutura da planilha incompatível.');
    const data = local + 30 + short(local + 26) + short(local + 28);
    entries.set(name, {nameBytes, flags, method, fullSize, bytes:raw.subarray(data,data+size), central:raw.subarray(offset,next)});
    offset = next;
  }
  return entries;
}

async function readXml(entries, name) {
  const part = entries.get(name);
  if (!part || part.fullSize > uncompressedLimit) throw new Error('Uma parte da planilha está ausente ou excede 40 MB.');
  if (part.method === 0) return parse(utf8.decode(part.bytes));
  if (part.method !== 8) throw new Error('Compactação incompatível.');
  const stream = new Blob([part.bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return parse(await new Response(stream).text());
}

function location(target) {
  if (target.startsWith('/')) return target.slice(1);
  return new URL(target,'https://workbook.invalid/xl/workbook.xml').pathname.slice(1);
}

export async function openWorkbook(file, template) {
  const entries = readZip(await file.arrayBuffer());
  const workbook = await readXml(entries,'xl/workbook.xml');
  const relationships = await readXml(entries,'xl/_rels/workbook.xml.rels');
  const parts = new Map(nodes(relationships,'Relationship').map(rel=>[
    rel.getAttribute('Id'), {path:location(rel.getAttribute('Target')),kind:rel.getAttribute('Type').split('/').pop()}
  ]));
  const sheets = nodes(workbook,'sheet').map((el,index)=>({
    ...parts.get(el.getAttributeNS(relNS,'id')),index,name:el.getAttribute('name'),
    visible:!(el.getAttribute('state') && el.getAttribute('state')!=='visible'),
  }));
  const base = sheets.find(s=>s.name==='Base' && s.kind==='worksheet');
  if (!base) throw new Error('A guia Base não foi encontrada.');
  const doc = await readXml(entries,base.path);
  const stringsPath = [...parts.values()].find(part=>part.kind==='sharedStrings')?.path;
  const readText = el => nodes(el,'t').map(t=>t.textContent).join('');
  const shared = stringsPath ? nodes(await readXml(entries,stringsPath),'si').map(readText) : [];
  const cells = new Map(nodes(doc,'c').map(el=>[el.getAttribute('r'),el]));
  const value = address => {
    const cell = cells.get(address);
    if (!cell) return null;
    const type = cell.getAttribute('t');
    const v = nodes(cell,'v')[0]?.textContent;
    if (type==='inlineStr') return readText(cell);
    if (type==='s') return shared[Number(v)];
    if (type==='str') return v || null;
    if (type==='e' || type==='b' || !v) return null;
    const number = Number(v);
    return Number.isFinite(number) ? number : null;
  };
  const year = Number(value('B1'));
  if (!Number.isInteger(year) || year<1900 || year>2200) throw new Error('O ano da Base deve estar em B1.');
  const normalize = label => String(label??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  const labels = new Map();
  for (const address of cells.keys()) {
    if (!/^A[0-9]+$/.test(address)) continue;
    const label = normalize(value(address));
    if (!labels.has(label)) labels.set(label,[]);
    labels.get(label).push(Number(address.slice(1)));
  }
  const rows = {};
  const missing = [];
  for (const [id,[name]] of Object.entries(template.rows)) {
    const matches = labels.get(normalize(name)) || [];
    const index = normalize(value('A'+id)) === normalize(name) ? Number(id) : matches.length===1 ? matches[0] : null;
    if (!index) missing.push(name);
    rows[id] = [name,...'BCDEFGHIJKLM'.split('').map(col=>{
      const v = index ? value(col+index) : null;
      return typeof v==='number' ? v : null;
    })];
  }
  if (missing.length === Object.keys(rows).length) throw new Error('A Base tem um formato diferente do modelo de indicadores.');
  return {year,rows,missing,entries,sheets,workbook,name:file.name};
}

const crcTable = Uint32Array.from({length:256},(_,index)=>{
  for (let bit=0;bit<8;bit++) index=(index>>>1)^((index&1)?0xedb88320:0);
  return index>>>0;
});

function crc32(bytes) {
  let crc=0xffffffff;
  for (const byte of bytes) crc=(crc>>>8)^crcTable[(crc^byte)&255];
  return (crc^0xffffffff)>>>0;
}

function buildZip(entries,replacements) {
  const local=[];
  const directory=[];
  let offset=0, directorySize=0;
  for (const [name,entry] of entries) {
    const replacement=replacements.get(name);
    const bytes=replacement || entry.bytes;
    const central=entry.central.slice();
    const cv=new DataView(central.buffer);
    cv.setUint16(8,entry.flags&~8,true);
    if (replacement) {
      cv.setUint16(10,0,true);
      cv.setUint32(16,crc32(bytes),true);
      cv.setUint32(20,bytes.length,true);
      cv.setUint32(24,bytes.length,true);
    }
    cv.setUint32(42,offset,true);

    const header=new Uint8Array(30+entry.nameBytes.length);
    const hv=new DataView(header.buffer);
    hv.setUint32(0,0x04034b50,true);
    header.set(central.subarray(6,28),4);
    hv.setUint16(26,entry.nameBytes.length,true);
    header.set(entry.nameBytes,30);
    local.push(header,bytes);
    directory.push(central);
    offset+=header.length+bytes.length;
    directorySize+=central.length;
  }
  const end=new Uint8Array(22);
  const ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);
  ev.setUint16(8,entries.size,true);
  ev.setUint16(10,entries.size,true);
  ev.setUint32(12,directorySize,true);
  ev.setUint32(16,offset,true);
  return new Blob([...local,...directory,end],{type:'application/octet-stream'});
}

export async function batchWorkbook(book, selection) {
  const selected=book.sheets.filter(s=>s.visible && s.kind==='worksheet' && selection.has(s.name));
  if (!selected.length || selected.length!==selection.size) throw new Error('Algumas guias selecionadas estão indisponíveis.');
  const first=selected[0].index;
  const workbook=book.workbook.cloneNode(true);
  const window=nodes(workbook,'workbookView')[0];
  if (!window) throw new Error('A planilha precisa ter uma janela de trabalho salva.');
  for (const [index,view] of nodes(workbook,'workbookView').entries()) {
    if (index===0) {
      view.setAttribute('activeTab',first);
      view.setAttribute('firstSheet',first);
      view.setAttribute('showSheetTabs','1');
    }
  }
  const replacements=new Map([['xl/workbook.xml',serialize(workbook)]]);
  await Promise.all(book.sheets.filter(s=>s.kind==='worksheet'||s.kind==='chartsheet').map(async sheet=>{
    const doc=await readXml(book.entries,sheet.path);
    let view=nodes(doc,'sheetView').find(el=>el.getAttribute('workbookViewId')==='0');
    const mark=sheet.visible && selection.has(sheet.name);
    if (mark && !view) {
      const root=doc.documentElement;
      let views=nodes(doc,'sheetViews')[0];
      if (!views) {
        views=doc.createElementNS(sheetNS,'sheetViews');
        const before=[...root.children].find(el=>!['sheetPr','dimension'].includes(el.localName));
        root.insertBefore(views,before||null);
      }
      view=doc.createElementNS(sheetNS,'sheetView');
      view.setAttribute('workbookViewId','0');
      views.append(view);
    }
    if (mark) {
      view.setAttribute('tabSelected','1');
    } else if (view?.hasAttribute('tabSelected')) {
      view.removeAttribute('tabSelected');
    } else {
      return;
    }
    replacements.set(sheet.path,serialize(doc));
  }));
  return buildZip(book.entries,replacements);
}

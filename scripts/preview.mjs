import http from 'node:http';import fs from 'node:fs';
const worker=(await import('data:text/javascript;base64,'+fs.readFileSync('dist/server/index.js').toString('base64'))).default;
const server=http.createServer(async(req,res)=>{const url='http://localhost'+req.url;const r=await worker.fetch(new Request(url,{method:req.method,headers:req.headers}),{BUCKET:{get:async()=>null}});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));});server.listen(Number(process.env.PORT||process.argv[process.argv.indexOf('--port')+1]||3000),'0.0.0.0');

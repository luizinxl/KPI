import fs from 'node:fs';
const files=Object.fromEntries(fs.readdirSync('public').map(n=>['/'+n,fs.readFileSync('public/'+n,'utf8')]));
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js','const assets='+JSON.stringify(files)+';\n'+fs.readFileSync('public/catalogue.js','utf8').replaceAll('export ','')+'\n'+fs.readFileSync('public/fields.js','utf8').replaceAll('export ','')+'\n'+fs.readFileSync('worker/index.js','utf8'));
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');

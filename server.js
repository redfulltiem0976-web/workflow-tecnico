// Servidor local sin dependencias externas. Requiere Node.js 22.13+ (node:sqlite).
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const api = require('./api');
const BASE = path.resolve(__dirname, 'public');
const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'data', 'demo.sqlite');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
api.init(db);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
function send(res,status,body,type='application/json; charset=utf-8'){
 res.writeHead(status, {'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
 res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));
}
async function readBody(req){
 return new Promise((resolve,reject)=>{
  let data=''; req.on('data',chunk=>{data+=chunk.toString('utf8');if(Buffer.byteLength(data)>64*1024){reject(Object.assign(new Error('Solicitud demasiado grande'),{status:413}));req.destroy();}});
  req.on('end',()=>{try{resolve(data?JSON.parse(data):{});}catch{reject(Object.assign(new Error('JSON inválido'),{status:400}));}});req.on('error',reject);
 });
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   const body=['POST','PATCH','PUT'].includes(req.method)?await readBody(req):{};
   const out=await api.handle(db,req.method,url.pathname,url.searchParams,body);
   if(!out)return send(res,404,{error:'Ruta no encontrada'});
   if(out.csv){res.setHeader('Content-Disposition','attachment; filename=01-ordenes-mantenimiento.csv');return send(res,200,out.csv,'text/csv; charset=utf-8');}
   return send(res,out.status||200,out.data);
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Método no permitido'});
  const requested=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);
  const full=path.resolve(BASE,'.'+requested);
  if(!full.startsWith(BASE+path.sep))return send(res,403,{error:'Acceso denegado'});
  const stat=fs.existsSync(full)?fs.statSync(full):null;
  if(!stat||!stat.isFile())return send(res,404,'Página no encontrada','text/plain; charset=utf-8');
  const data=fs.readFileSync(full);
  return send(res,200,req.method==='HEAD'?'':data,MIME[path.extname(full)]||'application/octet-stream');
 }catch(e){ const status=e.status||500; if(status===500)console.error(e); if(!res.headersSent)send(res,status,{error:status===500?'Error inesperado':e.message}); }
});
if(require.main===module){const port=Number(process.env.PORT||3001);server.listen(port,'127.0.0.1',()=>console.log(`Aplicación disponible en http://127.0.0.1:${port}`));}
module.exports={server,db};

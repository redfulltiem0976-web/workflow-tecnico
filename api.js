'use strict';
// WorkFlow Técnico: prototipo local y datos inventados para un escenario genérico.
const states=new Set(['pendiente','en_proceso','completada']);
const priorities=new Set(['baja','media','alta']);
const clean=(v,n=160)=>typeof v==='string'?v.trim().slice(0,n):'';
function fail(msg,status=400){throw Object.assign(new Error(msg),{status});}
function init(db){
 db.exec(`CREATE TABLE IF NOT EXISTS assets(id INTEGER PRIMARY KEY,code TEXT UNIQUE NOT NULL,name TEXT NOT NULL,location TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,asset_id INTEGER NOT NULL REFERENCES assets(id),priority TEXT NOT NULL CHECK(priority IN ('baja','media','alta')),status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','en_proceso','completada')),assignee TEXT NOT NULL,due_date TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT (datetime('now')));
 CREATE TABLE IF NOT EXISTS checklist(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL REFERENCES orders(id),task TEXT NOT NULL,done INTEGER NOT NULL DEFAULT 0 CHECK(done IN(0,1)));
 CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL REFERENCES orders(id),type TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (datetime('now')));`);
 if(db.prepare('SELECT COUNT(*) n FROM assets').get().n===0){
  let a=db.prepare('INSERT INTO assets(code,name,location) VALUES(?,?,?)');
  [['EQ-101','Compresor de aire','Zona A'],['EQ-102','Tablero eléctrico','Zona B'],['EQ-103','Bomba centrífuga','Zona C'],['EQ-104','Ventilador industrial','Zona D']].forEach(x=>a.run(...x));
 }
 if(db.prepare('SELECT COUNT(*) n FROM orders').get().n===0){
  let add=db.prepare('INSERT INTO orders(title,asset_id,priority,status,assignee,due_date,description) VALUES(?,?,?,?,?,?,?)');
  [['Revisión preventiva de compresor',1,'alta','en_proceso','Andrea Rojas','2026-12-03','Registrar presión y revisar conexiones'],['Inspeccionar borneras y cableado',2,'alta','pendiente','Luis Mendoza','2026-12-05','Comprobar etiquetas, bornes y continuidad'],['Cambio de filtro de aire',1,'media','completada','Mariana Pérez','2026-11-29','Cambio preventivo de filtro'],['Verificar vibraciones anómalas',3,'media','pendiente','Andrea Rojas','2026-12-09','Inspección visual y medición'],['Limpieza de ventilador',4,'baja','completada','Luis Mendoza','2026-11-27','Limpieza y registro de intervención'],['Control de temperatura',2,'media','en_proceso','Mariana Pérez','2026-12-11','Registrar temperatura antes y después']].forEach(x=>add.run(...x));
  let addC=db.prepare('INSERT INTO checklist(order_id,task,done) VALUES(?,?,?)');
  let tasks=['Confirmar equipo y área de trabajo','Realizar inspección de seguridad','Registrar evidencia de ejecución'];
  for(let i=1;i<=6;i++)tasks.forEach((t,j)=>addC.run(i,t,i===3||i===5||j===0?1:0));
  let addA=db.prepare('INSERT INTO activity(order_id,type,detail) VALUES(?,?,?)');
  for(let i=1;i<=6;i++)addA.run(i,'creacion','Orden registrada con datos de demostración');
 }
}
function list(db,s=''){const term='%'+clean(s,80)+'%';return db.prepare(`SELECT o.*,a.name asset_name,a.code asset_code,a.location,(SELECT COUNT(*) FROM checklist c WHERE c.order_id=o.id) tasks,(SELECT COUNT(*) FROM checklist c WHERE c.order_id=o.id AND c.done=1) tasks_done FROM orders o JOIN assets a ON a.id=o.asset_id WHERE o.title LIKE ? OR a.name LIKE ? OR o.assignee LIKE ? ORDER BY o.id DESC`).all(term,term,term);}
function ensureOrder(db,id){const row=db.prepare('SELECT 1 ok FROM orders WHERE id=?').get(id);if(!row)fail('Orden no encontrada',404);}
function log(db,id,type,detail){db.prepare('INSERT INTO activity(order_id,type,detail) VALUES(?,?,?)').run(id,type,detail);}
function csvRow(row){return row.map(v=>'"'+String(v??'').replace(/^[=+@-]/,"'").replace(/"/g,'""')+'"').join(',');}
function handle(db,method,p,q,b){
 if(method==='GET'&&p==='/api/health')return {data:{ok:true,project:'workflow-tecnico-v2'}};
 if(method==='GET'&&p==='/api/assets')return {data:db.prepare('SELECT * FROM assets ORDER BY code').all()};
 if(method==='GET'&&p==='/api/orders')return {data:list(db,q.get('q'))};
 if(method==='GET'&&p==='/api/dashboard'){
  const s=db.prepare(`SELECT COUNT(*) total,COALESCE(SUM(status='pendiente'),0) pending,COALESCE(SUM(status='en_proceso'),0) active,COALESCE(SUM(status='completada'),0) done,COALESCE(SUM(priority='alta' AND status!='completada'),0) urgent FROM orders`).get();
  return {data:{...s,assets:db.prepare('SELECT COUNT(*) n FROM assets').get().n}};
 }
 if(method==='POST'&&p==='/api/orders'){
  const title=clean(b.title),assignee=clean(b.assignee,70),description=clean(b.description,600),asset_id=Number(b.asset_id),priority=clean(b.priority),due_date=clean(b.due_date,10);
  if(title.length<5||assignee.length<2||!Number.isInteger(asset_id)||!priorities.has(priority)||!/^(\d{4})-(\d{2})-(\d{2})$/.test(due_date)||Number.isNaN(Date.parse(due_date)))fail('Completa correctamente título, equipo, prioridad, responsable y fecha.');
  if(!db.prepare('SELECT 1 ok FROM assets WHERE id=?').get(asset_id))fail('Equipo no encontrado');
  const i=db.prepare('INSERT INTO orders(title,asset_id,priority,assignee,due_date,description) VALUES(?,?,?,?,?,?)').run(title,asset_id,priority,assignee,due_date,description);
  const id=Number(i.lastInsertRowid);log(db,id,'creacion','Orden creada');
  ['Confirmar condiciones de seguridad','Documentar la intervención','Revisar y cerrar'].forEach(x=>db.prepare('INSERT INTO checklist(order_id,task) VALUES(?,?)').run(id,x));
  return {status:201,data:{id,message:'Orden creada'}};
 }
 const detail=p.match(/^\/api\/orders\/(\d+)\/detail$/);
 if(method==='GET'&&detail){const id=Number(detail[1]);ensureOrder(db,id);return {data:{checklist:db.prepare('SELECT * FROM checklist WHERE order_id=? ORDER BY id').all(id),activity:db.prepare('SELECT * FROM activity WHERE order_id=? ORDER BY id DESC LIMIT 30').all(id)}};}
 const task=p.match(/^\/api\/orders\/(\d+)\/checklist\/(\d+)$/);
 if(method==='PATCH'&&task){const id=Number(task[1]),tid=Number(task[2]);if(typeof b.done!=='boolean')fail('Dato inválido');const t=db.prepare('UPDATE checklist SET done=? WHERE id=? AND order_id=?').run(b.done?1:0,tid,id);if(!t.changes)fail('Tarea no encontrada',404);log(db,id,'checklist',b.done?'Paso completado':'Paso reabierto');return {data:{saved:true}};}
 const newTask=p.match(/^\/api\/orders\/(\d+)\/checklist$/);
 if(method==='POST'&&newTask){const id=Number(newTask[1]),task=clean(b.task,140);ensureOrder(db,id);if(task.length<4)fail('Describe el paso');db.prepare('INSERT INTO checklist(order_id,task) VALUES(?,?)').run(id,task);log(db,id,'checklist','Paso añadido: '+task);return {status:201,data:{saved:true}};}
 const note=p.match(/^\/api\/orders\/(\d+)\/notes$/);
 if(method==='POST'&&note){const id=Number(note[1]),v=clean(b.note,500);ensureOrder(db,id);if(v.length<3)fail('Escribe una observación');log(db,id,'nota',v);return {status:201,data:{saved:true}};}
 const dup=p.match(/^\/api\/orders\/(\d+)\/duplicate$/);
 if(method==='POST'&&dup){const id=Number(dup[1]);ensureOrder(db,id);const old=db.prepare('SELECT * FROM orders WHERE id=?').get(id);
  const info=db.prepare('INSERT INTO orders(title,asset_id,priority,assignee,due_date,description) VALUES(?,?,?,?,?,?)').run(old.title+' (recurrente)',old.asset_id,old.priority,old.assignee,old.due_date,old.description);
  const newId=Number(info.lastInsertRowid);db.prepare('SELECT task FROM checklist WHERE order_id=?').all(id).forEach(x=>db.prepare('INSERT INTO checklist(order_id,task) VALUES(?,?)').run(newId,x.task));log(db,newId,'duplicacion','Creada a partir de la orden #'+id);return {status:201,data:{id:newId}};
 }
 const match=p.match(/^\/api\/orders\/(\d+)$/);
 if(method==='PATCH'&&match){const id=Number(match[1]);if(!states.has(b.status))fail('Estado inválido');const old=db.prepare('SELECT status FROM orders WHERE id=?').get(id);if(!old)fail('Orden no encontrada',404);db.prepare('UPDATE orders SET status=? WHERE id=?').run(b.status,id);if(old.status!==b.status)log(db,id,'estado',`${old.status} → ${b.status}`);return {data:{updated:true}};}
 if(method==='GET'&&p==='/api/export'){const r=[['ID','Orden','Equipo','Prioridad','Estado','Responsable','Vencimiento'],...list(db).map(x=>[x.id,x.title,x.asset_name,x.priority,x.status,x.assignee,x.due_date])];return {csv:'\ufeff'+r.map(csvRow).join('\r\n')};}
 return null;
}
module.exports={init,handle};

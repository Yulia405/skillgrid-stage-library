import {copy,effective,people,checkConditions,dateFor} from './model.js';
export const templateItems=route=>route.flatMap(r=>effective(r).elements.map(e=>({key:r.id+':'+e.id,rid:r.id,stage:effective(r).name,conditions:copy(r.conditions),element:copy(e)})));
export function initUpdates(db){
 if(!db.templateSavedItems)db.templateSavedItems=templateItems(db.route);
 db.pendingAdditions||=[];
 if(!db.assignedPlans)db.assignedPlans=people.map((person,i)=>({
  id:'assigned-'+person.id,person:copy(person),status:i===2?'completed':'active',start:'2026-10-27',days:30,
  stages:db.route.filter(r=>checkConditions(r.conditions,person).status==='included').map(r=>({
   originId:r.id,name:i===0?effective(r).name+' · мой план':effective(r).name,
   items:effective(r).elements.map(e=>({originKey:r.id+':'+e.id,...copy(e)}))
  }))
 }));
}
export function saveTemplateDelta(db){const current=templateItems(db.route),previous=new Set(db.templateSavedItems.map(x=>x.key));const pending=new Map(db.pendingAdditions.map(x=>[x.key,x]));current.filter(x=>!previous.has(x.key)).forEach(x=>pending.set(x.key,x));const active=new Map(current.map(x=>[x.key,x]));db.pendingAdditions=[...pending.keys()].filter(k=>active.has(k)).map(k=>active.get(k));db.templateSavedItems=current;return db.pendingAdditions;}
export function updatePreview(db){return db.assignedPlans.map(plan=>{const additions=[],skipped=[];for(const item of db.pendingAdditions){const stage=plan.stages.find(x=>x.originId===item.rid);let reason='';if(plan.status!=='active')reason='План завершён';else {const c=checkConditions(item.conditions,plan.person);if(c.status!=='included')reason=c.status==='unknown'?'Недостаточно данных для проверки условий этапа':'Не соответствует условиям назначения этапа';else if(!stage)reason='Этап удалён или отсутствует в плане';else if(stage.items.some(e=>e.originKey===item.key))reason='Элемент уже добавлен';else if(item.element.day!=null&&item.element.day>plan.days)reason='Срок элемента выходит за срок плана';}
 (reason?skipped:additions).push({...copy(item),reason,due:dateFor(plan.start,item.element.day)});}
 return {id:plan.id,name:plan.person.name,additions,skipped};});}
export function applyUpdates(db){const result=updatePreview(db);for(const row of result){const plan=db.assignedPlans.find(p=>p.id===row.id);for(const item of row.additions){const stage=plan.stages.find(s=>s.originId===item.rid);stage.items.push({...copy(item.element),originKey:item.key,due:item.due});}}db.pendingAdditions=[];db.lastUpdate=copy(result);return result;}

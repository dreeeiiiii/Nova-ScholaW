export function nullableId(value) {
  if(value===null || value===undefined || value==='') return null;
  if(!/^[1-9]\d*$/.test(String(value))) throw Object.assign(new Error('Invalid academic ID.'),{status:400});
  const id=Number(value);
  if(!Number.isSafeInteger(id)) throw Object.assign(new Error('Invalid academic ID.'),{status:400});
  return id;
}
export function readMembership(body, existing={}) {
  const result={};
  for(const field of ['department_id','section_id','course_id']) result[field]=body[field]===undefined?(existing[field]??null):nullableId(body[field]);
  return result;
}
export function validPassword(value) {
  return typeof value==='string' && value.length>=8 && Buffer.byteLength(value,'utf8')<=72;
}

const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');const write=(r,s)=>fs.writeFileSync(path.join(root,r),s.replace(/\r\n/g,'\n'),'utf8');
function balancedEnd(s,start,open='{',close='}') { let d=0,q=null,e=false; for(let i=start;i<s.length;i++){const c=s[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c===q)q=null;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c===open)d++;else if(c===close&&--d===0)return i;} return -1; }
const access='src/shared/security/accessPolicy.ts';let a=read(access);
if(!a.includes("'orbita:updateWorkforceLegend'")){
  const m=/(['"])orbita:updateDemoOrganization\1\s*:\s*\{/.exec(a);if(!m)throw Error('accessPolicy updateDemoOrganization rule missing');
  const brace=a.indexOf('{',m.index+m[0].length-1),end=balancedEnd(a,brace);if(end<0)throw Error('accessPolicy organization rule unbalanced');
  const rule=a.slice(brace,end+1);let at=end+1;while(/[\s]/.test(a[at]||''))at++;if(a[at]===',')at++;
  const indent=(a.slice(a.lastIndexOf('\n',m.index)+1,m.index).match(/^\s*/)||[''])[0];
  a=a.slice(0,at)+`\n${indent}'orbita:updateWorkforceLegend': ${rule},`+a.slice(at);
}
write(access,a);

const critical='src/main/security/ipcCriticalFieldValidationPolicy.ts';let c=read(critical);
if(!c.includes("'orbita:updateWorkforceLegend'")){
  const m=/const\s+CRITICAL_FIELD_VALIDATORS[^=]*=\s*\{/.exec(c);if(!m)throw Error('critical validator map missing');
  const brace=c.indexOf('{',m.index),end=balancedEnd(c,brace);if(end<0)throw Error('critical validator map unbalanced');
  const entry=`  'orbita:updateWorkforceLegend': (request: RequestRecord) => {\n    const kind=request['availabilityKind'], token=request['token'], name=request['displayName'], category=request['semanticCategory'], order=request['sortOrder'], effective=request['effectiveFrom'], actor=request['actorId'], archived=request['isArchived'];\n    const kinds=new Set(['available','annual_leave','sick_leave','field_work','day_off','blocked','other_absence']);\n    const categories=new Set(['available','leave','field','blocked','absence']);\n    if(typeof kind!=='string'||!kinds.has(kind)) throw new Error('Invalid orbita:updateWorkforceLegend availabilityKind');\n    if(typeof token!=='string'||!token.trim()||token.trim().length>8) throw new Error('Invalid orbita:updateWorkforceLegend token');\n    if(typeof name!=='string'||!name.trim()||name.trim().length>80) throw new Error('Invalid orbita:updateWorkforceLegend displayName');\n    if(typeof category!=='string'||!categories.has(category)) throw new Error('Invalid orbita:updateWorkforceLegend semanticCategory');\n    if(typeof order!=='number'||!Number.isInteger(order)||order<0||order>10000) throw new Error('Invalid orbita:updateWorkforceLegend sortOrder');\n    if(typeof effective!=='string'||!Number.isFinite(Date.parse(effective))) throw new Error('Invalid orbita:updateWorkforceLegend effectiveFrom');\n    if(typeof actor!=='string'||!actor.trim()) throw new Error('Invalid orbita:updateWorkforceLegend actorId');\n    if(typeof archived!=='undefined'&&typeof archived!=='boolean') throw new Error('Invalid orbita:updateWorkforceLegend isArchived');\n  },\n`;
  c=c.slice(0,end)+entry+c.slice(end);
}
write(critical,c);
console.log(JSON.stringify({state:'W6B_LEGEND_SECURITY_REPAIR_APPLIED',owners:[access,critical],access:'mirrors physically existing updateDemoOrganization access class',criticalValidation:['kind','token','displayName','semanticCategory','sortOrder','effectiveFrom','actorId','isArchived'],truth:'new mutation channel remains explicit and fail-closed; runtime validation remains authoritative second boundary'},null,2));

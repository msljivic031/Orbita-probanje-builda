const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>fs.writeFileSync(path.join(root,r),s.replace(/\r\n/g,'\n'),'utf8');
function replaceExact(file,from,to,label){let s=read(file);const n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1, got ${n}`);write(file,s.replace(from,to));}
function blocks(source,selector){const out=[];let at=0;while((at=source.indexOf(selector,at))>=0){const open=source.indexOf('{',at);if(open<0)break;if(source.slice(at,open).trim()!==selector){at+=selector.length;continue}let depth=0,end=-1;for(let i=open;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'){depth--;if(depth===0){end=i+1;break}}}if(end<0)throw Error(`unterminated ${selector}`);out.push({at,open,end,body:source.slice(open+1,end-1)});at=end}return out}
function setBlock(file,selector,body,label){let s=read(file);const b=blocks(s,selector);if(b.length!==1)throw Error(`${label}: ${selector} blocks=${b.length}`);const x=b[0];write(file,s.slice(0,x.open+1)+'\n'+body.trim()+'\n'+s.slice(x.end-1));}
function insertBefore(file,anchor,extra,label){let s=read(file);if(s.includes(extra.trim()))return;const i=s.indexOf(anchor);if(i<0)throw Error(`${label}: anchor missing`);write(file,s.slice(0,i)+extra.trim()+'\n\n'+s.slice(i));}

const modal='src/renderer/screens/ljudi/components/LjudiAvailabilityModal.tsx';
replaceExact(modal,
`                <div className="people-work-impact-list">{visibleAffectedWorks.map((work) => {`,
`                <div className="people-work-impact-table" role="table" aria-label="Pogođeni Radovi i odluke">
                  <div className="people-work-impact-head" role="row"><span role="columnheader">Rad i trenutna odgovornost</span><span role="columnheader">Odluka</span></div>
                  <div className="people-work-impact-list" role="rowgroup">{visibleAffectedWorks.map((work) => {`,
'affected-work table wrapper');
replaceExact(modal,
`                  return <article className={decision.action === 'keep_original' ? '' : 'changed'} key={work.workItemId}><div className="people-work-impact-identity"><span className="people-choice-icon"><OrbitaIcon icon="domain-work" size={17} /></span><div><strong>{work.workTitle}</strong><small>Trenutno odgovoran: {person.displayName}</small></div></div><div className="people-work-impact-actions people-segmented-control"><button className={decision.action === 'keep_original' ? 'is-selected selected' : ''} onClick={() => setWorkDecision(work.workItemId, 'keep_original')} type="button">Ostaje</button><button className={decision.action === 'substitute' ? 'is-selected selected' : ''} disabled={!replacementPersonId} onClick={() => setWorkDecision(work.workItemId, 'substitute')} type="button">Zamena</button><button className={decision.action === 'delegate' ? 'is-selected selected' : ''} disabled={!replacementPersonId} onClick={() => setWorkDecision(work.workItemId, 'delegate')} type="button">Delegacija</button></div>{decision.action !== 'keep_original' ? <span className="people-work-impact-target"><OrbitaIcon icon="act-forward" size={14} />Privremeno preuzima {targetPeople.find((candidate) => candidate.id === decision.targetPersonId)?.displayName ?? replacementPerson?.displayName ?? 'izabrana zamena'}</span> : null}</article>;`,
`                  return <article className={decision.action === 'keep_original' ? '' : 'changed'} key={work.workItemId} role="row"><div className="people-work-impact-identity" role="cell"><span className="people-choice-icon"><OrbitaIcon icon="domain-work" size={17} /></span><div><strong>{work.workTitle}</strong><small>Trenutno odgovoran: {person.displayName}</small></div></div><div aria-label={\`Odluka za ${work.workTitle}\`} className="people-work-impact-actions people-segmented-control" role="cell"><button className={decision.action === 'keep_original' ? 'is-selected selected' : ''} onClick={() => setWorkDecision(work.workItemId, 'keep_original')} type="button">Ostaje</button><button className={decision.action === 'substitute' ? 'is-selected selected' : ''} disabled={!replacementPersonId} onClick={() => setWorkDecision(work.workItemId, 'substitute')} type="button">Zamena</button><button className={decision.action === 'delegate' ? 'is-selected selected' : ''} disabled={!replacementPersonId} onClick={() => setWorkDecision(work.workItemId, 'delegate')} type="button">Delegacija</button></div>{decision.action !== 'keep_original' ? <span className="people-work-impact-target"><OrbitaIcon icon="act-forward" size={14} />Privremeno preuzima {targetPeople.find((candidate) => candidate.id === decision.targetPersonId)?.displayName ?? replacementPerson?.displayName ?? 'izabrana zamena'}</span> : null}</article>;`,
'affected-work row semantics');
replaceExact(modal,
`                })}</div>
                {!visibleAffectedWorks.length ?`,
`                })}</div>
                </div>
                {!visibleAffectedWorks.length ?`,
'affected-work table close');

const visual='src/renderer/styles/canonical/people-visual-system-closure.css';
setBlock(visual,'.people-work-impact-list',`
  display: grid;
  gap: 0;
  max-height: min(45vh, 420px);
  overflow: auto;
  padding-right: 0;
`,'impact list table body');
setBlock(visual,'.people-work-impact-list article',`
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 9px 12px;
  border: 0;
  border-bottom: 1px solid var(--people-border);
  border-radius: 0;
  background: #fff;
`,'impact row table layout');
setBlock(visual,'.people-work-impact-list article.changed',`
  border-color: var(--people-border);
  background: #f6faff;
  box-shadow: inset 3px 0 0 rgba(23,102,216,.72);
`,'impact changed row');
setBlock(visual,'.people-work-impact-actions',`
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:6px;
  flex-wrap:wrap;
`,'impact actions alignment');
setBlock(visual,'.people-calm-screen .people-network-children, .people-calm-screen .people-network-members',`
  position: relative;
  min-width: 0;
  margin-left: 13px;
  padding-left: 14px;
  border-left: 1px solid rgba(61, 101, 148, 0.18);
`,'tree branch guide');
setBlock(visual,'.people-calm-screen .people-network-person',`
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  gap: 8px;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 9px;
  text-align: left;
  background: transparent;
`,'tree person density');
setBlock(visual,'.people-calm-screen .people-network-person.active',`
  border-color: rgba(36,104,194,.20);
  background: linear-gradient(90deg,#eaf3ff 0%,#f8fbff 100%);
  box-shadow: inset 3px 0 0 #2b72d6;
`,'tree selected person');
insertBefore(visual,'@media',`
.people-work-impact-table{overflow:hidden;border:1px solid var(--people-border);border-radius:13px;background:#fff}
.people-work-impact-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;min-height:34px;padding:0 12px;border-bottom:1px solid var(--people-border);background:#f5f8fc;color:#667b95;font-size:9px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
.people-work-impact-head span:last-child{text-align:right;min-width:190px}
.people-work-impact-list article:last-child{border-bottom:0}
.people-calm-screen .people-network-members::before,.people-calm-screen .people-network-children::before{content:"";position:absolute;left:-1px;top:0;width:10px;height:1px;background:rgba(61,101,148,.18)}
`,'Wave4 table/tree additions');

const operational='src/renderer/styles/canonical/people-operational-closure.css';
setBlock(operational,'.people-review-summary-grid',`
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  margin-bottom:14px;
`,'confirmation four facts');

console.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE4_PEOPLE',externalPatternUse:['21st Tree interaction pattern','21st Data Table density pattern'],codeReuse:'NONE_PATTERN_ADAPTATION_ONLY',files:[modal,visual,operational],scope:'affected-work review + org tree presentation, no domain mutation'},null,2));
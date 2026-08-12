const fs=require('fs');const path=require('path');
const root=path.resolve(process.argv[2]||'candidate');const rel='src/renderer/screens/ljudi/LjudiScreen.tsx';const text=fs.readFileSync(path.join(root,rel),'utf8');const lines=text.split(/\r?\n/);
const needles=['availabilitySummaryText','availabilityCards','availabilityPeriod','availabilityHistory'];
const occurrences=[];
for(let i=0;i<lines.length;i++){
  if(i+1<1200) continue;
  const line=lines[i];
  const present=needles.filter(n=>line.includes(n));
  if(!present.length) continue;
  const windowStart=Math.max(0,i-18),windowEnd=Math.min(lines.length-1,i+18);
  const tags=[];
  for(let j=windowStart;j<=windowEnd;j++){
    const s=lines[j];
    for(const m of s.matchAll(/<(section|div|header|article|button|strong|p|h[1-6]|ul|li)\b([^>]*)>/g)){
      const attrs=m[2]||'';const cls=(attrs.match(/className\s*=\s*["']([^"']+)["']/)||[])[1]||null;const action=(attrs.match(/data-orbita-action\s*=\s*["']([^"']+)["']/)||[])[1]||null;
      tags.push({line:j+1,tag:m[1],className:cls,action,hasOnClick:/onClick\s*=/.test(attrs),relative:j-i});
    }
  }
  occurrences.push({line:i+1,present,syntax:{hasMap:/\.map\s*\(/.test(line),hasJsxExpr:/\{/.test(line),hasReturn:/\breturn\b/.test(line),hasConditional:/\?|&&/.test(line),hasClassName:/className\s*=/.test(line),hasOpenTag:/<\w/.test(line)},nearbyTags:tags});
}
const exactMap=[];
for(const n of ['availabilityCards.map','availabilityHistory.map']){let pos=0;while((pos=text.indexOf(n,pos))>=0){const line=text.slice(0,pos).split(/\r?\n/).length;exactMap.push({needle:n,line});pos+=n.length;}}
console.log(JSON.stringify({state:'PASS',path:rel,occurrences,exactMap},null,2));
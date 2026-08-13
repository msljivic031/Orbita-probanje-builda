const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else out.push(p);}return out;}
const stylesRoot=path.join(root,'src','renderer','styles');
if(!fs.existsSync(stylesRoot))throw new Error('renderer styles root missing');
const cssFiles=walk(stylesRoot).filter(f=>f.endsWith('.css'));
const ownerCandidates=cssFiles.filter(f=>{const s=fs.readFileSync(f,'utf8');return s.includes('.documents-workspace-surface')&&s.includes('.document-dossier-panel')&&s.includes('.documents-import-workflow');});
if(ownerCandidates.length!==1)throw new Error(`Documents visual CSS owner count ${ownerCandidates.length}`);
const owner=ownerCandidates[0];
let css=fs.readFileSync(owner,'utf8').replace(/\r\n/g,'\n');
const marker='/* ORBITA W7A DOCUMENTS VISUAL ARCHITECTURE */';
if(!css.includes(marker)){
css += `\n\n${marker}\n
.documents-workspace-screen{
  gap:10px;
}
.documents-workspace-screen .documents-title-row{
  align-items:flex-end;
  gap:20px;
  padding-bottom:2px;
}
.documents-workspace-screen .workspace-page-header-copy{
  max-width:760px;
}
.documents-workspace-screen .workspace-page-header-copy .eyebrow{
  color:#657a96;
  letter-spacing:.08em;
}
.documents-workspace-screen .workspace-page-header-copy h2{
  margin-top:3px;
  letter-spacing:-.02em;
}
.documents-workspace-screen .workspace-page-header-copy p{
  max-width:720px;
  margin-top:5px;
  color:#63758b;
  line-height:1.45;
}
.documents-workspace-screen .workspace-page-header-side{
  align-items:center;
  gap:10px;
}
.documents-workspace-screen .workspace-page-header-meta{
  padding:0;
  background:transparent;
  border:0;
  box-shadow:none;
}
.documents-workspace-screen .workspace-page-header-meta span{
  display:inline-flex;
  align-items:center;
  min-height:30px;
  padding:0 9px;
  border:1px solid rgba(177,119,38,.20);
  border-radius:999px;
  background:rgba(255,249,238,.78);
  color:#8a612b;
  font-size:10px;
  font-weight:800;
}
.documents-workspace-screen .documents-primary-import{
  min-height:36px;
  padding:0 14px;
  border-radius:9px;
  box-shadow:0 5px 14px rgba(33,94,177,.14);
}

.documents-workspace-screen .workspace-compact-summary{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:6px;
  min-height:0;
  padding:0;
  border:0;
  background:transparent;
  box-shadow:none;
}
.documents-workspace-screen .workspace-compact-summary-item{
  display:flex;
  align-items:baseline;
  gap:7px;
  min-width:0;
  min-height:38px;
  padding:7px 10px;
  border:1px solid rgba(80,111,150,.13);
  border-radius:9px;
  background:rgba(249,251,254,.78);
  box-shadow:none;
}
.documents-workspace-screen .workspace-compact-summary-item:before{
  width:3px;
  height:18px;
  border-radius:99px;
}
.documents-workspace-screen .workspace-compact-summary-item span{
  color:#65778d;
  font-size:10px;
  font-weight:750;
  white-space:nowrap;
}
.documents-workspace-screen .workspace-compact-summary-item strong{
  margin-left:auto;
  color:#173553;
  font-size:14px;
}
.documents-workspace-screen .workspace-compact-summary-item small{
  display:none;
}

.documents-workspace-screen .document-expiry-warning-strip{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  min-height:42px;
  padding:7px 10px 7px 12px;
  border:1px solid rgba(181,118,37,.14);
  border-radius:10px;
  background:rgba(255,250,242,.62);
  box-shadow:none;
}
.documents-workspace-screen .document-expiry-warning-strip>div:first-child{
  display:flex;
  align-items:center;
  gap:8px;
  min-width:0;
}
.documents-workspace-screen .document-expiry-warning-strip>div:first-child .eyebrow{
  margin:0;
  font-size:9px;
  color:#967146;
}
.documents-workspace-screen .document-expiry-warning-strip>div:first-child strong{
  color:#624d36;
  font-size:11px;
  white-space:nowrap;
}
.documents-workspace-screen .document-expiry-warning-list{
  min-width:0;
}
.documents-workspace-screen .document-expiry-warning-list button{
  display:flex;
  align-items:center;
  gap:7px;
  min-height:28px;
  padding:4px 8px;
  border:0;
  border-radius:8px;
  background:rgba(255,255,255,.75);
  box-shadow:none;
}
.documents-workspace-screen .document-expiry-warning-list button span{
  color:#a05736;
  font-size:8px;
  letter-spacing:.07em;
  text-transform:uppercase;
}
.documents-workspace-screen .document-expiry-warning-list button strong{
  color:#17324f;
  font-size:10px;
}
.documents-workspace-screen .document-expiry-warning-list button small{
  display:none;
}

.documents-workspace-screen .documents-workspace-surface{
  display:grid;
  grid-template-columns:160px minmax(0,1fr) 300px;
  min-height:515px;
  overflow:hidden;
  border:1px solid rgba(65,99,139,.15);
  border-radius:14px;
  background:#fff;
  box-shadow:0 12px 32px rgba(21,47,79,.045);
}
.documents-workspace-screen .documents-library-rail{
  display:flex;
  flex-direction:column;
  min-width:0;
  padding:14px 10px 11px;
  border-right:1px solid rgba(65,99,139,.11);
  background:#f7f9fc;
}
.documents-workspace-screen .documents-rail-head{
  min-height:26px;
  padding:0 4px 8px;
}
.documents-workspace-screen .document-folder-tree{
  display:grid;
  gap:2px;
}
.documents-workspace-screen .document-folder-row{
  min-height:34px;
  padding:0 8px 0 calc(8px + (var(--folder-depth, 0) * 12px));
  border:0;
  border-radius:8px;
  background:transparent;
  color:#294762;
  box-shadow:none;
}
.documents-workspace-screen .document-folder-row:hover{
  background:#eef3f8;
}
.documents-workspace-screen .document-folder-row.active{
  background:#eaf2fd;
  color:#174d91;
  box-shadow:inset 2px 0 0 #347bd6;
}
.documents-workspace-screen .documents-storage-policy{
  margin-top:auto;
  padding:10px 5px 1px;
  border:0;
  border-top:1px solid rgba(65,99,139,.10);
  border-radius:0;
  background:transparent;
}
.documents-workspace-screen .documents-storage-policy strong{
  color:#556b83;
  font-size:9px;
  letter-spacing:.04em;
}
.documents-workspace-screen .documents-storage-policy small{
  display:-webkit-box;
  overflow:hidden;
  margin-top:4px;
  color:#8290a1;
  font-size:8px;
  line-height:1.42;
  -webkit-line-clamp:3;
  -webkit-box-orient:vertical;
}

.documents-workspace-screen .documents-file-list{
  min-width:0;
  padding:14px 14px 0;
  background:#fff;
}
.documents-workspace-screen .documents-list-head{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:12px;
  padding:0 1px 10px;
  border-bottom:1px solid rgba(65,99,139,.09);
}
.documents-workspace-screen .documents-list-head .eyebrow{
  font-size:8px;
  color:#788ba1;
}
.documents-workspace-screen .documents-list-head strong{
  color:#17324f;
  font-size:13px;
}
.documents-workspace-screen .documents-list-head small{
  margin-top:2px;
  color:#8996a6;
  font-size:9px;
}
.documents-workspace-screen .documents-list-result-count{
  padding:3px 7px;
  border-radius:999px;
  background:#f1f4f8;
  color:#6f8195;
  font-size:9px;
  font-weight:800;
}
.documents-workspace-screen .documents-search-field{
  position:relative;
  display:block;
  margin:10px 0 7px;
}
.documents-workspace-screen .documents-search-field>span{
  position:absolute;
  width:1px;
  height:1px;
  padding:0;
  margin:-1px;
  overflow:hidden;
  clip:rect(0,0,0,0);
  white-space:nowrap;
  border:0;
}
.documents-workspace-screen .documents-search-field input{
  width:100%;
  height:36px;
  padding:0 11px;
  border:1px solid rgba(72,104,143,.16);
  border-radius:9px;
  background:#fafbfd;
  color:#17324f;
  box-shadow:none;
}
.documents-workspace-screen .documents-search-field input:focus{
  border-color:rgba(52,123,214,.55);
  background:#fff;
  box-shadow:0 0 0 3px rgba(52,123,214,.10);
}
.documents-workspace-screen .documents-table-head{
  display:grid;
  grid-template-columns:minmax(0,1fr) 126px 52px;
  gap:8px;
  padding:6px 8px;
  color:#8391a2;
  font-size:8px;
  font-weight:850;
  letter-spacing:.06em;
  text-transform:uppercase;
}
.documents-workspace-screen .documents-list-body{
  border-top:1px solid rgba(65,99,139,.08);
}
.documents-workspace-screen .document-row{
  display:grid;
  grid-template-columns:minmax(0,1fr) 126px 52px;
  align-items:center;
  gap:8px;
  width:100%;
  min-height:62px;
  padding:6px 8px;
  border:0;
  border-bottom:1px solid rgba(65,99,139,.085);
  border-radius:0;
  background:transparent;
  text-align:left;
  box-shadow:none;
}
.documents-workspace-screen .document-row:hover{
  background:#f8fafc;
}
.documents-workspace-screen .document-row.active{
  background:#f0f5fc;
  box-shadow:inset 3px 0 0 #347bd6;
}
.documents-workspace-screen .document-row.expiry-critical{
  background:transparent;
}
.documents-workspace-screen .document-row.expiry-critical:hover{
  background:#fcfaf9;
}
.documents-workspace-screen .document-row.expiry-critical.active{
  background:#f7f4f3;
}
.documents-workspace-screen .document-row-main{
  min-width:0;
  gap:9px;
}
.documents-workspace-screen .document-row-main>span{
  min-width:0;
}
.documents-workspace-screen .document-row-main strong{
  overflow:hidden;
  color:#17324f;
  font-size:11px;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.documents-workspace-screen .document-row-main small{
  color:#7b8b9d;
  font-size:8.5px;
}
.documents-workspace-screen .document-row-main em{
  display:inline-block;
  margin-top:3px;
  padding:0;
  border:0;
  background:transparent;
  color:#398066;
  font-size:8px;
  font-style:normal;
  font-weight:800;
}
.documents-workspace-screen .document-row-expiry strong{
  color:#334f6b;
  font-size:9.5px;
}
.documents-workspace-screen .document-row.expiry-critical .document-row-expiry strong{
  color:#a24f45;
}
.documents-workspace-screen .document-row-expiry small{
  color:#8997a7;
  font-size:8px;
}
.documents-workspace-screen .document-row-links{
  text-align:center;
}
.documents-workspace-screen .document-row-links strong{
  color:#1c4f8b;
  font-size:12px;
}
.documents-workspace-screen .document-row-links small{
  color:#8997a7;
  font-size:8px;
}

.documents-workspace-screen .document-dossier-panel{
  min-width:0;
  padding:15px 14px;
  border-left:1px solid rgba(65,99,139,.11);
  background:#fbfcfe;
}
.documents-workspace-screen .document-dossier-head{
  gap:9px;
  padding-bottom:12px;
  border-bottom:1px solid rgba(65,99,139,.10);
}
.documents-workspace-screen .document-dossier-head .eyebrow{
  color:#8090a4;
  font-size:8px;
}
.documents-workspace-screen .document-dossier-head h3{
  margin-top:2px;
  color:#132f4d;
  font-size:15px;
  letter-spacing:-.015em;
}
.documents-workspace-screen .document-dossier-head small{
  color:#8090a4;
}
.documents-workspace-screen .document-expiry-state-card{
  margin-top:12px;
  padding:0 0 12px;
  border:0;
  border-bottom:1px solid rgba(65,99,139,.10);
  border-radius:0;
  background:transparent;
  box-shadow:none;
}
.documents-workspace-screen .document-expiry-state-card span{
  color:#8290a1;
  font-size:8px;
  letter-spacing:.06em;
  text-transform:uppercase;
}
.documents-workspace-screen .document-expiry-state-card strong{
  margin-top:4px;
  color:#214766;
  font-size:12px;
}
.documents-workspace-screen .document-expiry-state-card.expiry-critical strong{
  color:#a24f45;
}
.documents-workspace-screen .document-expiry-state-card small{
  display:none;
}
.documents-workspace-screen .document-primary-action-panel{
  display:grid;
  gap:9px;
  margin-top:12px;
  padding:0 0 13px;
  border:0;
  border-bottom:1px solid rgba(65,99,139,.10);
  border-radius:0;
  background:transparent;
  box-shadow:none;
}
.documents-workspace-screen .document-primary-action-panel strong{
  color:#27445f;
  font-size:10px;
}
.documents-workspace-screen .document-primary-action-panel small{
  display:block;
  margin-top:2px;
  color:#7c8c9e;
  font-size:8.5px;
  line-height:1.4;
}
.documents-workspace-screen .document-open-managed-button{
  width:100%;
  min-height:36px;
  border-radius:9px;
  box-shadow:0 5px 14px rgba(33,94,177,.12);
}
.documents-workspace-screen .document-details-disclosure{
  margin-top:0;
  border:0;
  border-bottom:1px solid rgba(65,99,139,.10);
  border-radius:0;
  background:transparent;
  box-shadow:none;
}
.documents-workspace-screen .document-details-disclosure summary{
  min-height:42px;
  padding:0;
}
.documents-workspace-screen .document-linked-work{
  margin-top:12px;
}
.documents-workspace-screen .document-work-row{
  margin-top:6px;
  padding:0;
  border:0;
  border-radius:0;
  background:transparent;
}
.documents-workspace-screen .document-work-open{
  padding:7px 0;
}
.documents-workspace-screen .document-unlink-trigger{
  min-height:28px;
  padding:0 8px;
  border-radius:7px;
}

.documents-workspace-screen .documents-import-workflow{
  display:grid;
  grid-template-columns:minmax(220px,.72fr) minmax(0,2.15fr) auto;
  align-items:end;
  gap:12px;
  padding:11px 12px;
  border:1px solid rgba(52,123,214,.18);
  border-radius:12px;
  background:linear-gradient(110deg,rgba(243,248,255,.88),rgba(250,252,255,.92));
  box-shadow:none;
}
.documents-workspace-screen .documents-import-intro{
  min-width:0;
}
.documents-workspace-screen .documents-import-intro .eyebrow{
  color:#71859d;
  font-size:8px;
}
.documents-workspace-screen .documents-import-intro strong{
  display:block;
  margin-top:3px;
  color:#17324f;
  font-size:12px;
  line-height:1.25;
}
.documents-workspace-screen .documents-import-intro small{
  display:none;
}
.documents-workspace-screen .documents-import-fields{
  display:grid;
  grid-template-columns:minmax(150px,1.45fr) minmax(110px,.9fr) minmax(120px,1fr) minmax(118px,.85fr);
  gap:7px;
  min-width:0;
}
.documents-workspace-screen .documents-import-fields label{
  display:grid;
  gap:3px;
  min-width:0;
  color:#71839a;
  font-size:8px;
  font-weight:850;
  letter-spacing:.055em;
  text-transform:uppercase;
}
.documents-workspace-screen .documents-import-fields select,
.documents-workspace-screen .documents-import-fields input{
  width:100%;
  min-width:0;
  height:35px;
  padding:0 8px;
  border:1px solid rgba(72,104,143,.17);
  border-radius:8px;
  background:#fff;
  color:#17324f;
  font-size:9px;
  box-shadow:none;
}
.documents-workspace-screen .documents-import-actions{
  display:flex;
  align-items:center;
  gap:6px;
}
.documents-workspace-screen .documents-import-actions button{
  min-height:35px;
  padding:0 10px;
  border-radius:8px;
  white-space:nowrap;
}
.documents-workspace-screen .documents-import-actions .primary-action{
  box-shadow:0 5px 14px rgba(33,94,177,.12);
}

@media (max-width:1390px){
  .documents-workspace-screen{
    gap:8px;
  }
  .documents-workspace-screen .documents-title-row{
    gap:12px;
  }
  .documents-workspace-screen .workspace-page-header-copy p{
    max-width:620px;
    font-size:10px;
  }
  .documents-workspace-screen .workspace-compact-summary{
    gap:4px;
  }
  .documents-workspace-screen .workspace-compact-summary-item{
    min-height:34px;
    padding:5px 8px;
  }
  .documents-workspace-screen .document-expiry-warning-strip{
    min-height:38px;
    padding:5px 8px 5px 10px;
  }
  .documents-workspace-screen .documents-workspace-surface{
    grid-template-columns:142px minmax(0,1fr) 270px;
    min-height:495px;
  }
  .documents-workspace-screen .documents-library-rail{
    padding:11px 8px 9px;
  }
  .documents-workspace-screen .documents-storage-policy small{
    -webkit-line-clamp:2;
  }
  .documents-workspace-screen .documents-file-list{
    padding:11px 10px 0;
  }
  .documents-workspace-screen .documents-table-head,
  .documents-workspace-screen .document-row{
    grid-template-columns:minmax(0,1fr) 108px 44px;
    gap:6px;
  }
  .documents-workspace-screen .document-row{
    min-height:58px;
    padding:5px 6px;
  }
  .documents-workspace-screen .document-dossier-panel{
    padding:12px 11px;
  }
  .documents-workspace-screen .document-dossier-head h3{
    font-size:13px;
  }
  .documents-workspace-screen .documents-import-workflow{
    grid-template-columns:1fr;
    align-items:stretch;
    gap:8px;
    padding:9px 10px;
  }
  .documents-workspace-screen .documents-import-intro{
    display:flex;
    align-items:baseline;
    gap:8px;
  }
  .documents-workspace-screen .documents-import-intro strong{
    margin:0;
  }
  .documents-workspace-screen .documents-import-fields{
    grid-template-columns:minmax(170px,1.45fr) minmax(110px,.9fr) minmax(120px,1fr) minmax(118px,.85fr);
  }
  .documents-workspace-screen .documents-import-actions{
    justify-content:flex-end;
  }
}
`;
fs.writeFileSync(owner,css,'utf8');
}
console.log(JSON.stringify({state:'W7A_DOCUMENTS_VISUAL_ARCHITECTURE_APPLIED_NOT_ADMITTED',owner:path.relative(root,owner).replace(/\\/g,'/'),productTruthTouched:false,patterns:['21st data-table scanability','detail-view hierarchy','progressive command surface'],laws:['no document persistence mutation','no new storage owner','no renderer fake import/open','no row animation noise']},null,2));

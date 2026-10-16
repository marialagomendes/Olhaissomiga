const KEY='oim-web-v1';
const CATS={cabelo:'💆🏻‍♀️',maquiagem:'💄',skincare:'🧴',perfumes:'🌸',eletronicos:'📱',joias:'💍',bolsas:'👜',sapatos:'👠',moda:'👗',casa:'🏡'};
const TABS=['Visão geral','Ofertas','Aprovações','Posts','Histórico','Configurações'];
const emptyState={offers:[],audit:[],settings:{amazonTag:'olhaissomiga-20',times:['07:30','11:30','17:30'],timezone:'America/Sao_Paulo'},tab:'Visão geral',selected:null};
let state=load();
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const now=()=>new Date().toISOString();
const fmt=d=>new Date(d).toLocaleString('pt-BR');
const n=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:null};
const brl=v=>{const x=n(v);return x===null?'—':x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})};
const pct=(a,b)=>{a=n(a);b=n(b);return a&&b&&a>b&&b>0?Math.round((a-b)/a*100):null};

function load(){try{return {...structuredClone(emptyState),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return structuredClone(emptyState)}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function audit(action,id=null,detail=''){state.audit.unshift({id:uid(),at:now(),action,offerId:id,detail});save()}
function toast(msg,type=''){const e=$('#notice');e.innerHTML='<div class="notice '+type+'">'+esc(msg)+'</div>';setTimeout(()=>{if(e)e.innerHTML=''},5000)}
function statusLabel(s){return ({candidate:'Candidato',approved:'Aprovado',rejected:'Reprovado',published:'Publicado'}[s]||s)}
function valLabel(v){return ({verified:'<span class="ok">Verificado</span>',unknown:'<span class="warn">Não informado</span>',na:'<span class="muted">Não se aplica</span>',attention:'<span class="attention">Sinal de atenção</span>'}[v]||'<span class="warn">Não informado</span>')}
function valid(o){return ['price','seller','provenance','availability'].every(k=>o.validation?.[k]==='verified')}
function discount(o){return o.referenceVerified?pct(o.referencePrice,o.price):null}
function score(o){
  let s=0,d=discount(o);
  if(d!==null)s+=Math.min(35,Math.round(d*1.2));
  s+=['seller','provenance','availability'].filter(k=>o.validation?.[k]==='verified').length*8;
  s+=Math.min(20,Number(o.relevance||0)*4);
  if(o.condition||o.coupon||o.shipping)s+=10;
  s+=Math.min(10,Number(o.historyEvidence||0)*2);
  return Math.min(100,s);
}
function makeMessage(o){
  const d=discount(o), emoji=CATS[o.category]||'🛍️', lines=[
    '*🎀 MIGAAA, OLHA ESSE ACHADINHO! 💗*','',
    emoji+' *'+o.name+'*',''
  ];
  if(o.referenceVerified&&n(o.referencePrice)>n(o.price))lines.push('🏷️ De: ~'+brl(o.referencePrice)+'~');
  lines.push('💰 *Por: '+brl(o.price)+'*');
  if(d!==null)lines.push('🔥 *'+d+'% OFF!*');
  if(o.condition)lines.push('','*📦 '+o.condition+'*');
  if(o.coupon)lines.push('','🎟️ *Cupom: '+o.coupon+'*');
  lines.push('','🛒 *Corre conferir, miga!*','🔗 '+(o.affiliateUrl||o.originalUrl),'','💌 *Achadinho bom a gente compartilha!*','_Preços sujeitos a alteração • Link de afiliada_');
  return lines.join('\n');
}
function nav(){
  $('#nav').innerHTML=TABS.map(t=>'<button data-tab="'+t+'" class="'+(state.tab===t?'active':'')+'">'+t+'</button>').join('');
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;save();render()});
}
function render(){
  nav();
  const views={'Visão geral':dashboard,'Ofertas':offersView,'Aprovações':approvals,'Posts':posts,'Histórico':history,'Configurações':settings};
  $('#view').innerHTML=views[state.tab]();
  bind();
}
function dashboard(){
  const c=state.offers;
  return '<section class="grid stats">'+[
    ['Ofertas',c.length],['Qualificadas',c.filter(x=>valid(x)).length],['Aguardando aprovação',c.filter(x=>x.status==='candidate'&&valid(x)).length],
    ['Posts prontos',c.filter(x=>x.status==='approved').length],['Publicadas',c.filter(x=>x.status==='published').length]
  ].map(x=>'<article class="card"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></article>').join('')+'</section>'+
  '<section class="panel"><div class="section-head"><div><h2>Operação do dia</h2><p>As pesquisas recorrentes estão configuradas no ChatGPT; este painel recebe e organiza suas decisões.</p></div><button class="btn primary" data-go="Ofertas">Cadastrar oferta</button></div>'+
  '<div class="schedule">'+state.settings.times.map(t=>'<span>'+t+'</span>').join('')+'<span>'+esc(state.settings.timezone)+'</span></div><hr>'+
  '<div class="integration"><div><b>Amazon Brasil</b><div class="muted">Identificador: '+esc(state.settings.amazonTag)+'</div></div><span class="badge warn">Conector do site pendente</span></div>'+
  '<div class="integration"><div><b>Mercado Livre</b><div class="muted">Pesquisa real feita externamente até integração oficial.</div></div><span class="badge warn">Conector do site pendente</span></div>'+
  '<div class="integration"><div><b>Shopee</b><div class="muted">Integração futura, sem presumir aprovação.</div></div><span class="badge warn">Pendente</span></div></section>';
}
function form(){
  const opts=Object.keys(CATS).map(c=>'<option value="'+c+'">'+CATS[c]+' '+c+'</option>').join('');
  const vopts='<option value="unknown">Não informado</option><option value="verified">Verificado</option><option value="na">Não se aplica</option><option value="attention">Sinal de atenção</option>';
  return '<section class="panel"><div class="section-head"><div><h2>Novo candidato</h2><p>Cadastre apenas dados observados. O painel não inventa validações.</p></div></div>'+
  '<form id="offerForm" class="form-grid">'+
  '<label class="field full"><span>Nome completo</span><input name="name" required></label>'+
  '<label class="field"><span>Categoria</span><select name="category">'+opts+'</select></label>'+
  '<label class="field"><span>Plataforma</span><select name="platform"><option>Amazon</option><option>Mercado Livre</option><option>Shopee</option><option>Outra</option></select></label>'+
  '<label class="field"><span>Marca</span><input name="brand"></label>'+
  '<label class="field"><span>Vendedor / loja</span><input name="merchant" required></label>'+
  '<label class="field"><span>Preço atual (R$)</span><input name="price" inputmode="decimal" required></label>'+
  '<label class="field"><span>Preço de referência (R$)</span><input name="referencePrice" inputmode="decimal"></label>'+
  '<label class="field"><span>Referência comprovada?</span><select name="referenceVerified"><option value="false">Não</option><option value="true">Sim</option></select></label>'+
  '<label class="field"><span>Fonte da referência</span><input name="referenceSource"></label>'+
  '<label class="field full"><span>URL original HTTPS</span><input name="originalUrl" type="url" required></label>'+
  '<label class="field full"><span>URL de afiliada HTTPS</span><input name="affiliateUrl" type="url"></label>'+
  '<label class="field full"><span>URL da foto real do anúncio</span><input name="imageUrl" type="url"></label>'+
  '<label class="field"><span>Condição especial</span><input name="condition" placeholder="Prime, Meli+, Pix..."></label>'+
  '<label class="field"><span>Cupom</span><input name="coupon"></label>'+
  '<label class="field"><span>Frete</span><input name="shipping"></label>'+
  '<label class="field"><span>Relevância (0–5)</span><input name="relevance" type="number" min="0" max="5" value="3"></label>'+
  '<label class="field"><span>Evidência histórica (0–5)</span><input name="historyEvidence" type="number" min="0" max="5" value="0"></label>'+
  '<label class="field"><span>Preço</span><select name="v_price">'+vopts+'</select></label>'+
  '<label class="field"><span>Vendedor</span><select name="v_seller">'+vopts+'</select></label>'+
  '<label class="field"><span>Procedência</span><select name="v_provenance">'+vopts+'</select></label>'+
  '<label class="field"><span>Disponibilidade</span><select name="v_availability">'+vopts+'</select></label>'+
  '<label class="field full"><span>Evidências / pendências</span><textarea name="evidenceNotes" rows="3"></textarea></label>'+
  '<div class="field full"><button class="btn primary" type="submit">Salvar candidato</button></div></form></section>';
}
function offersView(){
  return form()+'<section class="panel"><div class="section-head"><div><h2>Ofertas</h2><p>Filtre os achadinhos já cadastrados.</p></div></div>'+
  '<div class="toolbar"><input id="q" placeholder="Buscar produto, marca ou vendedor"><select id="cat"><option value="">Todas as categorias</option>'+Object.keys(CATS).map(c=>'<option>'+c+'</option>').join('')+'</select><select id="platform"><option value="">Todas as plataformas</option><option>Amazon</option><option>Mercado Livre</option><option>Shopee</option><option>Outra</option></select><select id="status"><option value="">Todos os status</option><option value="candidate">Candidato</option><option value="approved">Aprovado</option><option value="rejected">Reprovado</option><option value="published">Publicado</option></select></div>'+
  '<div id="offerGrid" class="grid offers">'+cards(state.offers)+'</div></section>';
}
function cards(arr){
  if(!arr.length)return '<div class="empty panel">Nenhuma oferta cadastrada ainda.</div>';
  return arr.map(o=>{const d=discount(o);return '<article class="offer"><div class="offer-main"><div class="photo">'+(o.imageUrl?'<img src="'+esc(o.imageUrl)+'" alt="">':'Foto real<br>não informada')+'</div><div><h3>'+esc(o.name)+'</h3><p class="meta">'+esc(o.platform)+' · '+esc(o.merchant)+' · '+esc(o.category)+'</p><div class="price">'+brl(o.price)+'</div>'+(o.referenceVerified&&o.referencePrice?'<div><span class="old">'+brl(o.referencePrice)+'</span> '+(d!==null?'<span class="discount">'+d+'% OFF</span>':'')+'</div>':'<div class="muted">Sem desconto histórico comprovado</div>')+'<span class="score">Score '+score(o)+'/100</span><div class="checks"><div class="check"><b>Preço</b>'+valLabel(o.validation?.price)+'</div><div class="check"><b>Vendedor</b>'+valLabel(o.validation?.seller)+'</div><div class="check"><b>Procedência</b>'+valLabel(o.validation?.provenance)+'</div><div class="check"><b>Disponibilidade</b>'+valLabel(o.validation?.availability)+'</div></div></div></div><div class="offer-actions"><button class="btn" data-details="'+o.id+'">Detalhes</button>'+(o.status==='candidate'?'<button class="btn good" data-approve="'+o.id+'">Aprovar</button><button class="btn bad" data-reject="'+o.id+'">Reprovar</button>':'')+((o.status==='approved'||o.status==='published')?'<button class="btn soft" data-post="'+o.id+'">Post</button>':'')+'<span class="badge">'+statusLabel(o.status)+'</span></div></article>'}).join('');
}
function approvals(){
  const arr=state.offers.filter(o=>o.status==='candidate');
  return '<section class="panel"><div class="section-head"><div><h2>Fila de aprovação</h2><p>Uma oferta só pode ser aprovada com as quatro validações críticas confirmadas.</p></div></div><div class="grid offers">'+cards(arr)+'</div></section>';
}
function posts(){
  const arr=state.offers.filter(o=>o.status==='approved'||o.status==='published');
  if(!state.selected&&arr[0])state.selected=arr[0].id;
  const current=arr.find(o=>o.id===state.selected)||arr[0];
  return '<section class="panel"><div class="section-head"><div><h2>Posts para WhatsApp</h2><p>Edite, copie, abra no WhatsApp e registre a publicação.</p></div></div>'+
  (arr.length?'<div class="post-layout"><div class="post-list">'+arr.map(o=>'<button class="'+(current?.id===o.id?'active':'')+'" data-select="'+o.id+'"><b>'+esc(o.name)+'</b><br><span class="muted">'+brl(o.price)+' · '+statusLabel(o.status)+'</span></button>').join('')+'</div><div>'+(current?'<textarea id="postEditor" class="post-editor">'+esc(current.post||makeMessage(current))+'</textarea><div class="actions"><button id="savePost" class="btn">Salvar edição</button><button id="copyPost" class="btn primary">Copiar mensagem</button><button id="openWA" class="btn soft">Abrir WhatsApp</button><button id="publish" class="btn good">Registrar publicação</button></div>':'')+'</div></div>':'<div class="empty">Nenhuma oferta aprovada ainda.</div>')+'</section>';
}
function history(){
  return '<section class="panel"><div class="section-head"><div><h2>Histórico</h2><p>Registro local das principais ações.</p></div></div>'+(state.audit.length?'<table><thead><tr><th>Data</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>'+state.audit.map(a=>'<tr><td>'+fmt(a.at)+'</td><td>'+esc(a.action)+'</td><td>'+esc(a.detail||'—')+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">Nenhum evento registrado.</div>')+'</section>';
}
function settings(){
  return '<section class="panel"><div class="section-head"><div><h2>Configurações</h2><p>Preferências operacionais da sua central.</p></div></div><div class="form-grid"><label class="field"><span>Amazon Associates tag</span><input id="amazonTag" value="'+esc(state.settings.amazonTag)+'"></label><label class="field"><span>Fuso horário</span><input id="timezone" value="'+esc(state.settings.timezone)+'"></label><label class="field full"><span>Horários de curadoria</span><input id="times" value="'+esc(state.settings.times.join(', '))+'"></label><div class="field full actions"><button id="saveSettings" class="btn primary">Salvar</button><button id="exportData" class="btn">Exportar backup</button><label class="btn soft">Importar backup<input id="importData" type="file" accept="application/json" hidden></label><button id="clearData" class="btn bad">Apagar dados locais</button></div></div><hr><div class="integration"><b>Amazon Brasil</b><span class="badge warn">Integração do site pendente</span></div><div class="integration"><b>Mercado Livre</b><span class="badge warn">Integração do site pendente</span></div><div class="integration"><b>Shopee</b><span class="badge warn">Integração futura</span></div><div class="integration"><b>Autenticação / banco em nuvem</b><span class="badge warn">Próxima fase</span></div></section>';
}
function bind(){
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.go;save();render()});
  const f=$('#offerForm'); if(f)f.onsubmit=e=>{e.preventDefault();const d=new FormData(f),url=String(d.get('originalUrl')||'').trim(),aff=String(d.get('affiliateUrl')||'').trim();try{const u=new URL(url);if(u.protocol!=='https:')throw 0;if(aff&&new URL(aff).protocol!=='https:')throw 0}catch{return toast('Use URLs HTTPS válidas.','bad')}if(state.offers.some(o=>o.originalUrl===url))return toast('Este anúncio já está cadastrado.','bad');const o={id:uid(),createdAt:now(),updatedAt:now(),status:'candidate',name:String(d.get('name')||'').trim(),category:String(d.get('category')),platform:String(d.get('platform')),brand:String(d.get('brand')||'').trim(),merchant:String(d.get('merchant')||'').trim(),price:String(d.get('price')||'').replace(',','.'),referencePrice:String(d.get('referencePrice')||'').replace(',','.'),referenceVerified:String(d.get('referenceVerified'))==='true',referenceSource:String(d.get('referenceSource')||'').trim(),originalUrl:url,affiliateUrl:aff,imageUrl:String(d.get('imageUrl')||'').trim(),condition:String(d.get('condition')||'').trim(),coupon:String(d.get('coupon')||'').trim(),shipping:String(d.get('shipping')||'').trim(),relevance:String(d.get('relevance')||'0'),historyEvidence:String(d.get('historyEvidence')||'0'),evidenceNotes:String(d.get('evidenceNotes')||'').trim(),validation:{price:String(d.get('v_price')),seller:String(d.get('v_seller')),provenance:String(d.get('v_provenance')),availability:String(d.get('v_availability'))}};if(!o.name||!o.merchant||!n(o.price)||n(o.price)<=0)return toast('Preencha nome, vendedor e preço corretamente.','bad');state.offers.unshift(o);audit('Candidato cadastrado',o.id,o.platform+' · '+brl(o.price));save();toast('Candidato salvo.','good');render()};
  ['q','cat','platform','status'].forEach(id=>{const el=$('#'+id);if(el)el.oninput=filter});
  document.querySelectorAll('[data-details]').forEach(b=>b.onclick=()=>details(b.dataset.details));
  document.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>approve(b.dataset.approve));
  document.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>reject(b.dataset.reject));
  document.querySelectorAll('[data-post]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.post;state.tab='Posts';save();render()});
  document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.select;save();render()});
  const current=state.offers.find(o=>o.id===state.selected);
  if($('#savePost'))$('#savePost').onclick=()=>{current.post=$('#postEditor').value;current.updatedAt=now();audit('Post editado',current.id);save();toast('Edição salva.','good')};
  if($('#copyPost'))$('#copyPost').onclick=async()=>{try{await navigator.clipboard.writeText($('#postEditor').value);toast('Mensagem copiada.','good')}catch{toast('Seu navegador bloqueou a cópia automática.','bad')}};
  if($('#openWA'))$('#openWA').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent($('#postEditor').value),'_blank','noopener');
  if($('#publish'))$('#publish').onclick=()=>{if(!current)return;if(!confirm('Confirma que você publicou esta oferta?'))return;current.post=$('#postEditor').value;current.status='published';current.publishedAt=now();audit('Publicação registrada',current.id,'WhatsApp');save();toast('Publicação registrada.','good');render()};
  if($('#saveSettings'))$('#saveSettings').onclick=()=>{state.settings.amazonTag=$('#amazonTag').value.trim();state.settings.timezone=$('#timezone').value.trim()||'America/Sao_Paulo';state.settings.times=$('#times').value.split(',').map(x=>x.trim()).filter(Boolean);audit('Configurações atualizadas');save();toast('Configurações salvas.','good');render()};
  if($('#exportData'))$('#exportData').onclick=exportData;
  if($('#importData'))$('#importData').onchange=importData;
  if($('#clearData'))$('#clearData').onclick=()=>{if(confirm('Apagar todos os dados salvos neste navegador?')){localStorage.removeItem(KEY);state=structuredClone(emptyState);render();toast('Dados locais apagados.','good')}};
}
function filter(){
  const q=($('#q')?.value||'').toLowerCase(),c=$('#cat')?.value||'',p=$('#platform')?.value||'',s=$('#status')?.value||'';
  const arr=state.offers.filter(o=>(!q||[o.name,o.brand,o.merchant].join(' ').toLowerCase().includes(q))&&(!c||o.category===c)&&(!p||o.platform===p)&&(!s||o.status===s));
  $('#offerGrid').innerHTML=cards(arr);bindCardActions();
}
function bindCardActions(){
  document.querySelectorAll('[data-details]').forEach(b=>b.onclick=()=>details(b.dataset.details));
  document.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>approve(b.dataset.approve));
  document.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>reject(b.dataset.reject));
  document.querySelectorAll('[data-post]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.post;state.tab='Posts';save();render()});
}
function approve(id){const o=state.offers.find(x=>x.id===id);if(!o)return;if(!valid(o))return toast('Aprovação bloqueada: preço, vendedor, procedência e disponibilidade precisam estar verificados.','bad');o.status='approved';o.approvedAt=now();o.updatedAt=now();o.post=makeMessage(o);audit('Oferta aprovada',o.id,'Score '+score(o)+'/100');save();toast('Oferta aprovada e post preparado.','good');render()}
function reject(id){const o=state.offers.find(x=>x.id===id);if(!o)return;const reason=prompt('Motivo da reprovação (opcional):')||'';o.status='rejected';o.updatedAt=now();audit('Oferta reprovada',o.id,reason);save();render();toast('Oferta reprovada.','good')}
function details(id){const o=state.offers.find(x=>x.id===id);if(!o)return;const d=discount(o);$('#detailsContent').innerHTML='<div class="dialog-inner"><div class="dialog-head"><div><h2>'+esc(o.name)+'</h2><div class="muted">'+esc(o.platform)+' · '+esc(o.merchant)+'</div></div><button id="closeDialog" class="btn">Fechar</button></div><hr><div class="kv"><b>Status</b><span>'+statusLabel(o.status)+'</span></div><div class="kv"><b>Preço atual</b><span>'+brl(o.price)+'</span></div><div class="kv"><b>Preço de referência</b><span>'+(o.referencePrice?brl(o.referencePrice):'Não informado')+(o.referenceVerified?' · comprovado':' · não comprovado')+'</span></div><div class="kv"><b>Desconto</b><span>'+(d!==null?d+'%':'Não calculado')+'</span></div><div class="kv"><b>Score</b><span>'+score(o)+'/100</span></div><div class="kv"><b>Cupom</b><span>'+esc(o.coupon||'—')+'</span></div><div class="kv"><b>Condição</b><span>'+esc(o.condition||'—')+'</span></div><div class="kv"><b>Frete</b><span>'+esc(o.shipping||'—')+'</span></div><div class="kv"><b>Evidências</b><span>'+esc(o.evidenceNotes||'—')+'</span></div><hr><div class="actions"><a class="btn primary" href="'+esc(o.originalUrl)+'" target="_blank" rel="noopener">Abrir anúncio</a>'+(o.affiliateUrl?'<a class="btn soft" href="'+esc(o.affiliateUrl)+'" target="_blank" rel="noopener">Abrir afiliado</a>':'')+'</div></div>';$('#detailsDialog').showModal();$('#closeDialog').onclick=()=>$('#detailsDialog').close()}
function exportData(){const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='olha-isso-miga-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href)}
function importData(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.offers)||!Array.isArray(d.audit))throw 0;state={...structuredClone(emptyState),...d};save();audit('Backup importado');render();toast('Backup importado.','good')}catch{toast('Backup inválido.','bad')}};r.readAsText(f)}
render();
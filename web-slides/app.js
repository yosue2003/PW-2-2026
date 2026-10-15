'use strict';

/* WEB SLIDES · Browser-only app, backed by IndexedDB (no localStorage). */
const DB_NAME = 'index.db';
const STORE = 'presentations';
const RECORD_ID = 'main';
const THEMES = Object.freeze({
  night: {background:'#14233d', foreground:'#ffffff'},
  white: {background:'#ffffff', foreground:'#19293c'},
  blue:  {background:'#4859d7', foreground:'#ffffff'},
  mint:  {background:'#cee8d9', foreground:'#183e39'},
  peach: {background:'#ffd7c8', foreground:'#593f38'},
  plum:  {background:'#603f75', foreground:'#ffffff'}
});
const $ = (id) => document.getElementById(id);
const els = {
  title:$('deck-title'),saveState:$('save-state'),slides:$('slides-list'),sidebarCount:$('sidebar-count'),
  canvas:$('slide-canvas'),crumb:$('breadcrumb-slide'),ratioLabel:$('canvas-ratio-label'),
  fieldTitle:$('slide-title-input'),fieldBody:$('slide-body-input'),fieldTitleType:$('title-type-label'),bodyLabel:$('body-field-label'),
  ratio:$('aspect-ratio'),background:$('background-color'),foreground:$('foreground-color'),
  titleAlign:$('title-align'),bodyAlign:$('body-align'),numberAlign:$('number-align'),showNumber:$('show-number'),
  footerCount:$('footer-count'),footerCurrent:$('footer-current'),slideType:$('slide-type-label'),progress:$('progress-fill'),
  prev:$('previous-slide'),next:$('next-slide'),delete:$('delete-slide'),up:$('move-slide-up'),down:$('move-slide-down'),
  file:$('file-import'),overlay:$('presentation-overlay'),presentCanvas:$('present-slide'),
  presentCount:$('present-counter'),presentPrev:$('present-prev'),presentNext:$('present-next'),toast:$('toast')
};
let db = null;
let memoryOnly = false;
let deck = null;
let current = 0;
let saveTimer = null;
let saveQueue = Promise.resolve();
let toastTimer = null;
let presenting = false;

function starterSlide(type, index) {
  const cover = type === 'cover';
  return {
    id: newId(), type:cover?'cover':'content',
    title: cover?'Ideas que inspiran':'Una idea, infinitas posibilidades',
    body: cover?'Una presentación creada con Web Slides.\nDiseña. Comparte. Inspira.':'Personaliza el título, el contenido, el color y la alineación de cada diapositiva.\n\nUtiliza las flechas del teclado para navegar.',
    theme: cover?'night':'white',
    background:cover?THEMES.night.background:THEMES.white.background,
    foreground:cover?THEMES.night.foreground:THEMES.white.foreground,
    titleAlign:cover?'left':'left',bodyAlign:'left',numberAlign:'right',showNumber:true
  };
}
function newId(){return (typeof crypto!=='undefined' && crypto.randomUUID) ? crypto.randomUUID() : `slide-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function starterDeck(){return {id:RECORD_ID,title:'Mi primera presentación',ratio:'16:9',slides:[starterSlide('cover',0),starterSlide('content',1)],selectedIndex:0,updatedAt:new Date().toISOString()};}
const isHex = value => typeof value==='string' && /^#[0-9a-fA-F]{6}$/.test(value);
const validAlign = value => ['left','center','right'].includes(value)?value:'left';
function sanitizeSlide(raw,i){
  const base = starterSlide(i===0?'cover':'content',i);
  const safe = raw&&typeof raw==='object'?raw:{};
  return {...base,
    id:typeof safe.id==='string'&&safe.id.length<110?safe.id:newId(),
    type:i===0?'cover':'content',
    title:typeof safe.title==='string'?safe.title.slice(0,180):base.title,
    body:typeof safe.body==='string'?safe.body.slice(0,4000):base.body,
    theme:typeof safe.theme==='string'&&Object.hasOwn(THEMES,safe.theme)?safe.theme:'custom',
    background:isHex(safe.background)?safe.background:base.background,
    foreground:isHex(safe.foreground)?safe.foreground:base.foreground,
    titleAlign:validAlign(safe.titleAlign),bodyAlign:validAlign(safe.bodyAlign),
    numberAlign:validAlign(safe.numberAlign),showNumber:safe.showNumber!==false
  };
}
function sanitizeDeck(raw){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.slides)||raw.slides.length===0)throw new Error('El archivo no contiene una presentación válida.');
  const slides=raw.slides.slice(0,200).map((s,i)=>sanitizeSlide(s,i));
  return {id:RECORD_ID,title:typeof raw.title==='string'?raw.title.slice(0,100):'Mi presentación',ratio:raw.ratio==='4:3'?'4:3':'16:9',slides,selectedIndex:Math.min(Math.max(Number.isInteger(raw.selectedIndex)?raw.selectedIndex:0,0),slides.length-1),updatedAt:new Date().toISOString()};
}
function openDatabase(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('IndexedDB no está disponible'));return;}
    let request;
    try{request=indexedDB.open(DB_NAME,1);}catch(e){reject(e);return;}
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('No se pudo abrir IndexedDB'));
    request.onblocked=()=>reject(new Error('Base de datos bloqueada'));
  });
}
function readDeck(){return new Promise((resolve,reject)=>{
  const transaction=db.transaction(STORE,'readonly');
  const req=transaction.objectStore(STORE).get(RECORD_ID);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error);
});}
function persist(snapshot){return new Promise((resolve,reject)=>{
  if(!db){resolve();return;}
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put(snapshot);
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
});}
function saveSoon(){
  deck.selectedIndex=current;deck.updatedAt=new Date().toISOString();
  if(memoryOnly){setSaveStatus('Sesión temporal','error');return;}
  setSaveStatus('Guardando…','saving');
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{const snapshot=structuredClone(deck);
    saveQueue=saveQueue.catch(()=>{}).then(()=>persist(snapshot));
    saveQueue.then(()=>setSaveStatus('Guardado')).catch(()=>{setSaveStatus('Sin guardar','error');toast('No se pudo guardar la presentación.');});
  },280);
}
function setSaveStatus(label,kind=''){
  els.saveState.className='save-state'+(kind?' '+kind:'');
  els.saveState.replaceChildren();
  const dot=document.createElement('span');dot.className='save-dot';els.saveState.append(dot,document.createTextNode(' '+label));
}
function toast(message){clearTimeout(toastTimer);els.toast.textContent=message;els.toast.classList.add('visible');toastTimer=setTimeout(()=>els.toast.classList.remove('visible'),2900);}
function slideNow(){return deck.slides[current];}
function pad(index){return String(index).padStart(2,'0');}
function shortLabel(index){return index===0?'Portada':`Diapositiva ${index}`;}
function ratioNumber(){return deck.ratio==='4:3'?'4 / 3':'16 / 9';}
function getTextColor(hex){const rgb=[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255);const l=rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return l[0]*.2126+l[1]*.7152+l[2]*.0722>.45?'#19293c':'#ffffff';}
function makeNode(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function createSlideDOM(target,slide,index,editable){
  target.replaceChildren();
  target.className='slide-canvas'+(index===0?' is-cover':'');
  target.style.setProperty('--slide-ratio',ratioNumber());
  target.style.backgroundColor=slide.background;
  target.style.color=slide.foreground;
  const content=makeNode('div','slide-content');content.dataset.align=slide.titleAlign;
  const rule=makeNode('div','slide-rule');content.append(rule);
  const kicker=makeNode('div','slide-kicker',index===0?'WEB SLIDES · TU HISTORIA':`IDEA ${pad(index)}`);
  kicker.style.textAlign=slide.titleAlign;
  content.append(kicker);
  const title=makeNode('div','slide-title',slide.title);
  title.style.textAlign=slide.titleAlign;title.dataset.placeholder='Escribe un título…';
  const body=makeNode('div','slide-body',slide.body);
  body.style.textAlign=slide.bodyAlign;body.dataset.placeholder=index===0?'Escribe un subtítulo…':'Escribe el contenido…';
  if(editable){
    title.contentEditable='true';body.contentEditable='true';
    title.spellcheck=true;body.spellcheck=true;
    title.setAttribute('role','textbox');body.setAttribute('role','textbox');
    title.setAttribute('aria-label','Título editable');body.setAttribute('aria-label','Contenido editable');
    title.setAttribute('aria-multiline','true');body.setAttribute('aria-multiline','true');
    title.addEventListener('input',()=>updateDirectContent('title',title,180));
    body.addEventListener('input',()=>updateDirectContent('body',body,4000));
    for(const el of [title,body])el.addEventListener('paste',pasteAsText);
  }
  content.append(title,body);target.append(content);
  if(slide.showNumber){const number=makeNode('div','slide-number',pad(index));number.style.textAlign=slide.numberAlign;target.append(number);}
}
function pasteAsText(event){event.preventDefault();const t=event.clipboardData.getData('text/plain');
  const selection=window.getSelection();if(!selection||selection.rangeCount===0)return;
  const r=selection.getRangeAt(0);r.deleteContents();const node=document.createTextNode(t);r.insertNode(node);r.setStartAfter(node);r.collapse(true);selection.removeAllRanges();selection.addRange(r);
  event.currentTarget.dispatchEvent(new Event('input',{bubbles:true}));
}
function updateDirectContent(field,element,max){
  let str=element.innerText||'';if(str.length>max){str=str.slice(0,max);element.textContent=str;}
  slideNow()[field]=str;
  if(field==='title')els.fieldTitle.value=str;else els.fieldBody.value=str;
  renderSidebar();saveSoon();
}
function renderSidebar(){
  els.slides.replaceChildren();els.sidebarCount.textContent=deck.slides.length;
  deck.slides.forEach((slide,index)=>{
    const item=makeNode('button','slide-item');item.type='button';item.setAttribute('role','option');item.setAttribute('aria-selected',String(current===index));item.setAttribute('aria-label',`Seleccionar ${shortLabel(index)}`);
    const indexText=makeNode('span','slide-index',pad(index));
    const container=makeNode('div','slide-item-content');
    const thumbnail=makeNode('div','thumbnail');thumbnail.style.setProperty('--thumb-ratio',ratioNumber());thumbnail.style.aspectRatio=ratioNumber();thumbnail.style.backgroundColor=slide.background;thumbnail.style.color=slide.foreground;
    const kicker=makeNode('span','thumb-kicker',index===0?'WEB SLIDES':'DIAPOSITIVA');kicker.style.textAlign=slide.titleAlign;
    const title=makeNode('span','thumb-title',slide.title||'Sin título');title.style.textAlign=slide.titleAlign;
    const body=makeNode('span','thumb-body',slide.body);body.style.textAlign=slide.bodyAlign;
    thumbnail.append(kicker,title,body);
    if(slide.showNumber){const n=makeNode('span','thumb-num',pad(index));n.style.textAlign=slide.numberAlign;thumbnail.append(n);}
    container.append(thumbnail,makeNode('span','item-subtitle',shortLabel(index)));
    item.append(indexText,container);item.addEventListener('click',()=>selectSlide(index));els.slides.append(item);
  });
}
function updateControls(){
  const slide=slideNow();
  els.title.value=deck.title;
  els.fieldTitle.value=slide.title;els.fieldBody.value=slide.body;
  els.fieldTitleType.textContent=current===0?'de portada':'de diapositiva';els.bodyLabel.textContent=current===0?'Subtítulo':'Contenido (body)';
  els.ratio.value=deck.ratio;els.background.value=slide.background;els.foreground.value=slide.foreground;
  els.titleAlign.value=slide.titleAlign;els.bodyAlign.value=slide.bodyAlign;els.numberAlign.value=slide.numberAlign;els.showNumber.checked=slide.showNumber;
  document.querySelectorAll('[data-theme]').forEach(button=>button.setAttribute('aria-pressed',String(slide.theme===button.dataset.theme)));
  els.delete.disabled=current===0;els.up.disabled=current<2;els.down.disabled=current===0||current===deck.slides.length-1;
  els.prev.disabled=current===0;els.next.disabled=current===deck.slides.length-1;
  els.crumb.textContent=`Diapositiva ${current}`;
  els.ratioLabel.textContent=deck.ratio+(deck.ratio==='16:9'?' · Pantalla ancha':' · Estándar');
  els.slideType.textContent=current===0?'Portada':'Contenido';
  els.footerCount.textContent=`${pad(current)} / ${pad(deck.slides.length-1)}`;
  els.footerCurrent.textContent=`Slide ${current}`;
  els.progress.style.width=`${((current+1)/deck.slides.length)*100}%`;
  els.presentCount.textContent=`${current} / ${deck.slides.length-1}`;
  els.presentPrev.disabled=current===0;els.presentNext.disabled=current===deck.slides.length-1;
}
function render(){renderSidebar();createSlideDOM(els.canvas,slideNow(),current,true);updateControls();if(presenting)createSlideDOM(els.presentCanvas,slideNow(),current,false);}
function selectSlide(index){if(index<0||index>=deck.slides.length)return;current=index;render();saveSoon();const active=els.slides.querySelector('[aria-selected="true"]');active?.scrollIntoView({block:'nearest',behavior:'smooth'});}
function addSlide(){const template=starterSlide('content',deck.slides.length);template.title='Nueva diapositiva';template.body='Escribe aquí tus ideas…';const currentSlide=slideNow();template.theme=currentSlide.theme;template.background=currentSlide.background;template.foreground=currentSlide.foreground;template.titleAlign=currentSlide.titleAlign;template.bodyAlign=currentSlide.bodyAlign;template.numberAlign=currentSlide.numberAlign;deck.slides.splice(current+1,0,template);selectSlide(current+1);toast('Diapositiva añadida');}
function duplicateSlide(){const copy={...structuredClone(slideNow()),id:newId(),type:'content'};deck.slides.splice(current+1,0,copy);selectSlide(current+1);toast('Diapositiva duplicada');}
function deleteSlide(){if(current===0)return;if(!window.confirm(`¿Eliminar la diapositiva ${current}?`))return;deck.slides.splice(current,1);current=Math.min(current,deck.slides.length-1);render();saveSoon();toast('Diapositiva eliminada');}
function moveSlide(direction){const destination=current+direction;if(current===0||destination<1||destination>=deck.slides.length)return;[deck.slides[current],deck.slides[destination]]=[deck.slides[destination],deck.slides[current]];selectSlide(destination);}
function setProperty(prop,value){slideNow()[prop]=value;render();saveSoon();}
function setTitleAndBody(prop,value){slideNow()[prop]=value;createSlideDOM(els.canvas,slideNow(),current,true);renderSidebar();if(presenting)createSlideDOM(els.presentCanvas,slideNow(),current,false);saveSoon();}
function setTheme(theme){const config=THEMES[theme];setProperty('theme',theme);slideNow().background=config.background;slideNow().foreground=config.foreground;render();saveSoon();}
function enterPresentation(){presenting=true;els.overlay.hidden=false;document.body.style.overflow='hidden';createSlideDOM(els.presentCanvas,slideNow(),current,false);updateControls();els.overlay.focus?.();}
function exitPresentation(){presenting=false;els.overlay.hidden=true;document.body.style.overflow='';}
function fileName(title){return (title.trim()||'web-slides').replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'-').slice(0,60)+'.json';}
function exportDeck(){const json=JSON.stringify({...deck,selectedIndex:current},null,2);const blob=new Blob([json],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName(deck.title);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Presentación exportada como JSON');}
async function importDeck(file){if(!file)return;try{
  const raw=JSON.parse(await file.text());const loaded=sanitizeDeck(raw);
  if(!window.confirm('¿Reemplazar la presentación actual con el archivo importado?'))return;
  deck=loaded;current=loaded.selectedIndex;render();saveSoon();toast('Presentación importada correctamente');
}catch(e){toast('No se pudo importar: '+(e instanceof SyntaxError?'JSON inválido':e.message));}finally{els.file.value='';}}
function isEditing(target){return target instanceof HTMLElement&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName));}
function attachEvents(){
  $('add-slide').addEventListener('click',addSlide);$('add-slide-small').addEventListener('click',addSlide);
  $('duplicate-slide').addEventListener('click',duplicateSlide);els.delete.addEventListener('click',deleteSlide);
  els.up.addEventListener('click',()=>moveSlide(-1));els.down.addEventListener('click',()=>moveSlide(1));
  els.prev.addEventListener('click',()=>selectSlide(current-1));els.next.addEventListener('click',()=>selectSlide(current+1));
  els.title.addEventListener('input',e=>{deck.title=e.target.value;saveSoon();});
  els.fieldTitle.addEventListener('input',e=>setTitleAndBody('title',e.target.value));
  els.fieldBody.addEventListener('input',e=>setTitleAndBody('body',e.target.value));
  els.ratio.addEventListener('change',e=>{deck.ratio=e.target.value;render();saveSoon();});
  els.background.addEventListener('input',e=>{slideNow().background=e.target.value;slideNow().theme='custom';render();saveSoon();});
  els.foreground.addEventListener('input',e=>{slideNow().foreground=e.target.value;slideNow().theme='custom';render();saveSoon();});
  els.titleAlign.addEventListener('change',e=>setProperty('titleAlign',e.target.value));
  els.bodyAlign.addEventListener('change',e=>setProperty('bodyAlign',e.target.value));
  els.numberAlign.addEventListener('change',e=>setProperty('numberAlign',e.target.value));
  els.showNumber.addEventListener('change',e=>setProperty('showNumber',e.target.checked));
  document.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.theme)));
  $('start-presentation').addEventListener('click',enterPresentation);$('close-presentation').addEventListener('click',exitPresentation);
  els.presentPrev.addEventListener('click',()=>selectSlide(current-1));els.presentNext.addEventListener('click',()=>selectSlide(current+1));
  $('export-deck').addEventListener('click',exportDeck);$('import-deck').addEventListener('click',()=>els.file.click());
  els.file.addEventListener('change',()=>importDeck(els.file.files?.[0]));
  $('new-deck').addEventListener('click',()=>{if(!window.confirm('¿Crear una presentación nueva? Se reemplazará la presentación guardada (puedes exportarla antes).'))return;deck=starterDeck();current=0;render();saveSoon();toast('Nueva presentación creada');});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&presenting){exitPresentation();return;}
    if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();if(!presenting)addSlide();return;}
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();if(!presenting)exportDeck();return;}
    if(!presenting&&isEditing(event.target))return;
    if(['ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();selectSlide(current+1);}
    else if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();selectSlide(current-1);}
    else if(event.key==='Home'){event.preventDefault();selectSlide(0);}
    else if(event.key==='End'){event.preventDefault();selectSlide(deck.slides.length-1);}
  });
}
async function initialize(){
  try{
    db=await openDatabase();
    const loaded=await readDeck();
    deck=loaded?sanitizeDeck(loaded):starterDeck();current=deck.selectedIndex;
    setSaveStatus('Guardado');
  }catch(e){
    console.warn('IndexedDB no disponible: sesión temporal.',e);
    memoryOnly=true;deck=starterDeck();current=0;setSaveStatus('Sesión temporal','error');
    toast('IndexedDB no está disponible. Puedes exportar tu trabajo a JSON.');
  }
  attachEvents();render();if(!memoryOnly)saveSoon();
}
initialize();

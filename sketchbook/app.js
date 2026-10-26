const book = document.getElementById('book');
const count = 31;
const makePage = (className, number) => {
  const page = document.createElement('div');
  page.className = `page ${className}`;
  if (className.includes('cover')) page.dataset.density = 'hard';
  if (number) {
    const img = document.createElement('img');
    img.src = `assets/page-${String(number).padStart(2,'0')}.webp`;
    img.alt = `Sketchbook page ${number}`;
    img.draggable = false;
    page.append(img);
  }
  book.append(page);
};
makePage('cover front-cover');
const coverImage = new Image();
coverImage.src = 'assets/cover.webp';
coverImage.alt = 'Works 2026 — Mattia Galbusera';
coverImage.draggable = false;
book.lastElementChild.append(coverImage);
makePage('endpaper');
for(let n=1;n<=count;n++) makePage('',n);
makePage('endpaper');
// Keep the total page count even so the back cover sits on its own.
if (count % 2) makePage('endpaper');
makePage('cover back-cover');
const lastIndex = book.querySelectorAll('.page').length - 1;
const stage = document.querySelector('.stage');
const availableHeight = stage.clientHeight;
const availableWidth = stage.clientWidth;
const portrait = availableWidth < 600;
const width = Math.floor(Math.min(availableHeight * 612/792, availableWidth/(portrait?1:2)));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const flipbook = new St.PageFlip(book, {
  width, height:Math.floor(width*792/612), size:'fixed', showCover:true,
  usePortrait:true, drawShadow:true, maxShadowOpacity:.35,
  flippingTime:reduced?1:1000, mobileScrollSupport:false, showPageCorners:true
});
const previous = document.getElementById('previous');
const next = document.getElementById('next');
const zoom = document.getElementById('zoom');
function visiblePages() {
  const index=flipbook.getCurrentPageIndex();
  return (flipbook.getOrientation()==='portrait'?[index]:[index,index+1]).filter(n=>n>=2&&n<=count+1).map(n=>n-1);
}
function update() {
  const index = flipbook.getCurrentPageIndex();
  const landscape = flipbook.getOrientation()==='landscape';
  book.classList.toggle('closed', index===0&&landscape);
  book.classList.toggle('back',index===lastIndex&&landscape);
  previous.disabled=index===0;
  next.disabled=index===lastIndex;
  const pages=visiblePages();
  document.getElementById('counter').textContent=index===0?'COVER':index===lastIndex?'BACK COVER':pages.length?`${pages.map(n=>String(n).padStart(2,'0')).join(' – ')} / ${count}`:'ENDPAPER';
  document.getElementById('hint').textContent=index===0?'CLICK THE COVER TO OPEN':'DRAG A CORNER, CLICK, OR USE ← →';
  zoom.disabled=!pages.length;
}
flipbook.on('init',update);
flipbook.on('flip',update);
flipbook.on('changeOrientation',update);
flipbook.loadFromHTML(book.querySelectorAll('.page'));
previous.addEventListener('click',()=>flipbook.flipPrev());
next.addEventListener('click',()=>flipbook.flipNext());
document.getElementById('close').addEventListener('click',()=>{flipbook.turnToPage(0);update()});
document.addEventListener('keydown',e=>{
  if(document.getElementById('viewer').open)return;
  if(e.key==='ArrowRight'){e.preventDefault();flipbook.flipNext()}
  if(e.key==='ArrowLeft'){e.preventDefault();flipbook.flipPrev()}
  if(e.key==='Home'){e.preventDefault();flipbook.turnToPage(0);update()}
});
zoom.addEventListener('click',()=>{
  const canvas=document.getElementById('page-canvas'); canvas.replaceChildren();
  visiblePages().forEach(n=>{const img=new Image();img.src=`assets/page-${String(n).padStart(2,'0')}.webp`;img.alt=`Sketchbook page ${n}`;img.draggable=false;canvas.append(img)});
  document.getElementById('viewer').showModal();
  fitPages();
});
document.getElementById('dismiss').addEventListener('click',()=>document.getElementById('viewer').close());
const viewport=document.getElementById('enlarged');
const canvas=document.getElementById('page-canvas');
let magnification=1, panX=0, panY=0, baseWidth=0, baseHeight=0;
function paintView(){
  const maxX=Math.max(0,(baseWidth*magnification-viewport.clientWidth)/2);
  const maxY=Math.max(0,(baseHeight*magnification-viewport.clientHeight)/2);
  panX=Math.max(-maxX,Math.min(maxX,panX));panY=Math.max(-maxY,Math.min(maxY,panY));
  canvas.style.transform=`translate(${panX}px,${panY}px) scale(${magnification})`;
  document.getElementById('zoom-level').textContent=`${Math.round(magnification*100)}%`;
  document.getElementById('zoom-out').disabled=magnification<=1;
  document.getElementById('zoom-in').disabled=magnification>=6;
}
function fitPages(){
  const total=canvas.children.length||1;
  baseHeight=Math.min(viewport.clientHeight-20,(viewport.clientWidth-20-(total-1)*8)/total*792/612);
  baseWidth=baseHeight*612/792*total+(total-1)*8;
  canvas.style.width=`${baseWidth}px`;canvas.style.height=`${baseHeight}px`;
  magnification=1;panX=panY=0;paintView();
}
function scaleView(value,x=0,y=0){
  const target=Math.max(1,Math.min(6,value)), ratio=target/magnification;
  panX=x-(x-panX)*ratio;panY=y-(y-panY)*ratio;magnification=target;paintView();
}
document.getElementById('zoom-in').addEventListener('click',()=>scaleView(magnification*1.3));
document.getElementById('zoom-out').addEventListener('click',()=>scaleView(magnification/1.3));
document.getElementById('zoom-fit').addEventListener('click',fitPages);
viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();scaleView(magnification*Math.exp(-e.deltaY*.002),e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2)},{passive:false});
const pointers=new Map();let gesture;
function startGesture(){
  const p=[...pointers.values()];
  gesture=p.length===1?{x:p[0].x,y:p[0].y,panX,panY}:p.length===2?{distance:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),zoom:magnification}:null;
}
viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});startGesture();viewport.classList.add('dragging')});
viewport.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=[...pointers.values()];
  if(p.length===1&&gesture){panX=gesture.panX+p[0].x-gesture.x;panY=gesture.panY+p[0].y-gesture.y;paintView()}
  if(p.length===2&&gesture?.distance){const r=viewport.getBoundingClientRect();scaleView(gesture.zoom*Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)/gesture.distance,(p[0].x+p[1].x)/2-r.left-r.width/2,(p[0].y+p[1].y)/2-r.top-r.height/2)}
});
function endPointer(e){pointers.delete(e.pointerId);startGesture();if(!pointers.size)viewport.classList.remove('dragging')}
viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);
viewport.addEventListener('dblclick',()=>magnification>1?fitPages():scaleView(2));
document.getElementById('viewer').addEventListener('keydown',e=>{
  if(e.key==='+'||e.key==='='){scaleView(magnification*1.3);e.preventDefault()}
  if(e.key==='-'){scaleView(magnification/1.3);e.preventDefault()}
  if(e.key==='0'){fitPages();e.preventDefault()}
  if(e.key.startsWith('Arrow')){e.preventDefault();panX+=e.key==='ArrowLeft'?50:e.key==='ArrowRight'?-50:0;panY+=e.key==='ArrowUp'?50:e.key==='ArrowDown'?-50:0;paintView()}
});
window.addEventListener('resize',()=>{if(document.getElementById('viewer').open)fitPages()});
// Recalculate fixed page dimensions when the viewport changes, preserving the reading position.
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
  const current=flipbook.getCurrentPageIndex();
  const w=Math.floor(Math.min(stage.clientHeight*612/792,stage.clientWidth/(stage.clientWidth<600?1:2)));
  flipbook.getSettings().width=w;flipbook.getSettings().height=Math.floor(w*792/612);
  book.style.minWidth=`${w}px`;
  book.style.minHeight=`${Math.floor(w*792/612)}px`;
  book.style.maxWidth=`${w*2}px`;
  flipbook.update();flipbook.turnToPage(current);update();
},150)});

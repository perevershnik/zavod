const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const workers = [
  { id: 1, name: 'Влад', role: 'Комплектувальник', photo: 'assets/vlad.jpg', x: .18, y: .26 },
  { id: 2, name: 'Женя', role: 'Комплектувальник', photo: 'assets/zhenya.jpg', x: .74, y: .32 },
  { id: 3, name: 'Алина', role: 'Комплектувальник', photo: 'assets/alina.jpg', x: .30, y: .72 },
  { id: 4, name: 'Дима', role: 'Комплектувальник', photo: 'assets/dima.jpg', x: .78, y: .72 },
];

const shelves = [
  { x:.12, y:.14, w:.18, h:.17, label:'A • Бакалея' },
  { x:.40, y:.14, w:.18, h:.17, label:'B • Напитки' },
  { x:.68, y:.14, w:.18, h:.17, label:'C • Снеки' },
  { x:.12, y:.51, w:.18, h:.17, label:'D • Овощи' },
  { x:.40, y:.51, w:.18, h:.17, label:'E • Молочка' },
  { x:.68, y:.51, w:.18, h:.17, label:'F • Заморозка' },
];

const packZone = { x:.36, y:.79, w:.28, h:.12, label:'ЗОНА ПАКУВАННЯ' };
const startZone = { x:.015, y:.80, w:.20, h:.12, label:'НОВЫЕ ЗАКАЗЫ' };

let W = 0, H = 0, paused = false, speed = 1;
let startedAt = Date.now();
let ordersCompleted = 0, itemsCollected = 0, packed = 0;
let nextOrderId = 101;
let orders = [];
let lastAutoOrder = 0;
let toastTimer;

const statusText = {
  waiting: 'Свободен',
  picking: 'Собирает',
  packing: 'Пакует'
};

const avatarFallbacks = [
  ['#5476ff', '#8db3ff'],
  ['#af5cff', '#e094ff'],
  ['#ff6c8e', '#ffb1c4'],
  ['#25b9a6', '#8fe7dc']
];

workers.forEach((w, i) => {
  w.px = 0; w.py = 0;
  w.tx = 0; w.ty = 0;
  w.status = 'waiting';
  w.order = null;
  w.targetShelf = null;
  w.stageTimer = 0;
  w.completedItems = 0;
  w.completedOrders = 0;
  w.img = new Image();
  w.img.src = w.photo;
  w.fallback = avatarFallbacks[i % avatarFallbacks.length];
});

function resize() {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = r.width; H = r.height;
  workers.forEach(w => {
    if (!w.px) { w.px = w.x * W; w.py = w.y * H; }
  });
}
window.addEventListener('resize', resize);

function rectPx(o) { return { x:o.x*W, y:o.y*H, w:o.w*W, h:o.h*H }; }
function centerOf(o) { const r=rectPx(o); return { x:r.x+r.w/2, y:r.y+r.h/2 }; }

function roundedRect(x,y,w,h,r) {
  const rr = Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr); ctx.closePath();
}

function drawFloor() {
  ctx.fillStyle = '#11161d';
  ctx.fillRect(0,0,W,H);

  const grid = 34;
  ctx.strokeStyle = 'rgba(255,255,255,.025)';
  ctx.lineWidth = 1;
  for(let x=0;x<W;x+=grid){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke(); }
  for(let y=0;y<H;y+=grid){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }

  // travel lanes
  ctx.strokeStyle='rgba(247,216,74,.07)';
  ctx.lineWidth=2;
  ctx.setLineDash([8,10]);
  [0.39,0.76].forEach(py=>{
    ctx.beginPath(); ctx.moveTo(W*.05,H*py); ctx.lineTo(W*.95,H*py); ctx.stroke();
  });
  ctx.setLineDash([]);
}

function drawShelf(s, idx) {
  const r=rectPx(s);
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,.32)';
  ctx.shadowBlur=16; ctx.shadowOffsetY=8;
  roundedRect(r.x,r.y,r.w,r.h,14);
  ctx.fillStyle='#232a35'; ctx.fill();
  ctx.shadowColor='transparent';

  ctx.strokeStyle='rgba(255,255,255,.06)';
  ctx.lineWidth=1; ctx.stroke();

  // rows
  for(let i=1;i<4;i++){
    ctx.strokeStyle='rgba(255,255,255,.07)';
    ctx.beginPath();
    ctx.moveTo(r.x+10, r.y+r.h*i/4);
    ctx.lineTo(r.x+r.w-10, r.y+r.h*i/4);
    ctx.stroke();
  }

  // items
  for(let yy=0;yy<3;yy++){
    for(let xx=0;xx<6;xx++){
      const iw=Math.max(6,r.w*.055);
      const ih=Math.max(7,r.h*.10);
      const x=r.x+14+xx*((r.w-28)/6);
      const y=r.y+18+yy*(r.h*.24);
      ctx.globalAlpha=.38 + ((idx+xx+yy)%3)*.11;
      ctx.fillStyle=['#f7d84a','#55a7ff','#ff7d93','#4bd37b'][ (idx+xx+yy)%4 ];
      roundedRect(x,y,iw,ih,2); ctx.fill();
    }
  }
  ctx.globalAlpha=1;
  ctx.fillStyle='#d8dee9'; ctx.font='700 11px system-ui';
  ctx.fillText(s.label,r.x+12,r.y+r.h-10);
  ctx.restore();
}

function drawZone(z, color, fill, labelColor='#fff') {
  const r=rectPx(z);
  ctx.save();
  ctx.setLineDash([8,6]);
  ctx.strokeStyle=color;
  ctx.lineWidth=1.5;
  roundedRect(r.x,r.y,r.w,r.h,14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle=fill;
  roundedRect(r.x,r.y,r.w,r.h,14);
  ctx.fill();
  ctx.fillStyle=labelColor;
  ctx.font='800 10px system-ui';
  ctx.textAlign='center';
  ctx.fillText(z.label,r.x+r.w/2,r.y+r.h/2+4);
  ctx.restore();
}

function drawWorker(w) {
  ctx.save();

  const shadowY=w.py+21;
  ctx.globalAlpha=.32;
  ctx.fillStyle='#000';
  ctx.beginPath();ctx.ellipse(w.px,shadowY,24,8,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;

  // body
  const statusColor = w.status==='waiting' ? '#4bd37b' : w.status==='picking' ? '#55a7ff' : '#ff9c48';
  ctx.fillStyle=statusColor;
  roundedRect(w.px-18,w.py+10,36,26,10); ctx.fill();

  // avatar
  ctx.beginPath();ctx.arc(w.px,w.py,23,0,Math.PI*2);ctx.clip();
  if(w.img.complete && w.img.naturalWidth){
    ctx.drawImage(w.img,w.px-23,w.py-23,46,46);
  } else {
    const g=ctx.createLinearGradient(w.px-23,w.py-23,w.px+23,w.py+23);
    g.addColorStop(0,w.fallback[0]); g.addColorStop(1,w.fallback[1]);
    ctx.fillStyle=g; ctx.fillRect(w.px-23,w.py-23,46,46);
    ctx.fillStyle='#fff';ctx.font='800 16px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(w.name[0],w.px,w.py+1);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,.82)';
  ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(w.px,w.py,23,0,Math.PI*2);ctx.stroke();

  ctx.fillStyle='rgba(9,12,17,.86)';
  roundedRect(w.px-35,w.py+40,70,18,9);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='700 10px system-ui';ctx.textAlign='center';
  ctx.fillText(w.name,w.px,w.py+53);

  if(w.order){
    ctx.fillStyle='#f7d84a';
    ctx.beginPath();ctx.arc(w.px+24,w.py-22,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#17170f';ctx.font='900 8px system-ui';
    ctx.fillText(w.order.remaining,w.px+24,w.py-19);
  }
  ctx.restore();
}

function createOrder(manual=false) {
  if (orders.length >= 9) {
    if(manual) showToast('Очередь уже заполнена');
    return;
  }
  const items = Math.floor(4 + Math.random()*12);
  const order = {
    id: nextOrderId++,
    items,
    remaining: items,
    picked: 0,
    status: 'waiting',
    workerId: null,
    created: Date.now(),
    shelfQueue: []
  };
  for(let i=0;i<items;i++) order.shelfQueue.push(Math.floor(Math.random()*shelves.length));
  orders.push(order);
  if(manual) showToast(`Добавлен заказ #${order.id} • ${items} товаров`);
  assignOrders();
}

function assignOrders() {
  const free = workers.filter(w=>w.status==='waiting' && !w.order);
  const waiting = orders.filter(o=>o.status==='waiting');
  while(free.length && waiting.length) {
    const w=free.shift(), o=waiting.shift();
    w.order=o; w.status='picking';
    o.status='picking'; o.workerId=w.id;
    moveToNextShelf(w);
  }
}

function moveToNextShelf(w) {
  const o=w.order;
  if(!o) return;
  if(o.remaining<=0){
    w.status='packing';
    const c=centerOf(packZone);
    w.tx=c.x+(Math.random()-.5)*90; w.ty=c.y+(Math.random()-.5)*20;
    return;
  }
  const idx=o.shelfQueue[o.picked];
  w.targetShelf=idx;
  const r=rectPx(shelves[idx]);
  const side = Math.random()<.5 ? -1 : 1;
  w.tx=r.x+r.w/2;
  w.ty=side<0 ? r.y-28 : r.y+r.h+28;
}

function updateWorker(w, dt) {
  if(w.status==='waiting' && !w.order){
    if(!w.tx || Math.hypot(w.tx-w.px,w.ty-w.py)<12){
      const c=centerOf(startZone);
      w.tx=c.x+(Math.random()-.5)*80;
      w.ty=c.y+(Math.random()-.5)*22;
    }
  }
  const dx=w.tx-w.px, dy=w.ty-w.py, dist=Math.hypot(dx,dy);
  const moveSpeed=85*speed;
  if(dist>4){
    const step=Math.min(dist,moveSpeed*dt);
    w.px+=dx/dist*step;
    w.py+=dy/dist*step;
    return;
  }

  if(w.status==='picking' && w.order){
    w.stageTimer += dt*speed;
    if(w.stageTimer > .52){
      w.stageTimer=0;
      w.order.picked++;
      w.order.remaining--;
      w.completedItems++;
      itemsCollected++;
      moveToNextShelf(w);
    }
  } else if(w.status==='packing' && w.order){
    w.stageTimer += dt*speed;
    if(w.stageTimer > 1.15){
      w.stageTimer=0;
      const o=w.order;
      o.status='done';
      packed += o.items;
      ordersCompleted++;
      w.completedOrders++;
      orders = orders.filter(x=>x.id!==o.id);
      w.order=null;
      w.status='waiting';
      w.targetShelf=null;
      const c=centerOf(startZone);
      w.tx=c.x+(Math.random()-.5)*70; w.ty=c.y;
      assignOrders();
    }
  }
}

function draw() {
  drawFloor();
  shelves.forEach(drawShelf);
  drawZone(startZone,'rgba(75,211,123,.55)','rgba(75,211,123,.055)');
  drawZone(packZone,'rgba(255,156,72,.6)','rgba(255,156,72,.06)');

  // decorative labels
  ctx.fillStyle='rgba(255,255,255,.20)';
  ctx.font='900 10px system-ui';
  ctx.fillText('ДАРКСТОР',W-78,24);

  workers.forEach(drawWorker);
}

function updatePanels() {
  document.getElementById('ordersStat').textContent=ordersCompleted;
  document.getElementById('itemsStat').textContent=itemsCollected;
  document.getElementById('packedStat').textContent=packed;
  document.getElementById('workersCount').textContent=`${workers.length} чел.`;
  document.getElementById('activeOrdersCount').textContent=orders.length;

  const elapsed=Math.floor((Date.now()-startedAt)/1000);
  const mm=String(Math.floor(elapsed/60)).padStart(2,'0');
  const ss=String(elapsed%60).padStart(2,'0');
  document.getElementById('timeStat').textContent=`${mm}:${ss}`;

  document.getElementById('workersList').innerHTML=workers.map(w=>`
    <div class="worker-row">
      <img class="avatar" src="${w.photo}" onerror="this.style.visibility='hidden'">
      <div class="worker-info">
        <b>${w.name}</b>
        <small>${w.role}</small>
      </div>
      <div class="worker-score">
        <b>${w.completedItems}</b>
        <span class="status-pill s-${w.status}">${statusText[w.status]}</span>
      </div>
    </div>
  `).join('');

  const now=Date.now();
  document.getElementById('ordersList').innerHTML=orders.length ? orders.map(o=>{
    const pct=Math.round((o.picked/o.items)*100);
    const worker=workers.find(w=>w.id===o.workerId);
    const secs=Math.floor((now-o.created)/1000);
    return `
      <div class="order-row">
        <div class="order-top"><b>Заказ #${o.id}</b><span>${secs} сек.</span></div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <div class="order-meta">
          <span>${o.picked}/${o.items} товаров</span>
          <span>${worker ? worker.name : 'В очереди'}</span>
        </div>
      </div>`;
  }).join('') : `<div style="padding:22px;color:#778191;text-align:center;font-size:12px">Нет активных заказов</div>`;
}

let last=performance.now();
function loop(now){
  const dt=Math.min(.035,(now-last)/1000); last=now;
  if(!paused){
    workers.forEach(w=>updateWorker(w,dt));
    if(now-lastAutoOrder>3300/speed){
      lastAutoOrder=now;
      createOrder(false);
    }
  }
  draw();
  if((Math.floor(now/180)%2)===0) updatePanels();
  requestAnimationFrame(loop);
}

function showToast(text){
  const el=document.getElementById('toast');
  el.textContent=text; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),1500);
}

document.getElementById('pauseBtn').onclick=()=>{
  paused=!paused;
  document.getElementById('pauseBtn').textContent=paused?'Продолжить':'Пауза';
};
document.getElementById('speedBtn').onclick=(e)=>{
  speed = speed===1 ? 2 : speed===2 ? 3 : 1;
  e.currentTarget.textContent=`x${speed}`;
};
document.getElementById('newOrderBtn').onclick=()=>createOrder(true);

resize();
for(let i=0;i<4;i++) createOrder(false);
requestAnimationFrame(loop);

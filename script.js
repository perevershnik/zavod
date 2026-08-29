const people = [
  {
    name: "Влад",
    photo: "assets/vlad.jpg",
    quote: "Если мигдаль может стать молоком, то ты сможешь вообще всё! 🥛"
  },
  {
    name: "Женя",
    photo: "assets/zhenya.jpg",
    quote: "Если товар не нашёлся — возможно, он просто не был готов к встрече с тобой."
  },
  {
    name: "Алина",
    photo: "assets/alina.jpg",
    quote: "Ты не опоздала. Просто смена начала работать слишком рано."
  },
  {
    name: "Дима",
    photo: "assets/dima.jpg",
    quote: "Твоя результативность настолько высокая, что калькулятор просит перекур."
  },
  {
    name: "Саша",
    photo: "assets/sasha.jpg",
    quote: "Сегодня ты выглядишь как человек, который точно знает, где лежит Nutella."
  }
];

const arena = document.getElementById("arena");
const modal = document.getElementById("quoteModal");
const quotePhoto = document.getElementById("quotePhoto");
const quoteName = document.getElementById("quoteName");
const quoteText = document.getElementById("quoteText");
const randomBtn = document.getElementById("randomBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const closeQuote = document.getElementById("closeQuote");

let W = innerWidth;
let H = innerHeight;
let balls = [];
let paused = false;
let last = performance.now();

const palette = ["#6675ff","#d15eff","#ff6d91","#39c0aa","#f0d543","#ff944d"];

function safeBounds() {
  return {
    left: 8,
    right: W - 8,
    top: Math.max(96, (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sat")) || 0) + 90),
    bottom: H - 86
  };
}

function createPerson(p, i) {
  const el = document.createElement("button");
  el.className = "person";
  el.setAttribute("aria-label", p.name);

  const img = document.createElement("img");
  img.src = p.photo;
  img.alt = p.name;
  img.onerror = () => {
    img.remove();
    el.style.background = `linear-gradient(135deg, ${palette[i%palette.length]}, #222a37)`;
    el.insertAdjacentHTML("afterbegin",
      `<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:28px;font-weight:900;color:#fff">${p.name[0]}</div>`
    );
  };

  const name = document.createElement("div");
  name.className = "person-name";
  name.textContent = p.name;

  el.append(img, name);
  arena.appendChild(el);

  const size = window.innerWidth <= 380 ? 72 : 82;
  const b = safeBounds();

  const ball = {
    el, person:p, size,
    x: b.left + Math.random() * Math.max(20, (b.right-b.left-size)),
    y: b.top + Math.random() * Math.max(20, (b.bottom-b.top-size)),
    vx: (Math.random() < .5 ? -1 : 1) * (22 + Math.random()*26),
    vy: (Math.random() < .5 ? -1 : 1) * (18 + Math.random()*24),
    dragging:false,
    moved:false,
    px:0, py:0
  };

  el.addEventListener("pointerdown", e => {
    ball.dragging = true;
    ball.moved = false;
    ball.px = e.clientX;
    ball.py = e.clientY;
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", e => {
    if (!ball.dragging) return;
    const dx = e.clientX - ball.px;
    const dy = e.clientY - ball.py;
    if (Math.abs(dx)+Math.abs(dy) > 3) ball.moved = true;
    ball.x += dx;
    ball.y += dy;
    ball.vx = dx * 6;
    ball.vy = dy * 6;
    ball.px = e.clientX;
    ball.py = e.clientY;
  });

  el.addEventListener("pointerup", () => {
    ball.dragging = false;
    if (!ball.moved) showQuote(p);
  });

  return ball;
}

function resolveCollisions() {
  for (let i=0;i<balls.length;i++) {
    for (let j=i+1;j<balls.length;j++) {
      const a=balls[i], b=balls[j];
      const ax=a.x+a.size/2, ay=a.y+a.size/2;
      const bx=b.x+b.size/2, by=b.y+b.size/2;
      const dx=bx-ax, dy=by-ay;
      const dist=Math.hypot(dx,dy) || 1;
      const min=(a.size+b.size)/2 - 6;
      if (dist<min) {
        const nx=dx/dist, ny=dy/dist;
        const overlap=(min-dist)/2;
        a.x-=nx*overlap; a.y-=ny*overlap;
        b.x+=nx*overlap; b.y+=ny*overlap;
        const av=a.vx*nx+a.vy*ny;
        const bv=b.vx*nx+b.vy*ny;
        const impulse=bv-av;
        a.vx+=impulse*nx*.82; a.vy+=impulse*ny*.82;
        b.vx-=impulse*nx*.82; b.vy-=impulse*ny*.82;
      }
    }
  }
}

function tick(now) {
  const dt=Math.min(.033,(now-last)/1000);
  last=now;
  W=innerWidth; H=innerHeight;
  const b=safeBounds();

  if (!paused) {
    for (const ball of balls) {
      if (!ball.dragging) {
        ball.x += ball.vx*dt;
        ball.y += ball.vy*dt;

        if (ball.x < b.left) { ball.x=b.left; ball.vx=Math.abs(ball.vx); }
        if (ball.x+ball.size > b.right) { ball.x=b.right-ball.size; ball.vx=-Math.abs(ball.vx); }
        if (ball.y < b.top) { ball.y=b.top; ball.vy=Math.abs(ball.vy); }
        if (ball.y+ball.size > b.bottom) { ball.y=b.bottom-ball.size; ball.vy=-Math.abs(ball.vy); }

        ball.vx *= .999;
        ball.vy *= .999;

        const speed=Math.hypot(ball.vx,ball.vy);
        if (speed<20) {
          ball.vx*=1.01;
          ball.vy*=1.01;
        }
      }
    }
    resolveCollisions();
  }

  for (const ball of balls) {
    ball.el.style.transform=`translate3d(${ball.x}px,${ball.y}px,0)`;
  }

  requestAnimationFrame(tick);
}

function showQuote(p) {
  paused=true;
  quoteName.textContent=p.name;
  quoteText.textContent=p.quote;
  quotePhoto.src=p.photo;
  quotePhoto.alt=p.name;
  quotePhoto.onerror=()=>{ quotePhoto.style.visibility="hidden"; };
  quotePhoto.onload=()=>{ quotePhoto.style.visibility="visible"; };
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  if (navigator.vibrate) navigator.vibrate(18);
}

function hideQuote() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  paused=false;
}

modal.addEventListener("click", e => {
  if (e.target === modal || e.target === closeQuote || e.target.classList.contains("tap-hint")) hideQuote();
});
closeQuote.addEventListener("click", hideQuote);

randomBtn.addEventListener("click", () => {
  const p=people[Math.floor(Math.random()*people.length)];
  showQuote(p);
});

shuffleBtn.addEventListener("click", () => {
  for (const b of balls) {
    b.vx=(Math.random()<.5?-1:1)*(45+Math.random()*55);
    b.vy=(Math.random()<.5?-1:1)*(35+Math.random()*45);
  }
  if (navigator.vibrate) navigator.vibrate(25);
});

window.addEventListener("resize", () => {
  W=innerWidth; H=innerHeight;
});

balls = people.map(createPerson);
requestAnimationFrame(tick);

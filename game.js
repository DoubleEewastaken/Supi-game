// game.js - top-down survival using your uploaded PNGs
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // FILE NAMES (match what you uploaded)
  const FILES = {
    player: './player.png',
    tree:   './tree.png',
    rock:   './rock.png',
    berry:  './berry.png',
    water:  './water.png',    // if not present, fallback drawn circle
    campfire: './campfire.png'
  };

  // game state
  const player = {
    x: canvas.width/2, y: canvas.height/2,
    size: 20, speed: 3.6,
    health:100, hunger:100, thirst:100,
    wood:0, stone:0, reach:64
  };

  const entities = {
    trees: [], rocks: [], berries: [], waters: [], campfires: []
  };

  // input
  const keys = {};
  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

  // HUD helpers
  const el = {
    health: document.getElementById('health'),
    hunger: document.getElementById('hunger'),
    thirst: document.getElementById('thirst'),
    wood: document.getElementById('wood'),
    stone: document.getElementById('stone'),
    campfires: document.getElementById('campfires')
  };

  // images
  const imgs = {};
  let imgLoaded = 0, imgCount = Object.keys(FILES).length;
  function loadImages(cb){
    for(const k in FILES){
      imgs[k] = new Image();
      imgs[k].src = FILES[k];
      imgs[k].onload = () => { imgLoaded++; if(imgLoaded>=imgCount) cb(); };
      imgs[k].onerror = ()=>{ // fallback: mark loaded anyway
        imgLoaded++; if(imgLoaded>=imgCount) cb();
      };
    }
  }

  // spawn helpers
  function rand(min,max){ return Math.random()*(max-min)+min; }
  function spawnTrees(n=10){ for(let i=0;i<n;i++){ entities.trees.push({x:rand(40,canvas.width-40), y:rand(40,canvas.height-40), hp:2}); } }
  function spawnRocks(n=8){ for(let i=0;i<n;i++){ entities.rocks.push({x:rand(40,canvas.width-40), y:rand(40,canvas.height-40), hp:3}); } }
  function spawnBerries(n=18){ for(let i=0;i<n;i++){ entities.berries.push({x:rand(20,canvas.width-20), y:rand(20,canvas.height-20)}); } }
  function spawnWaters(n=4){ for(let i=0;i<n;i++){ entities.waters.push({x:rand(80,canvas.width-80), y:rand(80,canvas.height-80), r:rand(28,56)}); } }

  // initial spawn
  function populateAll(){ spawnTrees(12); spawnRocks(10); spawnBerries(24); spawnWaters(5); }

  // utility distance
  function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }

  // interactions
  function chopAction(){
    for(let i=entities.trees.length-1;i>=0;i--){
      const t = entities.trees[i];
      if(dist(player, t) < player.reach){
        t.hp--;
        if(t.hp <= 0){
          // drop wood
          player.wood += 1;
          entities.trees.splice(i,1);
        }
      }
    }
  }

  function mineAction(){
    for(let i=entities.rocks.length-1;i>=0;i--){
      const r = entities.rocks[i];
      if(dist(player, r) < player.reach){
        r.hp--;
        if(r.hp <= 0){
          player.stone += 1;
          entities.rocks.splice(i,1);
        }
      }
    }
  }

  function craftCampfire(){
    if(player.wood >= 2 && player.stone >= 1){
      player.wood -= 2; player.stone -= 1;
      entities.campfires.push({x: player.x + rand(-40,40), y: player.y + rand(-40,40)});
    }
  }

  // main update loop
  let lastTime = performance.now();
  function update(now){
    const dt = Math.min(0.06, (now - lastTime)/1000);
    lastTime = now;

    // movement WASD
    let mvx=0,mvy=0;
    if(keys['w']||keys['arrowup']) mvy -= 1;
    if(keys['s']||keys['arrowdown']) mvy += 1;
    if(keys['a']||keys['arrowleft']) mvx -= 1;
    if(keys['d']||keys['arrowright']) mvx += 1;
    const mlen = Math.hypot(mvx,mvy) || 1;
    player.x += (mvx/mlen) * player.speed * (1 + Math.min(0.6, player.hunger/100)) * dt * 60;
    player.y += (mvy/mlen) * player.speed * (1 + Math.min(0.6, player.hunger/100)) * dt * 60;
    // clamp
    player.x = Math.max(12, Math.min(canvas.width-12, player.x));
    player.y = Math.max(12, Math.min(canvas.height-12, player.y));

    // actions
    if(keys['x']) { chopAction(); }   // chop
    if(keys['z']) { mineAction(); }   // mine
    if(keys['c']) { craftCampfire(); keys['c'] = false; } // craft (single press)

    // pick up berries within reach (auto)
    for(let i=entities.berries.length-1;i>=0;i--){
      if(dist(player, entities.berries[i]) < player.reach*0.7){
        player.hunger = Math.min(100, player.hunger + 22);
        entities.berries.splice(i,1);
      }
    }

    // drink while inside water pool (refill gradually)
    for(const w of entities.waters){
      const d = Math.hypot(player.x - w.x, player.y - w.y);
      if(d < w.r + 6){
        player.thirst = Math.min(100, player.thirst + 30 * dt); // fast-ish refill
      }
    }

    // campfire healing if near
    for(const f of entities.campfires){
      if(dist(player,f) < 72){
        player.health = Math.min(100, player.health + 8 * dt);
      }
    }

    // natural decay
    player.hunger = Math.max(0, player.hunger - 6 * dt);   // ~6 per sec scale => tweakable
    player.thirst = Math.max(0, player.thirst - 9 * dt);

    // health loss only when hunger or thirst is zero
    if(player.hunger <= 0 || player.thirst <= 0){
      // faster loss when both are zero
      const deficit = (player.hunger<=0 && player.thirst<=0) ? 1.2 : 0.6;
      player.health = Math.max(0, player.health - 6 * dt * deficit);
    }

    // respawn small amounts if low
    if(entities.berries.length < 10 && Math.random() < dt*0.9) entities.berries.push({x:rand(20,canvas.width-20), y:rand(20,canvas.height-20)});
    if(entities.trees.length < 6 && Math.random() < dt*0.2) spawnTrees(1);
    if(entities.rocks.length < 5 && Math.random() < dt*0.2) spawnRocks(1);
    if(entities.waters.length < 3 && Math.random() < dt*0.03) spawnWaters(1);

    // update HUD
    el.health.textContent = Math.floor(player.health);
    el.hunger.textContent = Math.floor(player.hunger);
    el.thirst.textContent = Math.floor(player.thirst);
    el.wood.textContent = player.wood;
    el.stone.textContent = player.stone;
    el.campfires.textContent = entities.campfires.length;

    // game over check (stops further negative drift but doesn't freeze UI)
    if(player.health <= 0){
      // clamp and stop active actions
      player.health = 0;
      // clear movement keys (so you stop moving)
      for(const k of ['w','a','s','d']) keys[k] = false;
    }

    // draw after update
    draw();
    requestAnimationFrame(update);
  }

  // drawing
  function draw(){
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // grass background (subtle grid)
    ctx.fillStyle = '#3aa24a';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // draw water pools
    for(const w of entities.waters){
      if(imgs.water && imgs.water.complete && imgs.water.naturalWidth) {
        ctx.drawImage(imgs.water, w.x - w.r, w.y - w.r, w.r*2, w.r*2);
      } else {
        ctx.beginPath(); ctx.fillStyle='rgba(30,120,255,0.85)'; ctx.arc(w.x,w.y,w.r,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.arc(w.x - w.r*0.2, w.y - w.r*0.2, w.r*0.6,0,Math.PI*2); ctx.fill();
      }
    }

    // trees
    for(const t of entities.trees){
      if(imgs.tree && imgs.tree.complete && imgs.tree.naturalWidth) {
        ctx.drawImage(imgs.tree, t.x-28, t.y-34, 56, 68);
      } else {
        ctx.fillStyle='#6b3d18'; ctx.fillRect(t.x-6, t.y+6, 12, 18);
        ctx.beginPath(); ctx.fillStyle='#0d7a2f'; ctx.arc(t.x, t.y, 24, 0, Math.PI*2); ctx.fill();
      }
    }

    // rocks
    for(const r of entities.rocks){
      if(imgs.rock && imgs.rock.complete && imgs.rock.naturalWidth) {
        ctx.drawImage(imgs.rock, r.x-20, r.y-20, 40, 40);
      } else {
        ctx.fillStyle='#7f7f80'; ctx.beginPath(); ctx.ellipse(r.x, r.y, 18, 14, 0, 0, Math.PI*2); ctx.fill();
      }
    }

    // berries
    for(const b of entities.berries){
      if(imgs.berry && imgs.berry.complete && imgs.berry.naturalWidth) {
        ctx.drawImage(imgs.berry, b.x-12, b.y-12, 24, 24);
      } else {
        ctx.fillStyle='crimson'; ctx.beginPath(); ctx.arc(b.x,b.y,8,0,Math.PI*2); ctx.fill();
      }
    }

    // campfires
    for(const c of entities.campfires){
      if(imgs.campfire && imgs.campfire.complete && imgs.campfire.naturalWidth) {
        ctx.drawImage(imgs.campfire, c.x-18, c.y-18, 36,36);
      } else {
        ctx.fillStyle='orange'; ctx.beginPath(); ctx.arc(c.x,c.y,10,0,Math.PI*2); ctx.fill();
      }
    }

    // player
    if(imgs.player && imgs.player.complete && imgs.player.naturalWidth){
      ctx.drawImage(imgs.player, player.x - 20, player.y - 22, 40, 44);
    } else {
      ctx.beginPath(); ctx.fillStyle='dodgerblue'; ctx.arc(player.x, player.y, player.size, 0, Math.PI*2); ctx.fill();
    }

    // optional: debug reach circle
    // ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.arc(player.x, player.y, player.reach,0,Math.PI*2); ctx.stroke();
  }

  // start game after images attempt to load, then populate and start loop
  loadImages(() => { populateAll(); lastTime = performance.now(); requestAnimationFrame(update); });

})();

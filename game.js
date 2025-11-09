const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  x: 450,
  y: 300,
  size: 20,
  health: 100,
  hunger: 100,
  thirst: 100,
  wood: 0,
  stone: 0,
  reach: 50,
  speed: 4,
};

let berries = [], waters = [], trees = [], rocks = [], campfires = [];

// preload images
const images = {};
const imageFiles = ["tree", "rock", "berry", "water", "campfire", "player"];
imageFiles.forEach((name) => {
  images[name] = new Image();
  images[name].src = `assets/${name}.png`;
});

function rand(min, max) { return Math.random() * (max - min) + min; }

function makeBerry() { return { x: rand(0, canvas.width), y: rand(0, canvas.height), size: 12 }; }
function makeWater() { return { x: rand(0, canvas.width), y: rand(0, canvas.height), size: 35 }; }
function makeTree() { return { x: rand(0, canvas.width), y: rand(0, canvas.height), hp: 2 }; }
function makeRock() { return { x: rand(0, canvas.width), y: rand(0, canvas.height), hp: 3 }; }

for (let i = 0; i < 15; i++) berries.push(makeBerry());
for (let i = 0; i < 5; i++) waters.push(makeWater());
for (let i = 0; i < 8; i++) trees.push(makeTree());
for (let i = 0; i < 8; i++) rocks.push(makeRock());

const keys = {};
document.addEventListener("keydown", (e) => (keys[e.key] = true));
document.addEventListener("keyup", (e) => (keys[e.key] = false));

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function update() {
  // movement
  if (keys.w) player.y -= player.speed;
  if (keys.s) player.y += player.speed;
  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;

  // chop tree
  if (keys.x) {
    trees.forEach((t) => {
      if (dist(player, t) < player.reach && t.hp > 0) {
        t.hp--;
        if (t.hp <= 0) {
          player.wood++;
          t.x = -999;
        }
      }
    });
  }

  // mine rock
  if (keys.z) {
    rocks.forEach((r) => {
      if (dist(player, r) < player.reach && r.hp > 0) {
        r.hp--;
        if (r.hp <= 0) {
          player.stone++;
          r.x = -999;
        }
      }
    });
  }

  // craft campfire
  if (keys.c && player.wood >= 2 && player.stone >= 1) {
    campfires.push({ x: player.x, y: player.y });
    player.wood -= 2;
    player.stone -= 1;
  }

  // eat berries
  berries = berries.filter((b) => {
    if (dist(player, b) < player.reach) {
      player.hunger = Math.min(100, player.hunger + 20);
      return false;
    }
    return true;
  });

  // drink water
  waters.forEach((w) => {
    if (dist(player, w) < w.size) {
      player.thirst = Math.min(100, player.thirst + 0.3);
    }
  });

  // decay stats
  player.hunger -= 0.02;
  player.thirst -= 0.03;

  if (player.hunger <= 0 || player.thirst <= 0) {
    player.health -= 0.1;
  } else if (nearCampfire()) {
    player.health = Math.min(100, player.health + 0.05);
  }

  // respawn some berries/water
  if (Math.random() < 0.01) berries.push(makeBerry());
  if (Math.random() < 0.002) waters.push(makeWater());

  updateHUD();
}

function nearCampfire() {
  return campfires.some((c) => dist(player, c) < 60);
}

function updateHUD() {
  document.getElementById("health").textContent = Math.floor(player.health);
  document.getElementById("hunger").textContent = Math.floor(player.hunger);
  document.getElementById("thirst").textContent = Math.floor(player.thirst);
  document.getElementById("wood").textContent = player.wood;
  document.getElementById("stone").textContent = player.stone;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw water
  waters.forEach((w) => {
    ctx.drawImage(images.water, w.x - 35, w.y - 35, 70, 70);
  });

  // draw berries
  berries.forEach((b) => {
    ctx.drawImage(images.berry, b.x - 12, b.y - 12, 24, 24);
  });

  // draw trees
  trees.forEach((t) => {
    ctx.drawImage(images.tree, t.x - 20, t.y - 20, 40, 40);
  });

  // draw rocks
  rocks.forEach((r) => {
    ctx.drawImage(images.rock, r.x - 20, r.y - 20, 40, 40);
  });

  // draw campfires
  campfires.forEach((c) => {
    ctx.drawImage(images.campfire, c.x - 15, c.y - 15, 30, 30);
  });

  // draw player
  ctx.drawImage(images.player, player.x - 20, player.y - 20, 40, 40);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();


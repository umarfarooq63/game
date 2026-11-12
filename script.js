const welcomeScreen = document.getElementById('welcomeScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreValue = document.getElementById('scoreValue');
const livesValue = document.getElementById('livesValue');
const levelValue = document.getElementById('levelValue');
const bestValue = document.getElementById('bestValue');

const settings = {
  easy: { enemySpeed: 1.15, spawnRate: 1050, lives: 5 },
  medium: { enemySpeed: 1.75, spawnRate: 820, lives: 3 },
  hard: { enemySpeed: 2.45, spawnRate: 620, lives: 2 }
};

let player, bullets, enemies, particles, stars, keys, score, lives, level;
let running = false, paused = false, lastTime = 0, spawnTimer = 0;
let difficulty = 'medium', animationId = null;
let bestScore = Number(localStorage.getItem('orbitZeroBest') || 0);
bestValue.textContent = formatScore(bestScore);

function formatScore(number) { return String(number).padStart(4, '0'); }
function showScreen(screen) {
  [welcomeScreen, gameScreen, gameOverScreen].forEach(item => item.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function startGame() {
  difficulty = document.getElementById('difficulty').value;
  const config = settings[difficulty];
  player = { x: canvas.width / 2, y: canvas.height - 62, w: 42, h: 48, speed: 5.2, cooldown: 0, invincible: 0 };
  bullets = []; enemies = []; particles = []; stars = [];
  for (let i = 0; i < 95; i++) stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 1.8 + .3, speed: Math.random() * 1.2 + .3 });
  keys = {};
  score = 0; lives = config.lives; level = 1; spawnTimer = 0; lastTime = 0;
  running = true; paused = false;
  updateHud();
  document.getElementById('pauseOverlay').classList.add('hidden');
  document.getElementById('pauseButton').innerHTML = 'Ⅱ <span>PAUSE</span>';
  showScreen(gameScreen);
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function updateHud() {
  scoreValue.textContent = formatScore(score);
  livesValue.textContent = '♥ '.repeat(lives).trim() || '—';
  levelValue.textContent = String(level).padStart(2, '0');
  bestValue.textContent = formatScore(bestScore);
}

function drawBackground(delta) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#08132e'); gradient.addColorStop(1, '#050918');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#d8f6ff';
  stars.forEach(star => {
    star.y += star.speed * delta * .045;
    if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
    ctx.globalAlpha = .35 + star.size / 3;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(91,151,221,.07)'; ctx.lineWidth = 1;
  for (let y = 80; y < canvas.height; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(Date.now() / 90) % 2 === 0) return;
  ctx.save(); ctx.translate(player.x, player.y);
  ctx.shadowColor = '#65e9f3'; ctx.shadowBlur = 18;
  ctx.fillStyle = '#67e5ee';
  ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(21,20); ctx.lineTo(0,12); ctx.lineTo(-21,20); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e7ffff'; ctx.beginPath(); ctx.moveTo(0,-15); ctx.lineTo(7,8); ctx.lineTo(-7,8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffbd72'; ctx.beginPath(); ctx.moveTo(-6,17); ctx.lineTo(0,31 + Math.random()*7); ctx.lineTo(6,17); ctx.fill();
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.shadowColor = '#ff5d88'; ctx.shadowBlur = 13;
  ctx.fillStyle = enemy.color;
  ctx.beginPath(); ctx.moveTo(0,22); ctx.lineTo(-22,-13); ctx.lineTo(-7,-8); ctx.lineTo(0,-19); ctx.lineTo(7,-8); ctx.lineTo(22,-13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffe1ed'; ctx.fillRect(-4,-5,8,5);
  ctx.restore();
}

function shoot() {
  if (player.cooldown <= 0) {
    bullets.push({ x: player.x, y: player.y - 25, w: 5, h: 16, speed: 8.5 });
    player.cooldown = 210;
  }
}

function spawnEnemy() {
  const size = 30 + Math.random() * 12;
  enemies.push({ x: 35 + Math.random() * (canvas.width - 70), y: -30, w: size, h: size, speed: settings[difficulty].enemySpeed + Math.random() * .8 + (level - 1) * .18, color: Math.random() > .5 ? '#ff668e' : '#b18cff' });
}

function addExplosion(x, y, color = '#75eff2') {
  for (let i = 0; i < 13; i++) particles.push({ x, y, vx: (Math.random()-.5)*5, vy: (Math.random()-.5)*5, life: 420, color });
}

function overlaps(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function update(delta) {
  const step = Math.min(delta / 16.67, 2.2);
  if (keys.ArrowLeft || keys.a) player.x -= player.speed * step;
  if (keys.ArrowRight || keys.d) player.x += player.speed * step;
  if (keys.ArrowUp || keys.w) player.y -= player.speed * step;
  if (keys.ArrowDown || keys.s) player.y += player.speed * step;
  player.x = Math.max(24, Math.min(canvas.width - 24, player.x));
  player.y = Math.max(35, Math.min(canvas.height - 30, player.y));
  player.cooldown -= delta; player.invincible = Math.max(0, player.invincible - delta);
  if (keys.Space) shoot();

  bullets.forEach(b => b.y -= b.speed * step);
  bullets = bullets.filter(b => b.y > -20);
  spawnTimer += delta;
  if (spawnTimer > Math.max(300, settings[difficulty].spawnRate - (level - 1) * 45)) { spawnEnemy(); spawnTimer = 0; }
  enemies.forEach(e => e.y += e.speed * step);

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    let destroyed = false;
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (overlaps({x:enemy.x,y:enemy.y,w:enemy.w,h:enemy.h},{x:bullets[j].x,y:bullets[j].y,w:bullets[j].w,h:bullets[j].h})) {
        addExplosion(enemy.x, enemy.y, enemy.color); enemies.splice(i,1); bullets.splice(j,1);
        score += 10; destroyed = true; break;
      }
    }
    if (destroyed) continue;
    if (enemy.y > canvas.height + 25) { enemies.splice(i,1); continue; }
    if (player.invincible <= 0 && overlaps({x:player.x,y:player.y,w:player.w,h:player.h},{x:enemy.x,y:enemy.y,w:enemy.w,h:enemy.h})) {
      enemies.splice(i,1); addExplosion(player.x, player.y, '#ff7d9c'); lives--; player.invincible = 1200;
      if (lives <= 0) { endGame(); return; }
    }
  }
  particles.forEach(p => { p.x += p.vx * step; p.y += p.vy * step; p.life -= delta; });
  particles = particles.filter(p => p.life > 0);
  const newLevel = Math.floor(score / 100) + 1;
  if (newLevel !== level) level = newLevel;
  updateHud();
}

function render(delta) {
  drawBackground(delta);
  bullets.forEach(b => { ctx.fillStyle = '#7af7ff'; ctx.shadowColor = '#7af7ff'; ctx.shadowBlur = 12; ctx.fillRect(b.x-2,b.y,b.w,b.h); });
  ctx.shadowBlur = 0;
  enemies.forEach(drawEnemy);
  particles.forEach(p => { ctx.globalAlpha = Math.max(0,p.life/420); ctx.fillStyle = p.color; ctx.fillRect(p.x,p.y,4,4); });
  ctx.globalAlpha = 1;
  drawPlayer();
}

function gameLoop(timestamp) {
  if (!running || paused) return;
  const delta = lastTime ? timestamp - lastTime : 16.67;
  lastTime = timestamp;
  update(delta); render(delta);
  if (running) animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
  running = false; cancelAnimationFrame(animationId);
  if (score > bestScore) { bestScore = score; localStorage.setItem('orbitZeroBest', String(bestScore)); }
  document.getElementById('finalScore').textContent = formatScore(score);
  document.getElementById('resultBest').textContent = formatScore(bestScore);
  document.getElementById('resultLevel').textContent = String(level).padStart(2,'0');
  document.getElementById('resultTitle').textContent = score >= 200 ? 'GALAXY DEFENDED' : 'MISSION ENDED';
  document.getElementById('resultMessage').textContent = score >= 200 ? 'Outstanding flying, pilot. Your score is recorded.' : 'Every pilot learns from each mission. Ready for another run?';
  showScreen(gameOverScreen);
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  document.getElementById('pauseOverlay').classList.toggle('hidden', !paused);
  document.getElementById('pauseButton').innerHTML = paused ? '▶ <span>RESUME</span>' : 'Ⅱ <span>PAUSE</span>';
  if (!paused) { lastTime = 0; animationId = requestAnimationFrame(gameLoop); }
  else cancelAnimationFrame(animationId);
}

document.addEventListener('keydown', event => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyP' && running) { togglePause(); return; }
  keys[event.code === 'Space' ? 'Space' : event.key] = true;
});
document.addEventListener('keyup', event => { keys[event.code === 'Space' ? 'Space' : event.key] = false; });
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('pauseButton').addEventListener('click', togglePause);
document.getElementById('resumeButton').addEventListener('click', togglePause);
document.getElementById('playAgainButton').addEventListener('click', startGame);
document.getElementById('homeButton').addEventListener('click', () => { running = false; cancelAnimationFrame(animationId); showScreen(welcomeScreen); });

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const depthDisplay = document.getElementById("depth");
const bestDepthDisplay = document.getElementById("bestDepth");
const runPearlsDisplay = document.getElementById("runPearls");
const totalPearlsDisplay = document.getElementById("totalPearls");
const startScreen = document.getElementById("startScreen");
const encyclopediaScreen = document.getElementById("encyclopediaScreen");
const encyclopediaGrid = document.getElementById("encyclopediaGrid");
const gameOverScreen = document.getElementById("gameOverScreen");
const discoveryToast = document.getElementById("discoveryToast");
const resultText = document.getElementById("resultText");
const startButton = document.getElementById("startButton");
const encyclopediaButton = document.getElementById("encyclopediaButton");
const bookBackButton = document.getElementById("bookBackButton");
const restartButton = document.getElementById("restartButton");
const titleButton = document.getElementById("titleButton");
const homeButton = document.getElementById("homeButton");
const pauseButton = document.getElementById("pauseButton");
const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const mofuButtons = document.querySelectorAll(".mofu-option");

const SAVE_KEY = "yuttari-shinkai-sanpo";
const PX_PER_METER = 72;
const BUBBLE_LIMIT_METERS = 10;
const MAX_BUBBLE_LAYERS = 5;
const DISCOVERY_CHECK_METERS = 18;
const assets = {
  gameBackground: loadImage("../image/gamehaikei_migihidari.png"),
  jellyfish: loadImage("../image/kurage.png"),
  mofu: {
    gray: loadImage("../image/mof‗gray.png"),
    beige: loadImage("../image/mof_beige.png")
  }
};
const platformSizes = [
  { name: "small", width: 94, height: 20, pearlChance: 0 },
  { name: "medium", width: 132, height: 24, pearlChance: 0 },
  { name: "large", width: 178, height: 30, pearlChance: 0.36 }
];

const encyclopediaTabs = [
  { id: "shallow", label: "0〜300m", min: 0, max: 300 },
  { id: "middle", label: "301〜500m", min: 301, max: 500 },
  { id: "deep", label: "501〜1000m", min: 501, max: 1000 },
  { id: "special", label: "特別", min: 1001, max: Infinity }
];

const encyclopediaData = {
  shallow: [
    { id: "mizukurage", name: "ミズクラゲ", icon: "🪼" },
    { id: "kumanomi", name: "クマノミ", icon: "🐠" },
    { id: "chin-anago", name: "チンアナゴ", icon: "〰️" },
    { id: "hitode", name: "ヒトデ", icon: "⭐" },
    { id: "small-shell", name: "小さな貝", icon: "🐚" }
  ],
  middle: [
    { id: "glow-jelly", name: "光るクラゲ", icon: "🪼" },
    { id: "hotaruika", name: "ホタルイカ", icon: "🦑" },
    { id: "blue-fish", name: "青い小魚", icon: "🐟" },
    { id: "pearl-shell", name: "真珠貝", icon: "🦪" },
    { id: "sea-sparkle", name: "海のきらめき", icon: "✨" }
  ],
  deep: [
    { id: "angler", name: "チョウチンアンコウ", icon: "🐟" },
    { id: "deep-jelly", name: "深海クラゲ", icon: "🪼" },
    { id: "giant-squid", name: "ダイオウイカ", icon: "🦑" },
    { id: "glow-shell", name: "光る貝", icon: "🐚" },
    { id: "quiet-bubble", name: "静かな泡", icon: "🫧" }
  ],
  special: [
    { id: "ryugu-castle", name: "竜宮城", icon: "🏯" },
    { id: "ryugu-pearl", name: "龍宮真珠", icon: "💎" }
  ]
};

const keys = {
  left: false,
  right: false,
  touch: null
};

const save = loadSave();

const game = {
  width: 390,
  height: 720,
  state: "start",
  depth: 0,
  runPearls: 0,
  savedDepth: 0,
  bubbleBroken: false,
  bubbleLayers: 1,
  nextSpecialDepth: 50,
  nextDiscoveryDepth: 0,
  bookTab: "shallow",
  toastTimer: 0,
  cameraY: 0,
  lastTime: 0,
  platforms: [],
  particles: []
};

const player = {
  x: 195,
  y: 150,
  radius: 28,
  hitRadius: 20,
  mofu: "gray",
  vx: 0,
  vy: 0,
  driftDirection: 0,
  driftTime: 0,
  lastInput: 0,
  safeDepth: 0,
  squish: 0,
  blink: 0
};

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function loadSave() {
  try {
    const loaded = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
    return {
      bestDepth: Number(loaded.bestDepth) || 0,
      pearls: Number(loaded.pearls) || 0,
      discovered: Array.isArray(loaded.discovered) ? loaded.discovered : []
    };
  } catch {
    return { bestDepth: 0, pearls: 0, discovered: [] };
  }
}

function saveProgress() {
  save.bestDepth = Math.max(save.bestDepth, game.depth);
  game.savedDepth = save.bestDepth;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Saving is optional; the game still works if storage is unavailable.
  }
}

function updateHud() {
  depthDisplay.textContent = `${game.depth}m`;
  bestDepthDisplay.textContent = `${Math.max(save.bestDepth, game.depth)}m`;
  runPearlsDisplay.textContent = `${game.runPearls}`;
  totalPearlsDisplay.textContent = `${save.pearls}`;
}

function isDiscovered(creature) {
  return save.discovered.includes(creature.id);
}

function discoverCreature(creature) {
  if (isDiscovered(creature)) {
    return false;
  }

  save.discovered.push(creature.id);
  saveProgress();
  renderEncyclopedia();
  showDiscoveryToast(creature);
  return true;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  game.width = rect.width;
  game.height = rect.height;
}

function selectMofu(type) {
  player.mofu = type;
  for (const button of mofuButtons) {
    const selected = button.dataset.mofu === type;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }
}

function showTitleScreen() {
  game.state = "start";
  game.bubbleBroken = false;
  gameOverScreen.classList.add("hidden");
  encyclopediaScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  pauseButton.textContent = "II";
  keys.left = false;
  keys.right = false;
  keys.touch = null;
  draw();
}

function showEncyclopedia() {
  game.state = "book";
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  encyclopediaScreen.classList.remove("hidden");
  renderEncyclopedia();
}

function renderEncyclopedia() {
  if (!encyclopediaGrid) {
    return;
  }

  for (const button of document.querySelectorAll(".book-tab")) {
    const selected = button.dataset.tab === game.bookTab;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }

  const creatures = encyclopediaData[game.bookTab] || [];
  encyclopediaGrid.innerHTML = "";

  for (let i = 0; i < 15; i += 1) {
    const creature = creatures[i];
    const cell = document.createElement("div");
    cell.className = "book-cell";

    if (creature && isDiscovered(creature)) {
      cell.innerHTML = `<span class="book-icon">${creature.icon}</span><span class="book-name">${creature.name}</span>`;
    } else {
      cell.classList.add("undiscovered");
      cell.innerHTML = `<span class="book-icon">?</span><span class="book-name">？？？</span>`;
    }

    encyclopediaGrid.appendChild(cell);
  }
}

function resetGame() {
  player.x = game.width / 2;
  player.y = 130;
  player.vx = 0;
  player.vy = 0.55;
  player.driftDirection = 0;
  player.driftTime = 0;
  player.lastInput = 0;
  player.safeDepth = Math.floor(player.y / PX_PER_METER);
  player.squish = 0;
  game.depth = 0;
  game.runPearls = 0;
  game.savedDepth = save.bestDepth;
  game.bubbleBroken = false;
  game.bubbleLayers = 1;
  game.nextSpecialDepth = 50;
  game.nextDiscoveryDepth = 8;
  game.cameraY = 0;
  game.platforms = [];
  game.particles = [];
  game.state = "playing";
  game.lastTime = performance.now();

  for (let i = 0; i < 5; i += 1) {
    addPlatform(170 + i * 5 * PX_PER_METER, i === 0 ? game.width / 2 : undefined, i === 0 ? "large" : undefined);
  }

  for (let i = 0; i < 42; i += 1) {
    game.particles.push(makeBubble(Math.random() * game.width, Math.random() * game.height));
  }

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  pauseButton.textContent = "II";
  updateHud();
}

function randomPlatformSize(forcedName) {
  if (forcedName) {
    return platformSizes.find((size) => size.name === forcedName);
  }

  const roll = Math.random();
  if (roll < 0.25) return platformSizes[0];
  if (roll < 0.72) return platformSizes[1];
  return platformSizes[2];
}

function addPlatform(y, forcedX, forcedSize) {
  const size = randomPlatformSize(forcedSize);
  const width = size.width + Math.random() * 18;
  const x = forcedX ? forcedX - width / 2 : 24 + Math.random() * (game.width - width - 48);
  const platform = {
    x: Math.max(18, Math.min(game.width - width - 18, x)),
    y,
    width,
    height: size.height,
    size: size.name,
    behavior: "normal",
    moveRange: 0,
    phase: Math.random() * Math.PI * 2,
    bounceTime: 999,
    pearl: null
  };

  assignPlatformBehavior(platform);
  maybePlacePearl(platform, size);
  game.platforms.push(platform);
}

function maybePlacePearl(platform, size) {
  platform.pearl = null;
  if (size.name !== "large" || Math.random() > size.pearlChance) {
    return;
  }

  platform.pearl = {
    offsetX: platform.width * (0.34 + Math.random() * 0.32),
    offsetY: -34,
    collected: false,
    pulse: Math.random() * Math.PI * 2
  };
}

function recyclePlatform(platform, nextY) {
  const size = randomPlatformSize();
  platform.width = size.width + Math.random() * 18;
  platform.height = size.height;
  platform.size = size.name;
  platform.x = 24 + Math.random() * (game.width - platform.width - 48);
  platform.y = nextY;
  platform.behavior = "normal";
  platform.moveRange = 0;
  platform.phase = Math.random() * Math.PI * 2;
  platform.bounceTime = 999;
  assignPlatformBehavior(platform);
  maybePlacePearl(platform, size);
}

function assignPlatformBehavior(platform) {
  const depth = Math.floor(platform.y / PX_PER_METER);
  let shouldSpecial = false;

  if (depth <= 300) {
    shouldSpecial = depth >= game.nextSpecialDepth;
    while (depth >= game.nextSpecialDepth) {
      game.nextSpecialDepth += 50;
    }
  } else if (depth <= 500) {
    if (game.nextSpecialDepth < 330 || game.nextSpecialDepth === 350) {
      game.nextSpecialDepth = 330;
    }
    shouldSpecial = depth >= game.nextSpecialDepth;
    while (depth >= game.nextSpecialDepth) {
      game.nextSpecialDepth += 30;
    }
  } else {
    shouldSpecial = Math.random() < 0.32;
  }

  if (!shouldSpecial) {
    return;
  }

  const roll = Math.random();
  if (roll < 0.34) {
    platform.behavior = "horizontal";
    platform.moveRange = 26 + Math.random() * 24;
  } else if (roll < 0.68) {
    platform.behavior = "vertical";
    platform.moveRange = 18 + Math.random() * 16;
  } else {
    platform.behavior = "blink";
  }
}

function makeBubble(x, y) {
  return {
    x,
    y,
    size: 1 + Math.random() * 3,
    speed: 0.08 + Math.random() * 0.18,
    wobble: Math.random() * Math.PI * 2
  };
}

function setButton(button, direction) {
  const press = (event) => {
    event.preventDefault();
    keys[direction] = true;
  };
  const release = (event) => {
    event.preventDefault();
    keys[direction] = false;
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

function setTapControl(event, active) {
  if (event.target.closest(".overlay, .controls, #pauseButton")) {
    return;
  }

  event.preventDefault();
  if (!active) {
    keys.touch = null;
    return;
  }

  const rect = canvas.getBoundingClientRect();
  keys.touch = event.clientX < rect.left + rect.width / 2 ? "left" : "right";
}

function update(delta) {
  if (game.state !== "playing") {
    return;
  }

  const seconds = Math.min(delta / 16.67, 2);
  updateDrift(seconds);
  const driftPower = Math.max(0, player.driftTime / 180);
  const easedDrift = driftPower * driftPower * (3 - 2 * driftPower);
  const targetVx = player.driftDirection * easedDrift * 1.55;
  player.vx += (targetVx - player.vx) * 0.045 * seconds;

  const sink = driftPower > 0 ? 0.64 : 0.55;
  player.vy += (sink - player.vy) * 0.028 * seconds;
  player.x += player.vx * seconds;
  player.y += player.vy * seconds;
  player.x = Math.max(player.radius, Math.min(game.width - player.radius, player.x));
  player.squish *= 0.88;
  player.blink += 0.045 * seconds;

  const targetCamera = player.y - game.height * 0.34;
  game.cameraY += (targetCamera - game.cameraY) * 0.055 * seconds;
  game.depth = Math.max(game.depth, Math.floor(player.y / PX_PER_METER));
  if (game.depth > save.bestDepth) {
    save.bestDepth = game.depth;
  }
  if (save.bestDepth - game.savedDepth >= 10) {
    saveProgress();
  }

  updatePlatforms(seconds);
  updateParticles(seconds);
  collectPearls();
  updateDiscovery();
  updateHud();

  if (updateBubbleLayers()) {
    return;
  }

  if (player.y - game.cameraY > game.height + 72) {
    endGame("fall");
    return;
  }
}

function updateDiscovery() {
  if (game.depth < game.nextDiscoveryDepth) {
    return;
  }

  game.nextDiscoveryDepth = game.depth + DISCOVERY_CHECK_METERS + Math.floor(Math.random() * 12);
  if (game.depth >= 1000) {
    maybeDiscoverSpecial("ryugu-castle");
  }

  const tab = getDiscoveryTab(game.depth);
  const candidates = (encyclopediaData[tab] || []).filter((creature) => !isDiscovered(creature));

  if (candidates.length === 0) {
    return;
  }

  const chance = tab === "special" ? 0.34 : 0.52;
  if (Math.random() > chance) {
    return;
  }

  const creature = candidates[Math.floor(Math.random() * candidates.length)];
  discoverCreature(creature);
}

function maybeDiscoverSpecial(id) {
  const creature = encyclopediaData.special.find((item) => item.id === id);
  if (creature) {
    discoverCreature(creature);
  }
}

function getDiscoveryTab(depth) {
  if (depth <= 300) return "shallow";
  if (depth <= 500) return "middle";
  if (depth <= 1000) return "deep";
  return "special";
}

function showDiscoveryToast(creature) {
  discoveryToast.textContent = `新発見！${creature.name}を図鑑に登録`;
  discoveryToast.classList.remove("hidden");
  clearTimeout(game.toastTimer);
  game.toastTimer = setTimeout(() => {
    discoveryToast.classList.add("hidden");
  }, 2600);
}

function updateBubbleLayers() {
  while (game.depth - player.safeDepth >= BUBBLE_LIMIT_METERS) {
    player.safeDepth += BUBBLE_LIMIT_METERS;
    game.bubbleLayers -= 1;
    popBubbles(player.x, player.y);

    if (game.bubbleLayers <= 0) {
      game.bubbleLayers = 0;
      endGame("bubble");
      return true;
    }
  }

  return false;
}

function getSteer() {
  if (keys.touch === "left") return -1;
  if (keys.touch === "right") return 1;
  return (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
}

function updateDrift(seconds) {
  const input = getSteer();
  if (input !== 0 && (player.lastInput === 0 || input !== player.driftDirection)) {
    player.driftDirection = input;
    player.driftTime = 180;
  }

  player.lastInput = input;
  if (player.driftTime > 0) {
    player.driftTime = Math.max(0, player.driftTime - seconds);
  } else {
    player.driftDirection = 0;
  }
}

function updatePlatforms(seconds) {
  let maxY = Math.max(...game.platforms.map((platform) => platform.y));

  for (const platform of game.platforms) {
    platform.phase += 0.02 * seconds;
    platform.bounceTime += seconds;
    const rect = getPlatformRect(platform);

    if (platform.pearl && !platform.pearl.collected) {
      platform.pearl.pulse += 0.06 * seconds;
    }

    if (rect.visible) {
      const top = rect.y + Math.sin(platform.phase) * 3;
      const wasAbove = player.y + player.hitRadius - player.vy <= top + 5;
      const withinX = player.x > rect.x + 6 && player.x < rect.x + platform.width - 6;
      const touching = player.y + player.hitRadius >= top && player.y + player.hitRadius <= top + 14;

      if (player.vy > 0 && wasAbove && withinX && touching) {
        player.y = top - player.hitRadius;
        player.vy = -1.4;
        player.squish = 0.31;
        player.safeDepth = game.depth;
        platform.bounceTime = 0;
        popBubbles(player.x, player.y + player.radius);
      }
    }

    if (platform.y < game.cameraY - 80) {
      const spacing = getPlatformSpacing(maxY);
      recyclePlatform(platform, maxY + spacing);
      maxY = platform.y;
    }
  }
}

function getPearlPosition(platform) {
  const rect = getPlatformRect(platform);
  return {
    x: rect.x + platform.pearl.offsetX,
    y: rect.y + platform.pearl.offsetY,
    visible: rect.visible
  };
}

function getPlatformRect(platform) {
  let x = platform.x;
  let y = platform.y;
  let alpha = 1;
  let visible = true;

  if (platform.behavior === "horizontal") {
    x += Math.sin(platform.phase * 0.8) * platform.moveRange;
    x = Math.max(18, Math.min(game.width - platform.width - 18, x));
  } else if (platform.behavior === "vertical") {
    y += Math.sin(platform.phase * 0.75) * platform.moveRange;
  } else if (platform.behavior === "blink") {
    const cycle = (platform.phase % (Math.PI * 2)) / (Math.PI * 2);
    visible = cycle < 0.68;
    alpha = cycle < 0.55 ? 1 : 1 - (cycle - 0.55) / 0.13;
  }

  return { x, y, alpha: Math.max(0.18, alpha), visible };
}

function getPlatformSpacing(worldY) {
  const depth = Math.floor(worldY / PX_PER_METER);
  if (depth <= 300) return 5 * PX_PER_METER;
  if (depth <= 500) return 7 * PX_PER_METER;
  if (depth <= 1000) return 8 * PX_PER_METER;
  return 9 * PX_PER_METER;
}

function collectPearls() {
  for (const platform of game.platforms) {
    if (!platform.pearl || platform.pearl.collected) {
      continue;
    }

    const pearl = getPearlPosition(platform);
    if (!pearl.visible) {
      continue;
    }

    const dx = player.x - pearl.x;
    const dy = player.y - pearl.y;
    if (Math.hypot(dx, dy) < player.hitRadius + 10) {
      platform.pearl.collected = true;
      game.runPearls += 1;
      game.bubbleLayers = Math.min(MAX_BUBBLE_LAYERS, game.bubbleLayers + 1);
      save.pearls += 1;
      if (game.depth >= 900) {
        maybeDiscoverSpecial("ryugu-pearl");
      }
      popBubbles(pearl.x, pearl.y);
      saveProgress();
    }
  }
}

function updateParticles(seconds) {
  for (const bubble of game.particles) {
    bubble.y -= bubble.speed * seconds;
    bubble.wobble += 0.025 * seconds;
    if (bubble.y < -10) {
      bubble.y = game.height + Math.random() * 80;
      bubble.x = Math.random() * game.width;
    }
  }
}

function popBubbles(x, y) {
  for (let i = 0; i < 5; i += 1) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * 50,
      y: y + Math.random() * 14 - game.cameraY,
      size: 2 + Math.random() * 4,
      speed: 0.42 + Math.random() * 0.35,
      wobble: Math.random() * Math.PI * 2,
      fresh: 40
    });
  }

  if (game.particles.length > 78) {
    game.particles.splice(0, game.particles.length - 78);
  }
}

function draw() {
  drawBackground();
  drawParticles();
  drawRyuguLight();

  for (const platform of game.platforms) {
    drawJellyfish(platform);
  }

  for (const platform of game.platforms) {
    drawPearl(platform);
  }

  drawMofu();

  if (game.state === "paused") {
    drawPauseTint();
  }
}

function drawBackground() {
  const colors = getDepthColors();
  const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
  gradient.addColorStop(0, colors.top);
  gradient.addColorStop(0.48, colors.mid);
  gradient.addColorStop(1, colors.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.width, game.height);

  drawGameBackgroundImage();

  ctx.fillStyle = colors.haze;
  for (let i = 0; i < 6; i += 1) {
    const y = ((i * 170 - game.cameraY * 0.18) % (game.height + 180)) - 90;
    ctx.beginPath();
    ctx.ellipse(game.width * (0.15 + i * 0.14), y, 92, 18, -0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGameBackgroundImage() {
  const image = assets.gameBackground;
  if (!image.complete || image.naturalWidth <= 0) {
    return;
  }

  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = game.width / game.height;
  let drawWidth = game.width;
  let drawHeight = game.height;

  if (imageRatio > canvasRatio) {
    drawHeight = game.height;
    drawWidth = drawHeight * imageRatio;
  } else {
    drawWidth = game.width;
    drawHeight = drawWidth / imageRatio;
  }

  const driftX = Math.sin(game.cameraY * 0.002) * 8;
  const driftY = -((game.cameraY * 0.08) % Math.max(1, drawHeight - game.height + 1));
  const x = (game.width - drawWidth) / 2 + driftX;
  const y = Math.min(0, (game.height - drawHeight) / 2 + driftY);

  ctx.save();
  ctx.globalAlpha = 0.68;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  ctx.restore();
}

function getDepthColors() {
  if (game.depth >= 1000) {
    return { top: "#050617", mid: "#091329", bottom: "#01040c", haze: "rgba(181, 133, 232, 0.05)" };
  }
  if (game.depth >= 500) {
    return { top: "#071b35", mid: "#06132a", bottom: "#010918", haze: "rgba(112, 160, 231, 0.055)" };
  }
  if (game.depth >= 300) {
    return { top: "#0b2a48", mid: "#071e37", bottom: "#031120", haze: "rgba(113, 204, 224, 0.052)" };
  }
  return { top: "#123b54", mid: "#082338", bottom: "#020d19", haze: "rgba(155, 225, 239, 0.05)" };
}

function drawRyuguLight() {
  if (game.depth < 850) {
    return;
  }

  const glow = Math.min(1, (game.depth - 850) / 180);
  const palaceY = game.height * 0.72 + Math.sin(player.blink * 0.3) * 8;

  ctx.save();
  ctx.globalAlpha = 0.08 + glow * 0.2;
  const light = ctx.createRadialGradient(game.width / 2, palaceY, 8, game.width / 2, palaceY, game.width * 0.6);
  light.addColorStop(0, "#f8e8a0");
  light.addColorStop(0.45, "rgba(118, 231, 215, 0.34)");
  light.addColorStop(1, "rgba(118, 231, 215, 0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, palaceY - 180, game.width, 280);

  ctx.globalAlpha = 0.12 + glow * 0.18;
  ctx.fillStyle = "#f6d98a";
  ctx.fillRect(game.width / 2 - 44, palaceY, 88, 28);
  ctx.fillRect(game.width / 2 - 28, palaceY - 28, 56, 28);
  ctx.fillRect(game.width / 2 - 10, palaceY - 52, 20, 24);
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const bubble of game.particles) {
    const x = bubble.x + Math.sin(bubble.wobble) * 8;
    ctx.globalAlpha = bubble.fresh ? Math.min(1, bubble.fresh / 20) : 0.52;
    ctx.strokeStyle = "#bdefff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, bubble.y, bubble.size, 0, Math.PI * 2);
    ctx.stroke();
    if (bubble.fresh) {
      bubble.fresh -= 1;
    }
  }
  ctx.restore();
}

function drawJellyfish(platform) {
  const rect = getPlatformRect(platform);
  if (!rect.visible) {
    return;
  }

  const bounce = getPlatformBounce(platform);
  const screenY = rect.y - game.cameraY + Math.sin(platform.phase) * 3 + bounce.offset;
  const centerX = rect.x + platform.width / 2;
  const tentacleCount = platform.size === "large" ? 7 : platform.size === "medium" ? 5 : 4;

  ctx.save();
  ctx.globalAlpha = rect.alpha;
  ctx.translate(centerX, screenY);
  ctx.scale(1, 1 - bounce.squash);

  if (platform.behavior !== "normal") {
    ctx.strokeStyle = platform.behavior === "blink" ? "rgba(255, 244, 173, 0.48)" : "rgba(178, 244, 255, 0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -2, platform.width * 0.6, platform.height * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (assets.jellyfish.complete && assets.jellyfish.naturalWidth > 0) {
    const visualWidth = platform.width * 1.28;
    const visualHeight = visualWidth * (assets.jellyfish.naturalHeight / assets.jellyfish.naturalWidth);
    ctx.drawImage(assets.jellyfish, -visualWidth / 2, -visualHeight * 0.34, visualWidth, visualHeight);
    ctx.restore();
    return;
  }

  ctx.fillStyle = platform.size === "large" ? "rgba(244, 184, 232, 0.86)" : "rgba(226, 157, 230, 0.82)";
  ctx.strokeStyle = "rgba(255, 239, 252, 0.85)";
  ctx.lineWidth = 2;
  roundedCapsule(-platform.width / 2, -platform.height / 2, platform.width, platform.height, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  roundedCapsule(-platform.width / 2 + 14, -platform.height * 0.32, platform.width * 0.42, 6, 8);
  ctx.fill();

  ctx.strokeStyle = "rgba(238, 172, 226, 0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < tentacleCount; i += 1) {
    const t = tentacleCount === 1 ? 0 : i / (tentacleCount - 1);
    const x = -platform.width * 0.36 + t * platform.width * 0.72;
    ctx.beginPath();
    ctx.moveTo(x, platform.height * 0.34);
    ctx.quadraticCurveTo(x + 12, platform.height + 10, x - 3, platform.height + 26);
    ctx.stroke();
  }

  ctx.restore();
}

function getPlatformBounce(platform) {
  const duration = 90;
  if (platform.bounceTime >= duration) {
    return { offset: 0, squash: 0 };
  }

  const progress = platform.bounceTime / duration;
  const fade = 1 - progress;
  const wave = Math.sin(progress * Math.PI * 6);
  return {
    offset: wave * fade * 4,
    squash: Math.max(0, wave) * fade * 0.055
  };
}

function drawPearl(platform) {
  if (!platform.pearl || platform.pearl.collected) {
    return;
  }

  const pearl = platform.pearl;
  const position = getPearlPosition(platform);
  if (!position.visible) {
    return;
  }

  const y = position.y - game.cameraY + Math.sin(pearl.pulse) * 4;
  const glow = 0.55 + Math.sin(pearl.pulse) * 0.2;

  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = "rgba(255, 248, 206, 0.28)";
  ctx.beginPath();
  ctx.arc(position.x, y, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  const gradient = ctx.createRadialGradient(position.x - 4, y - 5, 2, position.x, y, 11);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.52, "#fff6c6");
  gradient.addColorStop(1, "#d6b96e");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(position.x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMofu() {
  const y = player.y - game.cameraY;
  const bob = Math.sin(player.blink) * 3;
  const squashX = 1 + player.squish * 0.12;
  const squashY = 1 - player.squish * 0.18;

  ctx.save();
  ctx.translate(player.x, y + bob);

  ctx.fillStyle = "rgba(210, 245, 255, 0.22)";
  ctx.strokeStyle = "rgba(224, 252, 255, 0.86)";
  ctx.lineWidth = 3;
  if (!game.bubbleBroken) {
    drawMofuBubbles();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 4, 0, Math.PI * 2);
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([5, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  const mofuImage = assets.mofu[player.mofu] || assets.mofu.gray;
  if (mofuImage.complete && mofuImage.naturalWidth > 0) {
    const visualHeight = player.radius * 3.35;
    const visualWidth = visualHeight * (mofuImage.naturalWidth / mofuImage.naturalHeight);
    ctx.scale(squashX, squashY);
    ctx.drawImage(mofuImage, -visualWidth / 2, -visualHeight * 0.52, visualWidth, visualHeight);
    ctx.restore();
    return;
  }

  ctx.scale(squashX, squashY);
  ctx.fillStyle = "#aeb4b8";
  ctx.strokeStyle = "#eef7fb";
  ctx.lineWidth = 2;
  fluffyCircle(0, 0, player.radius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#27313a";
  ctx.beginPath();
  ctx.arc(-9, -4, 3, 0, Math.PI * 2);
  ctx.arc(9, -4, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#27313a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 4, 6, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(224, 252, 255, 0.72)";
  ctx.lineWidth = 1.4;
  drawTinyBubble(player.x + 25, y - 25, 4.5);
  drawTinyBubble(player.x + 34, y - 35, 2.8);
  drawTinyBubble(player.x + 17, y - 38, 2.2);
  ctx.restore();
}

function drawMofuBubbles() {
  const layers = Math.max(1, game.bubbleLayers);
  for (let i = layers - 1; i >= 1; i -= 1) {
    const radius = player.radius + 4 + i * 4;
    const alpha = 0.2 + (layers - i) * 0.035;
    ctx.fillStyle = `rgba(210, 245, 255, ${alpha})`;
    ctx.strokeStyle = `rgba(224, 252, 255, ${0.48 + i * 0.08})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(210, 245, 255, 0.18)";
  ctx.strokeStyle = "rgba(224, 252, 255, 0.72)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawTinyBubble(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPauseTint() {
  ctx.fillStyle = "rgba(0, 8, 16, 0.34)";
  ctx.fillRect(0, 0, game.width, game.height);
}

function roundedCapsule(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function fluffyCircle(x, y, radius) {
  ctx.beginPath();
  for (let i = 0; i <= 22; i += 1) {
    const angle = (i / 22) * Math.PI * 2;
    const fluff = radius + Math.sin(angle * 7) * 3 + Math.cos(angle * 4) * 2;
    const px = x + Math.cos(angle) * fluff;
    const py = y + Math.sin(angle) * fluff;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function endGame(reason = "fall") {
  game.state = "over";
  game.bubbleBroken = reason === "bubble";
  saveProgress();
  const message = reason === "bubble" ? "泡が割れちゃった" : "クラゲに届かなかった";
  resultText.textContent = `${message} / 深度 ${game.depth}m / 今回 ${game.runPearls} / 通算 ${save.pearls}`;
  gameOverScreen.classList.remove("hidden");
  updateHud();
}

function returnToTitle() {
  saveProgress();
  showTitleScreen();
}

function togglePause() {
  if (game.state === "playing") {
    game.state = "paused";
    pauseButton.textContent = "▶";
  } else if (game.state === "paused") {
    game.state = "playing";
    game.lastTime = performance.now();
    pauseButton.textContent = "II";
  }
}

function loop(time) {
  const delta = time - game.lastTime;
  game.lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a") keys.left = true;
  if (event.key === "ArrowRight" || event.key === "d") keys.right = true;
  if (event.key === " " || event.key === "Enter") togglePause();
});
window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a") keys.left = false;
  if (event.key === "ArrowRight" || event.key === "d") keys.right = false;
});
canvas.addEventListener("pointerdown", (event) => setTapControl(event, true));
canvas.addEventListener("pointermove", (event) => {
  if (keys.touch) setTapControl(event, true);
});
canvas.addEventListener("pointerup", (event) => setTapControl(event, false));
canvas.addEventListener("pointercancel", (event) => setTapControl(event, false));

setButton(leftButton, "left");
setButton(rightButton, "right");
startButton.addEventListener("click", resetGame);
encyclopediaButton.addEventListener("click", showEncyclopedia);
bookBackButton.addEventListener("click", returnToTitle);
restartButton.addEventListener("click", resetGame);
titleButton.addEventListener("click", returnToTitle);
homeButton.addEventListener("click", returnToTitle);
pauseButton.addEventListener("click", togglePause);
for (const button of mofuButtons) {
  button.addEventListener("click", () => selectMofu(button.dataset.mofu));
}
for (const button of document.querySelectorAll(".book-tab")) {
  button.addEventListener("click", () => {
    game.bookTab = button.dataset.tab;
    renderEncyclopedia();
  });
}

resizeCanvas();
selectMofu("gray");
updateHud();
renderEncyclopedia();
draw();
requestAnimationFrame(loop);

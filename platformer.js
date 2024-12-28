/**************************************************
 * 1) Configuration du Canvas
 **************************************************/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

/**************************************************
 * 2) Images du Décor (Cross-Fade ou non)
 **************************************************/
const background1 = new Image();
background1.src = "images/background1.png";

const background2 = new Image();
background2.src = "images/background2.png";

let bg1X = 0, bg2X = WIDTH;
let backgroundSpeed = 2; // Décor lointain

// Cross-fade du décor
let fade = 0;
let fadeDuration = 500;
let fadeStartTime = null;
let transitionActive = true;

/**************************************************
 * 3) Sol (Cross-Fade)
 **************************************************/
const ground1 = new Image();
ground1.src = "images/surface1.png";

const ground2 = new Image();
ground2.src = "images/surface2.png";

let ground1X1 = 0, ground1X2 = WIDTH;
let ground2X1 = 0, ground2X2 = WIDTH;
let groundSpeed = backgroundSpeed * 3;

const groundY = 350;
const groundHeight = 50;

/**************************************************
 * 4) Obstacles
 **************************************************/
const obstacleImages = [
  { src: "images/obstacle1.png", width: 70, height: 70 }
];
const loadedObstacleImages = [];

const obstacles = [];
let obstacleIntervalBase = 2000; 
let obstacleInterval = obstacleIntervalBase;
let lastObstacleTime = 0;
let gameSpeed = 5; // vitesse horizontale de défilement

/**************************************************
 * 5) Plateformes
 **************************************************/
const platformImage = new Image();
platformImage.src = "images/plateforme1.png"; // ex. 496×45

const platforms = [];
const PLATFORM_WIDTH = 496;
const PLATFORM_HEIGHT = 45;

let platformIntervalBase = 4000; 
let platformInterval = platformIntervalBase;
let lastPlatformTime = 0;

/**************************************************
 * 6) Joueur (3 frames d'animation)
 **************************************************/
const playerImages = [new Image(), new Image(), new Image()];
playerImages[0].src = "images/player1.png";
playerImages[1].src = "images/player2.png";
playerImages[2].src = "images/player3.png";

let currentFrame = 0;
let frameInterval = 100;
let lastFrameTime = 0;

/**************************************************
 * 7) Joueur : coordonnées, vitesse, double-saut
 **************************************************/
const player = {
  x: 50,
  y: HEIGHT - 100,
  width: 50,
  height: 50,
  vy: 0,
  jumping: false
};

// Gravité
const gravity = 0.5;

// Premier saut
const jumpStrength = 12;
// Deuxième saut (moins fort)
const jumpStrength2 = 8;

// Nombre de sauts déjà effectués (0, 1 ou 2 max)
let jumpCount = 0;

/**************************************************
 * 8) Vies (3) + image de coeur (life.png)
 **************************************************/
let lives = 3;
const lifeImage = new Image();
lifeImage.src = "images/life.png";

/**************************************************
 * 9) État du jeu : score, gameOver
 **************************************************/
let score = 0;
let gameOver = false;

/**************************************************
 * 10) Timer de difficulté (toutes les 15s)
 **************************************************/
let lastDifficultyIncrease = 0;
let difficultyInterval = 15000; // 15 secondes

/**************************************************
 * 11) Collision “frôlable” (30%)
 **************************************************/
function isColliding(a, b) {
  const margin = 0.3; // Réduit chaque boîte de 30%

  // Box réduite pour 'a'
  const shrinkWa = a.width * margin;
  const shrinkHa = a.height * margin;
  const ax = a.x + shrinkWa / 2;
  const ay = a.y + shrinkHa / 2;
  const aw = a.width - shrinkWa;
  const ah = a.height - shrinkHa;

  // Box réduite pour 'b'
  const shrinkWb = b.width * margin;
  const shrinkHb = b.height * margin;
  const bx = b.x + shrinkWb / 2;
  const by = b.y + shrinkHb / 2;
  const bw = b.width - shrinkWb;
  const bh = b.height - shrinkHb;

  // Test AABB
  return (
    ax < bx + bw &&
    ax + aw > bx &&
    ay < by + bh &&
    ay + ah > by
  );
}

/**************************************************
 * 12) Fromages (à ramasser)
 **************************************************/
const cheeseImage = new Image();
cheeseImage.src = "images/fromage.png";

const cheeses = [];
let cheeseCount = 0; // nombre de fromages ramassés

// Apparition (spawn) aléatoire
let lastCheeseTime = 0;
let cheeseIntervalBase = 3000;
let cheeseInterval = cheeseIntervalBase;

const CHEESE_WIDTH = 32;
const CHEESE_HEIGHT = 32;

// On gagne 1 vie tous les 20 fromages
const CHEESES_FOR_EXTRA_LIFE = 20;

/**************************************************
 * 13) Audio
 **************************************************/
// 3 sons : musique, collision, saut
let music = new Audio("sounds/music.mp3");
let outchSound = new Audio("sounds/outch.mp3");
let jumpSound = new Audio("sounds/jump.mp3");

// Config audio
music.loop = true;
music.volume = 0.2;    // musique plus faible
outchSound.volume = 1.0;
jumpSound.volume = 0.4;

// On charge (optionnel)
music.load();
outchSound.load();
jumpSound.load();

// Démarrer la musique après interaction utilisateur
function enableAudio() {
  music.play().catch(err => {
    console.log("Impossible de jouer la musique :", err);
  });
  // On retire ces écouteurs pour éviter de rejouer la musique sans cesse
  document.removeEventListener("keydown", enableAudio);
  document.removeEventListener("mousedown", enableAudio);
  document.removeEventListener("touchstart", enableAudio);
}
document.addEventListener("keydown", enableAudio);
document.addEventListener("mousedown", enableAudio);
document.addEventListener("touchstart", enableAudio, { passive: false });

/**************************************************
 * 14) Initialisation du jeu
 **************************************************/
function init() {
  // Saut via clavier
  document.addEventListener('keydown', handleJumpKey);

  // Saut via tactile
  document.addEventListener('touchstart', handleTouchJump, { passive: false });

  // Charger toutes les images
  let totalImages = 2 + 2 + 3 + obstacleImages.length + 1 + 1 + 1;
  // 2 BG + 2 ground + 3 player + obstacle + 1 platform + 1 life + 1 cheese

  let loadedCount = 0;

  background1.onload = onImgLoad;
  background2.onload = onImgLoad;
  ground1.onload = onImgLoad;
  ground2.onload = onImgLoad;
  platformImage.onload = onImgLoad;
  lifeImage.onload = onImgLoad;
  cheeseImage.onload = onImgLoad;

  playerImages.forEach(img => {
    img.onload = onImgLoad;
  });
  obstacleImages.forEach((obs, i) => {
    const img = new Image();
    img.src = obs.src;
    loadedObstacleImages[i] = {
      image: img,
      width: obs.width,
      height: obs.height
    };
    img.onload = onImgLoad;
  });

  function onImgLoad() {
    loadedCount++;
    if (loadedCount === totalImages) {
      // Tout est chargé, on démarre la boucle
      requestAnimationFrame(gameLoop);
    }
  }
}

/**************************************************
 * 15) Boucle de jeu
 **************************************************/
function gameLoop(timestamp) {
  if (gameOver) {
    afficherGameOver();
    return;
  }

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Cross-Fade du décor
  if (transitionActive) {
    updateFade(timestamp);
  }

  updateBackground();
  drawBackgroundCrossFade();

  updateGround();
  drawGroundCrossFade();

  updatePlayer(timestamp);
  drawPlayer();

  managePlatforms(timestamp);
  updatePlatforms();
  drawPlatforms();

  manageObstacles(timestamp);
  updateObstacles();
  drawObstacles();

  // Fromages
  manageCheeses(timestamp);
  updateCheeses();
  drawCheeses();

  // Collisions
  checkCollisions();        // obstacles
  checkCheeseCollisions();  // fromages

  afficherScore();
  afficherVies();
  afficherCheeseCount();

  handleDifficulty(timestamp);

  requestAnimationFrame(gameLoop);
}

/**************************************************
 * 16) Cross-Fade (Décor & Sol)
 **************************************************/
function updateFade(timestamp) {
  if (!fadeStartTime) fadeStartTime = timestamp;
  let elapsed = timestamp - fadeStartTime;
  fade = elapsed / fadeDuration;
  if (fade >= 1) {
    fade = 1;
    transitionActive = false;
  }
}

function updateBackground() {
  bg1X -= backgroundSpeed;
  bg2X -= backgroundSpeed;
  if (bg1X <= -WIDTH) bg1X = WIDTH;
  if (bg2X <= -WIDTH) bg2X = WIDTH;
}

function drawBackgroundCrossFade() {
  ctx.save();
  ctx.globalAlpha = 1 - fade;
  ctx.drawImage(background1, bg1X, 0, WIDTH, HEIGHT);
  ctx.drawImage(background1, bg2X, 0, WIDTH, HEIGHT);

  ctx.globalAlpha = fade;
  ctx.drawImage(background2, bg1X, 0, WIDTH, HEIGHT);
  ctx.drawImage(background2, bg2X, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function updateGround() {
  ground1X1 -= groundSpeed;
  ground1X2 -= groundSpeed;
  if (ground1X1 <= -WIDTH) ground1X1 = ground1X2 + WIDTH;
  if (ground1X2 <= -WIDTH) ground1X2 = ground1X1 + WIDTH;

  ground2X1 -= groundSpeed;
  ground2X2 -= groundSpeed;
  if (ground2X1 <= -WIDTH) ground2X1 = ground2X2 + WIDTH;
  if (ground2X2 <= -WIDTH) ground2X2 = ground2X1 + WIDTH;
}

function drawGroundCrossFade() {
  ctx.save();
  ctx.globalAlpha = 1 - fade;
  ctx.drawImage(ground1, ground1X1, groundY, WIDTH, groundHeight);
  ctx.drawImage(ground1, ground1X2, groundY, WIDTH, groundHeight);

  ctx.globalAlpha = fade;
  ctx.drawImage(ground2, ground2X1, groundY, WIDTH, groundHeight);
  ctx.drawImage(ground2, ground2X2, groundY, WIDTH, groundHeight);
  ctx.restore();
}

/**************************************************
 * 17) Joueur
 **************************************************/
function updatePlayer(timestamp) {
  // Animation
  if (timestamp - lastFrameTime > frameInterval) {
    lastFrameTime = timestamp;
    currentFrame = (currentFrame + 1) % playerImages.length;
  }

  // Gravité
  player.y += player.vy;
  player.vy += gravity;

  // Collision avec le sol
  if (player.y + player.height >= HEIGHT) {
    player.y = HEIGHT - player.height;
    player.vy = 0;
    player.jumping = false;
    jumpCount = 0;
  }

  // Plateforme (si on descend)
  if (player.vy >= 0) {
    platforms.forEach(p => {
      if (
        player.x + player.width > p.x &&
        player.x < p.x + p.width
      ) {
        if (
          player.y + player.height >= p.y &&
          player.y + player.height <= p.y + p.height
        ) {
          // Atterrissage sur la plateforme
          player.y = p.y - player.height;
          player.vy = 0;
          player.jumping = false;
          jumpCount = 0;
        }
      }
    });
  }
}

function drawPlayer() {
  ctx.drawImage(
    playerImages[currentFrame],
    player.x,
    player.y,
    player.width,
    player.height
  );
}

/**************************************************
 * 18) Double-Saut
 **************************************************/
function handleJumpKey(e) {
  if (e.code === "Space" || e.code === "ArrowUp") {
    if (jumpCount < 2) {
      // Son de saut
      jumpSound.currentTime = 0;
      jumpSound.play();

      if (jumpCount === 0) {
        player.vy = -jumpStrength;
      } else {
        player.vy = -jumpStrength2;
      }
      jumpCount++;
      player.jumping = true;
    }
  }
}

function handleTouchJump(e) {
  e.preventDefault();
  if (jumpCount < 2) {
    // Son de saut
    jumpSound.currentTime = 0;
    jumpSound.play();

    if (jumpCount === 0) {
      player.vy = -jumpStrength;
    } else {
      player.vy = -jumpStrength2;
    }
    jumpCount++;
    player.jumping = true;
  }
}

/**************************************************
 * 19) Plateformes
 **************************************************/
function spawnPlatform() {
  let spawnY = 150 + Math.random() * 100; 
  platforms.push({
    x: WIDTH,
    y: spawnY,
    width: PLATFORM_WIDTH,
    height: PLATFORM_HEIGHT
  });
}

function managePlatforms(timestamp) {
  if (timestamp - lastPlatformTime > platformInterval) {
    spawnPlatform();
    lastPlatformTime = timestamp;
    // interval aléatoire entre 3s et 6s
    platformInterval = 3000 + Math.random() * 3000;
  }
}

function updatePlatforms() {
  platforms.forEach(p => {
    p.x -= gameSpeed;
  });
  for (let i = platforms.length - 1; i >= 0; i--) {
    if (platforms[i].x + platforms[i].width < 0) {
      platforms.splice(i, 1);
    }
  }
}

function drawPlatforms() {
  platforms.forEach(p => {
    ctx.drawImage(platformImage, p.x, p.y, p.width, p.height);
  });
}

/**************************************************
 * 20) Obstacles
 **************************************************/
function manageObstacles(timestamp) {
  if (timestamp - lastObstacleTime > obstacleInterval) {
    let randIndex = Math.floor(Math.random() * loadedObstacleImages.length);
    let obsData = loadedObstacleImages[randIndex];
    obstacles.push({
      x: WIDTH,
      y: HEIGHT - obsData.height,
      width: obsData.width,
      height: obsData.height,
      image: obsData.image
    });

    lastObstacleTime = timestamp;
    obstacleInterval = obstacleIntervalBase / 2 + Math.random() * obstacleIntervalBase;
  }
}

function updateObstacles() {
  obstacles.forEach(obs => {
    obs.x -= gameSpeed;
  });
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
      score++;
    }
  }
}

function drawObstacles() {
  obstacles.forEach(obs => {
    ctx.drawImage(obs.image, obs.x, obs.y, obs.width, obs.height);
  });
}

/**************************************************
 * 21) Collisions (obstacles) => Perte de vie
 **************************************************/
function checkCollisions() {
  for (let obs of obstacles) {
    if (isColliding(player, obs)) {
      // Son de collision
      outchSound.currentTime = 0;
      outchSound.play();

      // On perd 1 vie
      lives--;
      obstacles.splice(obstacles.indexOf(obs), 1);

      if (lives <= 0) {
        gameOver = true;
      }
      return; 
    }
  }
}

/**************************************************
 * 22) Fromages
 **************************************************/
function manageCheeses(timestamp) {
  if (timestamp - lastCheeseTime > cheeseInterval) {
    spawnCheese();
    lastCheeseTime = timestamp;
    // interval 2–5s
    cheeseInterval = 2000 + Math.random() * 3000;
  }
}

function spawnCheese() {
  // position sur le sol ou un peu plus haut
  const spawnY = groundY - 32 - Math.random() * 100;
  cheeses.push({
    x: WIDTH,
    y: spawnY,
    width: CHEESE_WIDTH,
    height: CHEESE_HEIGHT
  });
}

function updateCheeses() {
  cheeses.forEach(ch => {
    ch.x -= gameSpeed;
  });
  for (let i = cheeses.length - 1; i >= 0; i--) {
    if (cheeses[i].x + cheeses[i].width < 0) {
      cheeses.splice(i, 1);
    }
  }
}

function drawCheeses() {
  cheeses.forEach(ch => {
    ctx.drawImage(cheeseImage, ch.x, ch.y, ch.width, ch.height);
  });
}

/**************************************************
 * 23) Collision avec Fromages
 **************************************************/
function checkCheeseCollisions() {
  for (let i = cheeses.length - 1; i >= 0; i--) {
    let ch = cheeses[i];
    if (isColliding(player, ch)) {
      // Ramasse le fromage
      cheeseCount++;
      cheeses.splice(i, 1);

      // Tous les 20 fromages => +1 vie
      if (cheeseCount % 20 === 0) {
        lives++;
        // Option : limiter le max de vies
        // if (lives > 5) lives = 5;
      }
    }
  }
}

/**************************************************
 * 24) Affichage : score, vies, fromages
 **************************************************/
function afficherScore() {
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score : " + score, 20, 30);
}

function afficherVies() {
  const heartSize = 30;
  const margin = 10;
  for (let i = 0; i < lives; i++) {
    ctx.drawImage(lifeImage, 20 + i*(heartSize+margin), 60, heartSize, heartSize);
  }
}

function afficherCheeseCount() {
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Fromages : " + cheeseCount, 20, 110);
}

/**************************************************
 * 25) Fin de jeu
 **************************************************/
function afficherGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#fff";
  ctx.font = "40px Arial";
  ctx.fillText("GAME OVER", WIDTH / 2 - 100, HEIGHT / 2);

  ctx.font = "20px Arial";
  ctx.fillText("Score final : " + score, WIDTH / 2 - 60, HEIGHT / 2 + 40);
}

/**************************************************
 * 26) Difficulté
 **************************************************/
function handleDifficulty(timestamp) {
  if (timestamp - lastDifficultyIncrease > difficultyInterval) {
    // augmenter la vitesse
    gameSpeed += 1;

    // obstacles plus fréquents
    obstacleIntervalBase = Math.max(500, obstacleIntervalBase - 200);

    // plateformes plus fréquentes
    platformIntervalBase = Math.max(2000, platformIntervalBase - 500);

    // fromages plus fréquents
    cheeseIntervalBase = Math.max(1000, cheeseIntervalBase - 200);

    lastDifficultyIncrease = timestamp;
  }
}

/**************************************************
 * 27) Lancement
 **************************************************/
init();

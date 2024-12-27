/**************************************************
 * 1) Configuration du Canvas
 **************************************************/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

/**************************************************
 * 2) Arrière-plans (avec cross-fade)
 **************************************************/
// Deux images de décor (le “ciel” lointain)
const background1 = new Image();
background1.src = "images/background1.png";

const background2 = new Image();
background2.src = "images/background2.png";

// Positions de défilement pour chaque image
let bg1X = 0;
let bg2X = WIDTH;
// Vitesse de défilement (ex: 2 px/frame)
let backgroundSpeed = 2;

/**************************************************
 * 3) Sol avec cross-fade
 **************************************************/
// Deux images de sol (surface1, surface2)
const ground1 = new Image();
ground1.src = "images/surface1.png";

const ground2 = new Image();
ground2.src = "images/surface2.png";

// Positions (on a 2 tuiles pour CHAQUE image de sol)
let ground1X1 = 0, ground1X2 = WIDTH;  
let ground2X1 = 0, ground2X2 = WIDTH;  
// Vitesse de défilement (3x plus rapide que l'arrière-plan)
let groundSpeed = backgroundSpeed * 3;

// Position verticale du sol et sa hauteur
const groundY = 350;
const groundHeight = 50;

/**************************************************
 * 4) Paramètres du cross-fade global
 **************************************************/
let fade = 0;               // de 0 à 1
let fadeDuration = 500;     // 0.5s pour passer de 0 à 1 (ajustez)
let fadeStartTime = null;
let transitionActive = true;

/**************************************************
 * 5) Obstacles (à images)
 **************************************************/
const obstacleImages = [
  { src: "images/obstacle1.png", width: 70, height: 70 }
];
const loadedObstacleImages = [];

const obstacles = [];
let obstacleInterval = 2000; 
let lastObstacleTime = 0;
let gameSpeed = 5; 

/**************************************************
 * 6) Joueur (3 frames d'animation)
 **************************************************/
const playerImages = [new Image(), new Image(), new Image()];
playerImages[0].src = "images/player1.png";
playerImages[1].src = "images/player2.png";
playerImages[2].src = "images/player3.png";

let currentFrame = 0;
let frameInterval = 100;  // 100ms/frame
let lastFrameTime = 0;

const player = {
  x: 50,
  y: HEIGHT - 100,
  width: 50,
  height: 50,
  vy: 0,
  jumping: false
};

// Physique
const gravity = 0.5;
const jumpStrength = 12;

/**************************************************
 * 7) État du jeu
 **************************************************/
let score = 0;
let gameOver = false;

/**************************************************
 * 8) Initialisation du jeu
 **************************************************/
function init() {
  // 1) Gérer le saut via clavier
  document.addEventListener('keydown', handleJump);

  // 2) Gérer le saut via tactile
  //    => On écoute "touchstart" pour déclencher un saut
  document.addEventListener('touchstart', handleTouchJump, { passive: false });

  // Charger toutes les images
  const totalImages = 2 + 2 + 3 + obstacleImages.length; 
  let loadedCount = 0;

  // BG
  background1.onload = onImgLoad;
  background2.onload = onImgLoad;
  // Sol
  ground1.onload = onImgLoad;
  ground2.onload = onImgLoad;
  // Joueur
  playerImages.forEach(img => img.onload = onImgLoad);
  // Obstacles
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
      requestAnimationFrame(gameLoop);
    }
  }
}

/**************************************************
 * 9) Boucle principale du jeu
 **************************************************/
function gameLoop(timestamp) {
  if (gameOver) {
    afficherGameOver();
    return;
  }

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (transitionActive) {
    updateFade(timestamp);
  }

  updateBackground();
  drawBackgroundCrossFade();

  updateGround();
  drawGroundCrossFade();

  updatePlayer(timestamp);
  drawPlayer();

  manageObstacles(timestamp);
  updateObstacles();
  drawObstacles();

  checkCollisions();
  afficherScore();

  requestAnimationFrame(gameLoop);
}

/**************************************************
 * 10) Update du fade
 **************************************************/
function updateFade(timestamp) {
  if (!fadeStartTime) {
    fadeStartTime = timestamp;
  }
  const elapsed = timestamp - fadeStartTime;
  fade = elapsed / fadeDuration;
  if (fade >= 1) {
    fade = 1;
    transitionActive = false;
  }
}

/**************************************************
 * 11) Arrière-plan
 **************************************************/
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

/**************************************************
 * 12) Sol
 **************************************************/
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
 * 13) Joueur
 **************************************************/
function updatePlayer(timestamp) {
  // Animation
  if (timestamp - lastFrameTime > frameInterval) {
    lastFrameTime = timestamp;
    currentFrame = (currentFrame + 1) % playerImages.length;
  }

  player.y += player.vy;
  player.vy += gravity;

  // Ne pas tomber sous le sol
  if (player.y + player.height >= HEIGHT) {
    player.y = HEIGHT - player.height;
    player.vy = 0;
    player.jumping = false;
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
 * 14) Saut - clavier
 **************************************************/
function handleJump(e) {
  if ((e.code === "Space" || e.code === "ArrowUp") && !player.jumping) {
    player.vy = -jumpStrength;
    player.jumping = true;
  }
}

/**************************************************
 * 14bis) Saut - tactile
 **************************************************/
function handleTouchJump(e) {
  // Empêche l'éventuel défilement ou zoom
  e.preventDefault();

  if (!player.jumping) {
    player.vy = -jumpStrength;
    player.jumping = true;
  }
}

/**************************************************
 * 15) Obstacles
 **************************************************/
function manageObstacles(timestamp) {
  if (timestamp - lastObstacleTime > obstacleInterval) {
    const randIndex = Math.floor(Math.random() * loadedObstacleImages.length);
    const obsData = loadedObstacleImages[randIndex];

    obstacles.push({
      x: WIDTH,
      y: HEIGHT - obsData.height,
      width: obsData.width,
      height: obsData.height,
      image: obsData.image
    });
    lastObstacleTime = timestamp;
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
 * 16) Collisions
 **************************************************/
function checkCollisions() {
  for (let obs of obstacles) {
    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    ) {
      gameOver = true;
      break;
    }
  }
}

/**************************************************
 * 17) Score et fin de jeu
 **************************************************/
function afficherScore() {
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score : " + score, 20, 30);
}

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
 * 18) Lancement du jeu
 **************************************************/
init();

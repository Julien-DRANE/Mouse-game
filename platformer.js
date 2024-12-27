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
let ground1X1 = 0, ground1X2 = WIDTH;  // Tuiles pour ground1
let ground2X1 = 0, ground2X2 = WIDTH;  // Tuiles pour ground2
// Vitesse de défilement plus rapide que l'arrière-plan
let groundSpeed = backgroundSpeed * 3;

// Position verticale du sol et sa hauteur
const groundY = 350;
const groundHeight = 50;

/**************************************************
 * 4) Paramètres du cross-fade global
 **************************************************/
// La même variable `fade` va faire la transition
// de background1 -> background2 ET de ground1 -> ground2
let fade = 0;                 // de 0 à 1
let fadeDuration = 500;     // 10 secondes pour passer de 0 à 1 (ajustez)
let fadeStartTime = null;
let transitionActive = true;  // si on veut activer la transition

/**************************************************
 * 5) Obstacles (à images)
 **************************************************/
// Ex.: un ou plusieurs fichiers d’obstacle
const obstacleImages = [
  { src: "images/obstacle1.png", width: 70, height: 70 },
  // { src: "images/obstacle2.png", width: 60, height: 60 },
  // etc.
];
const loadedObstacleImages = []; // contiendra les <img> chargées

// Tableau des obstacles présents à l'écran
const obstacles = [];
let obstacleInterval = 2000; // apparait tous les 2s
let lastObstacleTime = 0;
let gameSpeed = 5; // vitesse de défilement horizontal des obstacles

/**************************************************
 * 6) Joueur (3 frames d'animation)
 **************************************************/
const playerImages = [new Image(), new Image(), new Image()];
playerImages[0].src = "images/player1.png";
playerImages[1].src = "images/player2.png";
playerImages[2].src = "images/player3.png";

// Animation
let currentFrame = 0;
let frameInterval = 100;  // 100ms/frame
let lastFrameTime = 0;

// Propriétés du joueur
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
  // Événement pour sauter
  document.addEventListener('keydown', handleJump);

  // 1) Charger background1, background2
  // 2) Charger ground1, ground2
  // 3) Charger player (3 frames)
  // 4) Charger obstacles
  const totalImages = 2 + 2 + 3 + obstacleImages.length; 
  let loadedCount = 0;

  // Charger BG
  background1.onload = onImgLoad;
  background2.onload = onImgLoad;
  // Charger sol
  ground1.onload = onImgLoad;
  ground2.onload = onImgLoad;
  // Charger personnage
  playerImages.forEach(img => img.onload = onImgLoad);
  // Charger obstacles
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

  // 1) Effacer le canvas
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // 2) Gérer la progression du fade (si actif)
  if (transitionActive) {
    updateFade(timestamp);
  }

  // 3) Arrière-plan (scroll)
  updateBackground();
  drawBackgroundCrossFade();

  // 4) Sol (scroll)
  updateGround();
  drawGroundCrossFade();

  // 5) Joueur
  updatePlayer(timestamp);
  drawPlayer();

  // 6) Obstacles
  manageObstacles(timestamp);
  updateObstacles();
  drawObstacles();

  // 7) Collisions
  checkCollisions();

  // 8) Score
  afficherScore();

  // Boucle
  requestAnimationFrame(gameLoop);
}

/**************************************************
 * 10) Update du fade (0 → 1)
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
 * 11) Arrière-plan (défilement + cross-fade)
 **************************************************/
function updateBackground() {
  bg1X -= backgroundSpeed;
  bg2X -= backgroundSpeed;
  if (bg1X <= -WIDTH) {
    bg1X = WIDTH;
  }
  if (bg2X <= -WIDTH) {
    bg2X = WIDTH;
  }
}

function drawBackgroundCrossFade() {
  // On utilise globalAlpha
  ctx.save();
  // Dessin du background1 (opacité = 1 - fade)
  ctx.globalAlpha = 1 - fade;
  ctx.drawImage(background1, bg1X, 0, WIDTH, HEIGHT);
  ctx.drawImage(background1, bg2X, 0, WIDTH, HEIGHT);

  // Dessin du background2 (opacité = fade)
  ctx.globalAlpha = fade;
  ctx.drawImage(background2, bg1X, 0, WIDTH, HEIGHT);
  ctx.drawImage(background2, bg2X, 0, WIDTH, HEIGHT);

  ctx.restore();
}

/**************************************************
 * 12) Sol : 2 images, défilement + cross-fade
 **************************************************/
function updateGround() {
  // Sol 1
  ground1X1 -= groundSpeed;
  ground1X2 -= groundSpeed;
  if (ground1X1 <= -WIDTH) {
    ground1X1 = ground1X2 + WIDTH;
  }
  if (ground1X2 <= -WIDTH) {
    ground1X2 = ground1X1 + WIDTH;
  }

  // Sol 2
  ground2X1 -= groundSpeed;
  ground2X2 -= groundSpeed;
  if (ground2X1 <= -WIDTH) {
    ground2X1 = ground2X2 + WIDTH;
  }
  if (ground2X2 <= -WIDTH) {
    ground2X2 = ground2X1 + WIDTH;
  }
}

function drawGroundCrossFade() {
  ctx.save();
  // ground1 (opacité = 1 - fade)
  ctx.globalAlpha = 1 - fade;
  ctx.drawImage(ground1, ground1X1, groundY, WIDTH, groundHeight);
  ctx.drawImage(ground1, ground1X2, groundY, WIDTH, groundHeight);

  // ground2 (opacité = fade)
  ctx.globalAlpha = fade;
  ctx.drawImage(ground2, ground2X1, groundY, WIDTH, groundHeight);
  ctx.drawImage(ground2, ground2X2, groundY, WIDTH, groundHeight);

  ctx.restore();
}

/**************************************************
 * 13) Joueur
 **************************************************/
function updatePlayer(timestamp) {
  // Animation de la course
  if (timestamp - lastFrameTime > frameInterval) {
    lastFrameTime = timestamp;
    currentFrame = (currentFrame + 1) % playerImages.length;
  }

  // Gravité
  player.y += player.vy;
  player.vy += gravity;

  // Ne pas dépasser le "sol"
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
 * 14) Saut
 **************************************************/
function handleJump(e) {
  if ((e.code === "Space" || e.code === "ArrowUp") && !player.jumping) {
    player.vy = -jumpStrength;
    player.jumping = true;
  }
}

/**************************************************
 * 15) Obstacles
 **************************************************/
function manageObstacles(timestamp) {
  if (timestamp - lastObstacleTime > obstacleInterval) {
    // Choisir un obstacle aléatoire
    const randIndex = Math.floor(Math.random() * loadedObstacleImages.length);
    const obsData = loadedObstacleImages[randIndex];

    // Créer l'obstacle
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
  // Sortis de l'écran ?
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

// platformer.js

document.addEventListener('DOMContentLoaded', () => {
    /**************************************************
     * 1) Configuration du Canvas et Responsivité
     **************************************************/
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Variables globales pour l'échelle et les dimensions
    let scaleFactor = 1;
    let WIDTH = canvas.width;
    let HEIGHT = canvas.height;

    /**************************************************
     * 2) Joueur : coordonnées, vitesse, double-saut
     **************************************************/
    const player = {
        x: 50,
        y: HEIGHT - 100, // Utilise la variable HEIGHT correctement définie
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
     * 3) Vies (3) + image de coeur (life.png)
     **************************************************/
    let lives = 3;
    const lifeImage = new Image();
    lifeImage.src = "images/life.png";

    /**************************************************
     * 4) État du jeu : score, gameOver
     **************************************************/
    let score = 0;
    let gameOver = false;

    /**************************************************
     * 5) Timer de difficulté (toutes les 15s)
     **************************************************/
    let lastDifficultyIncrease = 0;
    let difficultyInterval = 15000; // 15 secondes

    /**************************************************
     * 6) Images du Décor (Cross-Fade ou non)
     **************************************************/
    const background1 = new Image();
    background1.src = "images/background1.png";

    const background2 = new Image();
    background2.src = "images/background2.png";

    let bg1X = 0, bg2X = 800; // Utiliser la largeur du jeu fixe
    let backgroundSpeed = 2; // Décor lointain

    // Cross-fade décor
    let fade = 0;
    let fadeDuration = 500;
    let fadeStartTime = null;
    let transitionActive = true;

    /**************************************************
     * 7) Sol (Cross-Fade)
     **************************************************/
    const ground1 = new Image();
    ground1.src = "images/surface1.png";

    const ground2 = new Image();
    ground2.src = "images/surface2.png";

    let ground1X1 = 0, ground1X2 = 800;
    let ground2X1 = 0, ground2X2 = 800;
    let groundSpeed = backgroundSpeed * 3;

    const groundY = 350;
    const groundHeight = 50;

    /**************************************************
     * 8) Obstacles
     **************************************************/
    const obstacleImages = [
        { src: "images/obstacle1.png", width: 70, height: 70 }
    ];
    const loadedObstacleImages = [];

    const obstacles = [];
    let obstacleIntervalBase = 2000;
    let obstacleInterval = obstacleIntervalBase;
    let lastObstacleTime = 0;
    let gameSpeed = 5; // Vitesse horizontale de défilement

    /**************************************************
     * 9) Plateformes
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
     * 10) Joueur (3 frames d'animation)
     **************************************************/
    const playerImages = [new Image(), new Image(), new Image()];
    playerImages[0].src = "images/player1.png";
    playerImages[1].src = "images/player2.png";
    playerImages[2].src = "images/player3.png";

    let currentFrame = 0;
    let frameInterval = 100;
    let lastFrameTime = 0;

    /**************************************************
     * 11) Fromages (à ramasser)
     **************************************************/
    const cheeseImage = new Image();
    cheeseImage.src = "images/fromage.png";

    const cheeses = [];
    let cheeseCount = 0; // Nombre de fromages ramassés

    // Apparition (spawn) aléatoire
    let lastCheeseTime = 0;
    let cheeseIntervalBase = 3000;
    let cheeseInterval = cheeseIntervalBase;

    const CHEESE_WIDTH = 32;
    const CHEESE_HEIGHT = 32;

    // On gagne 1 vie tous les 10 fromages
    const CHEESES_FOR_EXTRA_LIFE = 10;

    /**************************************************
     * 12) Audio
     **************************************************/
    // 3 sons : musique, collision, saut
    let music = new Audio();
    music.loop = true;
    music.volume = 0.2;

    // Ajouter des sources multiples pour une meilleure compatibilité
    const mp3Source = document.createElement('source');
    mp3Source.src = "sounds/music.mp3";
    mp3Source.type = "audio/mpeg";
    music.appendChild(mp3Source);

    const oggSource = document.createElement('source');
    oggSource.src = "sounds/music.ogg"; // Assurez-vous que ce fichier existe
    oggSource.type = "audio/ogg";
    music.appendChild(oggSource);

    music.load();

    let outchSound = new Audio("sounds/outch.mp3");
    let jumpSound = new Audio("sounds/jump.mp3");

    // Config audio
    outchSound.volume = 1.0;
    jumpSound.volume = 1.0;

    // Charger les sons
    outchSound.load();
    jumpSound.load();

    /**************************************************
     * 13) Collision “frôlable” (30%)
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
     * 14) Fonction pour réinitialiser la position du joueur
     **************************************************/
    function resetPlayerPosition() {
        console.log("Réinitialisation de la position du joueur.");
        player.x = 50;
        player.y = HEIGHT - 100;
        player.vy = 0;
        player.jumping = false;
        jumpCount = 0;
    }

    /**************************************************
     * 15) Fonction pour redimensionner le canvas
     **************************************************/
    function resizeCanvas() {
        // Définir un ratio pour maintenir l'aspect du jeu (800x400)
        const gameWidth = 800;
        const gameHeight = 400;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        let scale = Math.min(windowWidth / gameWidth, windowHeight / gameHeight);

        // Définir des limites pour le scaleFactor
        scale = Math.max(1, Math.min(scale, 3)); // Ajustez selon vos besoins

        canvas.width = gameWidth * scale;
        canvas.height = gameHeight * scale;

        // Mettre à jour les variables de jeu basées sur le scale
        // Ceci assure que les éléments du jeu s'adaptent à la nouvelle taille
        scaleFactor = scale;
        WIDTH = canvas.width;
        HEIGHT = canvas.height;
        console.log(`Canvas redimensionné : width=${WIDTH}, height=${HEIGHT}, scaleFactor=${scaleFactor}`);

        // Réinitialiser la position du joueur après redimensionnement
        resetPlayerPosition();
    }

    // Dé-bounce pour limiter les redimensionnements excessifs
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 200);
    });
    resizeCanvas();

    /**************************************************
     * 16) Initialisation du jeu
     **************************************************/
    function init() {
        console.log("Initialisation du jeu...");

        // Saut via clavier
        document.addEventListener('keydown', handleJumpKey);

        // Saut via tactile
        document.addEventListener('touchstart', handleTouchJump, { passive: false });

        // Charger toutes les images
        let totalImages = 2 + 2 + 3 + obstacleImages.length + 1 + 1 + 1;
        // 2 BG + 2 ground + 3 player + obstacle + 1 platform + 1 life + 1 cheese = 11

        console.log(`Total images à charger : ${totalImages}`);

        let loadedCount = 0;

        background1.onload = onImgLoad;
        background2.onload = onImgLoad;
        ground1.onload = onImgLoad;
        ground2.onload = onImgLoad;
        platformImage.onload = onImgLoad;
        lifeImage.onload = onImgLoad;
        cheeseImage.onload = onImgLoad;

        playerImages.forEach((img, index) => {
            img.onload = () => {
                console.log(`Image joueur ${index + 1} chargée`);
                onImgLoad();
            };
        });

        obstacleImages.forEach((obs, i) => {
            const img = new Image();
            img.src = obs.src;
            loadedObstacleImages[i] = {
                image: img,
                width: obs.width,
                height: obs.height
            };
            img.onload = () => {
                console.log(`Obstacle ${i + 1} chargé`);
                onImgLoad();
            };
        });

        function onImgLoad() {
            loadedCount++;
            console.log(`Image chargée : ${loadedCount}/${totalImages}`);
            if (loadedCount === totalImages) {
                console.log("Toutes les images sont chargées. Prêt à démarrer.");
                // Démarrer la musique après que toutes les images soient chargées
                music.play().then(() => {
                    console.log("Musique jouée avec succès");
                }).catch(err => {
                    console.log("Impossible de jouer la musique :", err);
                });
                // **IMPORTANT** : Démarrer la boucle de jeu
                requestAnimationFrame(gameLoop);
            }
        }
    }

    /**************************************************
     * 17) Boucle de jeu
     **************************************************/
    function gameLoop(timestamp) {
        if (gameOver) {
            // Rediriger vers la page de fin de jeu avec le score
            window.location.href = `gameover.html?score=${score}`;
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

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

        // Gestion des couteaux
        manageKnives(timestamp);
        updateKnives();
        drawKnives();

        // Collisions
        checkCollisions();        // Obstacles
        checkCheeseCollisions();  // Fromages
        checkKnifeCollisions();   // Couteaux

        afficherScore();
        afficherVies();
        afficherCheeseCount();

        handleDifficulty(timestamp);

        requestAnimationFrame(gameLoop);
    }

    /**************************************************
     * 18) Cross-Fade (Décor & Sol)
     **************************************************/
    function updateFade(timestamp) {
        if (!fadeStartTime) fadeStartTime = timestamp;
        let elapsed = timestamp - fadeStartTime;
        fade = elapsed / fadeDuration;
        if (fade >= 1) {
            fade = 1;
            transitionActive = false;
            console.log("Transition du décor terminée.");
        }
    }

    function updateBackground() {
        bg1X -= backgroundSpeed;
        bg2X -= backgroundSpeed;
        if (bg1X <= -800) bg1X = 800;
        if (bg2X <= -800) bg2X = 800;
    }

    function drawBackgroundCrossFade() {
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle

        ctx.globalAlpha = 1 - fade;
        ctx.drawImage(background1, bg1X, 0, 800, 400);
        ctx.drawImage(background1, bg2X, 0, 800, 400);

        ctx.globalAlpha = fade;
        ctx.drawImage(background2, bg1X, 0, 800, 400);
        ctx.drawImage(background2, bg2X, 0, 800, 400);
        ctx.restore();
    }

    function updateGround() {
        ground1X1 -= groundSpeed;
        ground1X2 -= groundSpeed;
        if (ground1X1 <= -800) ground1X1 = ground1X2 + 800;
        if (ground1X2 <= -800) ground1X2 = ground1X1 + 800;

        ground2X1 -= groundSpeed;
        ground2X2 -= groundSpeed;
        if (ground2X1 <= -800) ground2X1 = ground2X2 + 800;
        if (ground2X2 <= -800) ground2X2 = ground2X1 + 800;
    }

    function drawGroundCrossFade() {
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle

        ctx.globalAlpha = 1 - fade;
        ctx.drawImage(ground1, ground1X1, groundY, 800, groundHeight);
        ctx.drawImage(ground1, ground1X2, groundY, 800, groundHeight);

        ctx.globalAlpha = fade;
        ctx.drawImage(ground2, ground2X1, groundY, 800, groundHeight);
        ctx.drawImage(ground2, ground2X2, groundY, 800, groundHeight);
        ctx.restore();
    }

    /**************************************************
     * 19) Joueur
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
        if (player.y + player.height >= groundY) {
            player.y = groundY - player.height;
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
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle
        ctx.drawImage(
            playerImages[currentFrame],
            player.x,
            player.y,
            player.width,
            player.height
        );
        ctx.restore();
    }

    /**************************************************
     * 20) Double-Saut
     **************************************************/
    function handleJumpKey(e) {
        if (e.code === "Space" || e.code === "ArrowUp") {
            if (jumpCount < 2) {
                // Son de saut
                jumpSound.currentTime = 0;
                jumpSound.play().then(() => {
                    console.log("Son de saut joué.");
                }).catch(err => {
                    console.log("Erreur lors de la lecture du son de saut :", err);
                });

                if (jumpCount === 0) {
                    player.vy = -jumpStrength;
                } else {
                    player.vy = -jumpStrength2;
                }
                jumpCount++;
                player.jumping = true;
                console.log("Saut détecté via clavier");
            }
        }
    }

    function handleTouchJump(e) {
        e.preventDefault();
        if (jumpCount < 2) {
            // Son de saut
            jumpSound.currentTime = 0;
            jumpSound.play().then(() => {
                console.log("Son de saut joué.");
            }).catch(err => {
                console.log("Erreur lors de la lecture du son de saut :", err);
            });

            if (jumpCount === 0) {
                player.vy = -jumpStrength;
            } else {
                player.vy = -jumpStrength2;
            }
            jumpCount++;
            player.jumping = true;
            console.log("Saut détecté via tactile");
        }
    }

    /**************************************************
     * 21) Plateformes
     **************************************************/
    function spawnPlatform() {
        let spawnY = 150 + Math.random() * 100;
        platforms.push({
            x: 800,
            y: spawnY,
            width: PLATFORM_WIDTH,
            height: PLATFORM_HEIGHT
        });
        console.log(`Plateforme créée à Y=${spawnY}`);
    }

    function managePlatforms(timestamp) {
        if (timestamp - lastPlatformTime > platformInterval) {
            spawnPlatform();
            lastPlatformTime = timestamp;
            // Interval aléatoire entre 3s et 6s
            platformInterval = 3000 + Math.random() * 3000;
            console.log(`Nouvel intervalle de plateforme : ${platformInterval}ms`);
        }
    }

    function updatePlatforms() {
        platforms.forEach(p => {
            p.x -= gameSpeed;
        });
        for (let i = platforms.length - 1; i >= 0; i--) {
            if (platforms[i].x + platforms[i].width < 0) {
                platforms.splice(i, 1);
                console.log("Plateforme supprimée");
            }
        }
    }

    function drawPlatforms() {
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle
        platforms.forEach(p => {
            ctx.drawImage(platformImage, p.x, p.y, p.width, p.height);
        });
        ctx.restore();
    }

    /**************************************************
     * 22) Obstacles
     **************************************************/
    function manageObstacles(timestamp) {
        if (timestamp - lastObstacleTime > obstacleInterval) {
            if (loadedObstacleImages.length === 0) {
                console.log("Aucune image d'obstacle chargée.");
                return;
            }
            spawnObstacle();
            lastObstacleTime = timestamp;
            obstacleInterval = obstacleIntervalBase / 2 + Math.random() * obstacleIntervalBase;
            console.log("Obstacle créé");
        }
    }

    function spawnObstacle() {
        let randIndex = Math.floor(Math.random() * loadedObstacleImages.length);
        let obsData = loadedObstacleImages[randIndex];
        obstacles.push({
            x: 800,
            y: groundY - obsData.height,
            width: obsData.width,
            height: obsData.height,
            image: obsData.image
        });
        console.log("Obstacle créé");
    }

    function updateObstacles() {
        obstacles.forEach(obs => {
            obs.x -= gameSpeed;
        });
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].x + obstacles[i].width < 0) {
                obstacles.splice(i, 1);
                score++;
                console.log(`Obstacle passé. Score: ${score}`);
            }
        }
    }

    function drawObstacles() {
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle
        obstacles.forEach(obs => {
            ctx.drawImage(obs.image, obs.x, obs.y, obs.width, obs.height);
        });
        ctx.restore();
    }

    /**************************************************
     * 23) Collisions (obstacles) => Perte de vie
     **************************************************/
    function checkCollisions() {
        for (let obs of obstacles) {
            if (isColliding(player, obs)) {
                // Son de collision
                outchSound.currentTime = 0;
                outchSound.play().then(() => {
                    console.log("Son de collision joué.");
                }).catch(err => {
                    console.log("Erreur lors de la lecture du son de collision :", err);
                });
                console.log("Collision avec un obstacle");

                // On perd 1 vie
                lives--;
                obstacles.splice(obstacles.indexOf(obs), 1);
                console.log(`Vie perdue. Vies restantes : ${lives}`);

                if (lives <= 0) {
                    gameOver = true;
                    console.log("Game Over");
                }
                return;
            }
        }
    }

    /**************************************************
     * 24) Fromages
     **************************************************/
    function manageCheeses(timestamp) {
        if (timestamp - lastCheeseTime > cheeseInterval) {
            spawnCheese();
            lastCheeseTime = timestamp;
            // Interval 2–5s
            cheeseInterval = 2000 + Math.random() * 3000;
            console.log(`Nouvel intervalle de fromage : ${cheeseInterval}ms`);
        }
    }

    function spawnCheese() {
        // Position sur le sol ou un peu plus haut
        const spawnY = groundY - CHEESE_HEIGHT - Math.random() * 100;
        cheeses.push({
            x: 800,
            y: spawnY,
            width: CHEESE_WIDTH,
            height: CHEESE_HEIGHT
        });
        console.log(`Fromage créé à Y=${spawnY}`);
    }

    function updateCheeses() {
        cheeses.forEach(ch => {
            ch.x -= gameSpeed;
        });
        for (let i = cheeses.length - 1; i >= 0; i--) {
            if (cheeses[i].x + cheeses[i].width < 0) {
                cheeses.splice(i, 1);
                console.log("Fromage supprimé");
            }
        }
    }

    function drawCheeses() {
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle
        cheeses.forEach(ch => {
            ctx.drawImage(cheeseImage, ch.x, ch.y, ch.width, ch.height);
        });
        ctx.restore();
    }

    /**************************************************
     * 25) Collision avec Fromages
     **************************************************/
    function checkCheeseCollisions() {
        for (let i = cheeses.length - 1; i >= 0; i--) {
            let ch = cheeses[i];
            if (isColliding(player, ch)) {
                // Ramasse le fromage
                cheeseCount++;
                cheeses.splice(i, 1);
                console.log(`Fromage ramassé. Total : ${cheeseCount}`);

                // Tous les 10 fromages => +1 vie
                if (cheeseCount % CHEESES_FOR_EXTRA_LIFE === 0) {
                    lives++;
                    console.log(`Vie supplémentaire! Total vies : ${lives}`);
                }
            }
        }
    }

    /**************************************************
     * 26) Affichage : score, vies, fromages
     **************************************************/
    function afficherScore() {
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.fillText("Score : " + score, 20, 30);
        ctx.restore();
    }

    function afficherVies() {
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle
        const heartSize = 30;
        const margin = 10;
        for (let i = 0; i < lives; i++) {
            ctx.drawImage(lifeImage, 20 + i * (heartSize + margin), 60, heartSize, heartSize);
        }
        ctx.restore();
    }

    function afficherCheeseCount() {
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.fillText("Fromages : " + cheeseCount, 20, 110);
        ctx.restore();
    }

    /**************************************************
     * 27) Fin de jeu
     **************************************************/
    // La redirection est gérée directement dans la boucle de jeu (gameLoop)

    /**************************************************
     * 28) Afficher le bouton Rejouer (optionnel)
     **************************************************/
    // Si vous souhaitez conserver un bouton de redémarrage en plus de la redirection, vous pouvez conserver cette fonction.
    // Cependant, pour la redirection automatique, cette partie n'est pas nécessaire.

    function afficherRestartButton() {
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.style.display = 'block';
            console.log("Bouton Rejouer affiché.");
        } else {
            console.log("Element 'restartButton' non trouvé.");
        }
    }

    /**************************************************
     * 29) Gestion du Bouton Rejouer
     **************************************************/
    // Si vous choisissez de conserver le bouton de redémarrage, assurez-vous que la redirection automatique n'interfère pas avec lui.

    document.getElementById('restartButton').addEventListener('click', () => {
        console.log("Bouton Rejouer cliqué. Réinitialisation du jeu.");

        // Réinitialiser les variables du jeu
        score = 0;
        lives = 3;
        cheeseCount = 0;
        obstacles.length = 0;
        platforms.length = 0;
        cheeses.length = 0;
        knives.length = 0; // Réinitialiser les couteaux
        gameSpeed = 5;
        obstacleInterval = obstacleIntervalBase;
        platformInterval = platformIntervalBase;
        cheeseInterval = cheeseIntervalBase;
        lastObstacleTime = performance.now();
        lastPlatformTime = performance.now();
        lastCheeseTime = performance.now();
        jumpCount = 0;
        gameOver = false;

        // Masquer le bouton Rejouer
        const restartButton = document.getElementById('restartButton');
        restartButton.style.display = 'none';
        console.log("Bouton Rejouer masqué.");

        // Réinitialiser le canvas
        resizeCanvas();

        // Redémarrer la boucle de jeu
        requestAnimationFrame(gameLoop);
    });

    /**************************************************
     * 30) Gestion de la Difficulté
     **************************************************/
    function handleDifficulty(timestamp) {
        if (timestamp - lastDifficultyIncrease > difficultyInterval) {
            // Augmenter la vitesse
            gameSpeed += 1;
            console.log(`Vitesse du jeu augmentée. Nouvelle vitesse : ${gameSpeed}`);

            // Obstacles plus fréquents
            obstacleIntervalBase = Math.max(500, obstacleIntervalBase - 200);
            console.log(`Intervalle des obstacles ajusté à : ${obstacleIntervalBase}ms`);

            // Plateformes plus fréquentes
            platformIntervalBase = Math.max(2000, platformIntervalBase - 500);
            console.log(`Intervalle des plateformes ajusté à : ${platformIntervalBase}ms`);

            // Fromages plus fréquents
            cheeseIntervalBase = Math.max(1000, cheeseIntervalBase - 200);
            console.log(`Intervalle des fromages ajusté à : ${cheeseIntervalBase}ms`);

            lastDifficultyIncrease = timestamp;
        }
    }

    /**************************************************
     * 32) Ajout de la Mécanique des Couteaux
     **************************************************/
    // 1. Charger l'image du couteau
    const knifeImage = new Image();
    knifeImage.src = "images/knife.png";
    knifeImage.onload = () => {
        console.log("Image couteau chargée.");
    };

    // 2. Tableau pour stocker les couteaux
    const knives = [];

    // 3. Définir l'intervalle de spawn des couteaux
    const knifeSpawnIntervalBase = 5000; // ms (5 secondes)
    let lastKnifeSpawnTime = 0;

    // 4. Fonction pour spawn un couteau
    function spawnKnife() {
        knives.push({
            x: 800, // Position initiale à droite de l'écran
            y: groundY - 50, // Ajustez selon la hauteur du sol et de l'image du couteau
            width: 20, // Largeur du couteau
            height: 90, // Hauteur du couteau
            oscillationAmplitude: 90, // Amplitude de l'oscillation
            oscillationSpeed: 2, // Vitesse de l'oscillation (cycles par seconde)
            initialY: groundY - 50, // Position de base pour l'oscillation
            time: 0 // Temps écoulé pour l'oscillation
        });
        console.log("Couteau spawné.");
    }

    // 5. Fonction pour gérer le spawn des couteaux
    function manageKnives(timestamp) {
        if (timestamp - lastKnifeSpawnTime > knifeSpawnIntervalBase) {
            spawnKnife();
            lastKnifeSpawnTime = timestamp;
            console.log(`Prochain spawn de couteau dans ${knifeSpawnIntervalBase}ms`);
        }
    }

    // 6. Fonction pour mettre à jour les couteaux
    function updateKnives() {
        for (let i = knives.length - 1; i >= 0; i--) {
            let knife = knives[i];
            // Déplacer le couteau vers la gauche
            knife.x -= gameSpeed;
            // Mettre à jour l'oscillation
            knife.time += 0.05; // Ajustez pour changer la vitesse de l'oscillation
            knife.y = knife.initialY + Math.sin(knife.time * knife.oscillationSpeed) * knife.oscillationAmplitude;

            // Supprimer le couteau s'il est hors écran
            if (knife.x + knife.width < 0) {
                knives.splice(i, 1);
                console.log("Couteau supprimé (hors écran).");
            }
        }
    }

    // 7. Fonction pour dessiner les couteaux
    function drawKnives() {
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); // Appliquer l'échelle
        knives.forEach(knife => {
            ctx.drawImage(knifeImage, knife.x, knife.y, knife.width, knife.height);
        });
        ctx.restore();
    }

    /**************************************************
     * 33) Collision avec les Couteaux
     **************************************************/
    function checkKnifeCollisions() {
        for (let i = knives.length - 1; i >= 0; i--) {
            let knife = knives[i];
            if (isColliding(player, knife)) {
                // Son de collision
                outchSound.currentTime = 0;
                outchSound.play().then(() => {
                    console.log("Son de collision joué.");
                }).catch(err => {
                    console.log("Erreur lors de la lecture du son de collision :", err);
                });
                console.log("Collision avec un couteau");

                // On perd 1 vie
                lives--;
                knives.splice(i, 1);
                console.log(`Vie perdue via couteau. Vies restantes : ${lives}`);

                if (lives <= 0) {
                    gameOver = true;
                    console.log("Game Over");
                }
                // Pas de 'return' ici pour permettre de vérifier toutes les collisions
            }
        }
    }

    /**************************************************
     * 34) Fonction de Boucle de Jeu (mise à jour)
     **************************************************/
    // Déjà défini ci-dessus

    /**************************************************
     * 35) Lancement
     **************************************************/
    init();

});

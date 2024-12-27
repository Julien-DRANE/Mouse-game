const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 200;

const sprites = [
    { images: [new Image(), new Image(), new Image()], x: 100, y: 50, frame: 0 },
    { images: [new Image(), new Image(), new Image()], x: 300, y: 100, frame: 0 },
    { images: [new Image(), new Image(), new Image()], x: 500, y: 150, frame: 0 }
];

// Chargement des images pour chaque sprite
sprites.forEach((sprite, index) => {
    sprite.images[0].src = 'mouse1.png';
    sprite.images[1].src = 'mouse2.png';
    sprite.images[2].src = 'mouse3.png';
});

let lastFrameTime = Date.now();

function animate() {
    const now = Date.now();
    const delta = now - lastFrameTime;

    if (delta > 100) { // Mettre à jour les frames toutes les 100ms
        lastFrameTime = now;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Nettoyer le canvas

        sprites.forEach(sprite => {
            sprite.frame = (sprite.frame + 1) % sprite.images.length;
            ctx.drawImage(sprite.images[sprite.frame], sprite.x, sprite.y);
        });
    }

    requestAnimationFrame(animate); // Appel récursif de animate
}

// Commencer l'animation quand toutes les images sont chargées
let loadedImagesCount = 0;
sprites.forEach(sprite => {
    sprite.images.forEach(img => {
        img.onload = () => {
            loadedImagesCount++;
            if (loadedImagesCount === sprites.length * sprite.images.length) {
                animate(); // Lancer l'animation quand toutes les images sont chargées
            }
        };
    });
});

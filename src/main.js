/*
 * TODO:
 * Improve state handling, ie: player object, flight mode,
 *
 * FEAT:
 * Spelunky-like cave generation,
 * Sound,
 * Multiple levels w/ transition between,
 * Hazards,
 */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const moneyLabel = document.getElementById("money");

const texComponents = 4; // RGBA

const blockTexSize = 16;
const blockTexCount = 16;
const blockTexSpan = blockTexSize * blockTexCount;

const breakingTexSize = 16;
const breakingTexCount = 4;
const breakingTexSpan = breakingTexSize * breakingTexCount;

const vs = `
attribute vec3 uv3;

out vec3 vertUv;
out vec3 vertColor;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vertUv = uv3;
    vertColor = color;
}
`;

const fs = `
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray diffuse;
in vec3 vertUv;
in vec3 vertColor;

out vec4 outColor;

void main() {
    outColor = texture(diffuse, vertUv) * vec4(vertColor, 1.0);
}
`;

const canvas = new OffscreenCanvas(blockTexSpan, blockTexSize);
const ctx2D = canvas.getContext("2d");

let lastTime = 0;
let material;

const loadTexArray = (image, depth, size, span) => {
    ctx2D.clearRect(0, 0, canvas.width, canvas.height);
    ctx2D.drawImage(image, 0, 0);
    const tex = ctx2D.getImageData(0, 0, span, size);

    const texData = new Uint8Array(texComponents * span * size);

    // The loaded texture is layed out in rows of the full texture.
    // Convert it to be stored in rows of each individual textured.
    let i = 0;
    for (let z = 0; z < depth; z++)
    for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
        const pixelI = ((x + z * size) + y * span) * texComponents;
        texData[i] = tex.data[pixelI];
        texData[i + 1] = tex.data[pixelI + 1];
        texData[i + 2] = tex.data[pixelI + 2];
        texData[i + 3] = tex.data[pixelI + 3];

        i += texComponents;
    }

    const texture = new THREE.DataArrayTexture(texData, size, size, depth);
    texture.needsUpdate = true;

    return texture;
}

// Create a random number generator using the "Simple Fast Counter"
// algorithm. Uses a 128bit seed provided in 4 parts (a, b, c, d).
const sfc32 = (a, b, c, d) => {
    return () => {
        // >>>= 0 and | 0 cause interpreter to switch
        // numbers to int32 mode, useful for performance.
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

let totalTime = 0;
let player;
let input;
let world;
let enemies = [];

// Noise.seed() function only supports 65535 seed values.
const seed = Math.random() * 65536;
let rng = sfc32(0, 0, 0, seed);

const update = (deltaTime) => {
    let oldPlayerMoney = player.money;
    player.update(deltaTime, world, camera, input, enemies);
    if (player.money != oldPlayerMoney) {
        moneyLabel.innerText = `$${player.money}`;
    }

    for (let [_hash, chunk] of world.chunks) {
        chunk.update(world);
    }

    for (let enemy of enemies) {
        enemy.update(deltaTime, world, player);
    }

    input.update();
}

const draw = (time) => {
    requestAnimationFrame(draw);

    const deltaTime = (time - lastTime) * 0.001;
    lastTime = time;

    if (!document.hasFocus() && totalTime != 0) return;
    if (isNaN(deltaTime)) return;
    totalTime += deltaTime;

    update(deltaTime);

    renderer.render(scene, camera);
}

const setup = async () => {
    const hud = document.getElementById("hud");
    hud.style.display = "flex";

    const bgColor = 0x492514;
    scene.background = new THREE.Color(bgColor);

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const imageLoader = new THREE.ImageLoader();
    const image = await imageLoader.loadAsync("res/blocks.png");
    const breakingImage = await imageLoader.loadAsync("res/breaking.png");

    const texture = loadTexArray(image, blockTexCount, blockTexSize, blockTexSpan);
    const breakingTexture = loadTexArray(breakingImage, breakingTexCount, breakingTexSize, breakingTexSpan);

    material = new THREE.ShaderMaterial({
        uniforms: {
            diffuse: { value: texture },
        },
        vertexColors: true,
        vertexShader: vs,
        fragmentShader: fs,
        glslVersion: THREE.GLSL3,
    });

    noise.seed(seed);

    world = new World(16, 4);
    world.generate(rng);

    const playerSpawn = world.getPlayerSpawnPos();
    player = new Player(playerSpawn.x, playerSpawn.y, playerSpawn.z, breakingTexture);

    input = new Input();
    const onMouseMove = e => {
        player.onMouseMove(e, camera);
    }
    input.addListeners(onMouseMove);

    draw();
}

setup();
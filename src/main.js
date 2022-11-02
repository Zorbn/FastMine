/*
 * FEAT:
 * Footsteps and block breaking sounds,
 * Multiple levels w/ transition between,
 * Main menu/and death screen for when player dies.
 */

import * as THREE from "../deps/three.js";
import { BlockBreakProvider, breakingTexCount } from "./blockBreakProvider.js";
import { World } from "./world.js";
import { Player } from "./player.js";
import { Input } from "./input.js";
import { EnemyMiner } from "./enemyMiner.js";
import { audioLoader, ghostMinerModel } from "./resources.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const moneyLabel = document.getElementById("money");
const healthImage = document.getElementById("health");
const healthBackground = document.getElementById("health-background");
const healthBarWidth = 10;

const texComponents = 4; // RGBA

const blockTexSize = 16;
const blockTexCount = 16;
const blockTexSpan = blockTexSize * blockTexCount;

const breakingTexSize = 16;
const breakingTexSpan = breakingTexSize * breakingTexCount;

const canvas = new OffscreenCanvas(blockTexSpan, blockTexSize);
const ctx2D = canvas.getContext("2d");

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

// Noise.seed() function only supports 65535 seed values.
const seed = Math.random() * 65536;
const rng = sfc32(0, 0, 0, seed);

let lastTime = 0;
let totalTime = 0;
let player;
let input;
let world;
let enemies = [];
let blockBreakProvider;

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

const updateHealthBar = () => {
    let newWidth = player.health * 0.01 * healthBarWidth;
    healthImage.style.width = `${newWidth}rem`;
}

const updateMoneyLabel = () => {
    moneyLabel.innerText = `$${player.money}`;
}

const update = (deltaTime) => {
    blockBreakProvider.preUpdate();

    let oldPlayerMoney = player.money;
    let oldPlayerHealth = player.health;

    player.update(deltaTime, scene, world, camera, input, enemies, blockBreakProvider);

    for (let [_hash, chunk] of world.chunks) {
        chunk.update(world);
    }

    for (let enemy of enemies) {
        enemy.update(deltaTime, world, player, blockBreakProvider);
    }

    input.update();

    blockBreakProvider.postUpdate();

    if (player.money != oldPlayerMoney) {
        updateMoneyLabel();
    }
    if (player.health != oldPlayerHealth) {
        updateHealthBar();
    }
}

const draw = (time) => {
    requestAnimationFrame(draw);

    const deltaTime = (time - lastTime) * 0.001;
    lastTime = time;

    // Pause game when player is not interacting with the page.
    if (!document.hasFocus() && totalTime != 0) return;
    // Ignore outlier delta time values.
    if (isNaN(deltaTime) || deltaTime > 0.100) return;
    totalTime += deltaTime;

    update(deltaTime);

    renderer.render(scene, camera);
}

const setup = async () => {
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

    const chunkTexture = loadTexArray(image, blockTexCount, blockTexSize, blockTexSpan);
    const breakingTexture = loadTexArray(breakingImage, breakingTexCount, breakingTexSize, breakingTexSpan);

    blockBreakProvider = new BlockBreakProvider(scene, breakingTexture, 100);

    input = new Input();
    const onMouseMove = e => {
        player.onMouseMove(e, camera);
    }
    const onFirstClick = () => {
        const listener = new THREE.AudioListener();
        camera.add(listener);

        const ghostMinerAmbientSound = new THREE.PositionalAudio(listener);
        audioLoader.load("res/ghostMinerAmbientSound.ogg", (buffer) => {
            ghostMinerAmbientSound.setBuffer(buffer);
            ghostMinerAmbientSound.setLoop(true);
            ghostMinerAmbientSound.setRefDistance(1);
            ghostMinerAmbientSound.play();
            ghostMinerModel.add(ghostMinerAmbientSound);

            for (let enemy of enemies) {
                enemy.mesh.add(ghostMinerAmbientSound);
            }
        });
    }
    input.addListeners(onMouseMove, onFirstClick);

    noise.seed(seed);

    const mapSizeInChunks = 4;
    const chunkCount = mapSizeInChunks * mapSizeInChunks * mapSizeInChunks;
    world = new World(16, mapSizeInChunks);

    const spawnPoints = world.generate(rng, scene, chunkTexture);
    const playerSpawnI = Math.floor(rng() * chunkCount);
    const avgEnemyCount = 10;

    for (let i = 0; i < chunkCount; i++) {
        if (i == playerSpawnI) {
            const playerSpawn = spawnPoints[i];
            player = new Player(playerSpawn.x, playerSpawn.y, playerSpawn.z);
            continue;
        }

        if (rng() < avgEnemyCount / chunkCount) {
            const enemySpawn = spawnPoints[i];
            enemies.push(new EnemyMiner(enemySpawn.x + 0.5, enemySpawn.y + 0.5, enemySpawn.z + 0.5, scene));
        }
    }

    updateMoneyLabel();
    updateHealthBar();

    draw();

    const hud = document.getElementById("hud");
    hud.style.display = "flex";
    healthBackground.style.width = `${healthBarWidth}rem`;
}

setup();
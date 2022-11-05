/*
 * FEAT:
 * Move between levels when clicking hatch.
 */

import * as THREE from "../deps/three.js";
import { BlockInteractionProvider } from "./blockInteractionProvider.js";
import { World } from "./world.js";
import { Player } from "./player.js";
import { Input } from "./input.js";
import { EnemyMiner } from "./enemyMiner.js";
import { loadResources, chunkTexture } from "./resources.js";
import { Hatch } from "./hatch.js";
import { indexTo3D } from "./gameMath.js";
import { blocks } from "./blocks.js";
import { Radar } from "./radar.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const moneyLabel = document.getElementById("money");
const hud = document.getElementById("hud");
const menu = document.getElementById("menu");
const healthImage = document.getElementById("health");
const healthBackground = document.getElementById("health-background");
const healthBarWidth = 10;

const gameStates = {
    menu: 0,
    inGame: 1,
};

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
// Used for gameplay related rng, visual-only rng uses standard Math.random().
const seed = Math.random() * 65536;
const rng = sfc32(0, 0, 0, seed);

let lastTime = 0;
let totalTime = 0;
let listener;
let player;
let hatch;
let input;
let world;
let enemies = [];
let blockInteractionProvider;
let state = gameStates.menu;
let radar;

const updateHealthBar = () => {
    let newWidth = player.health * 0.01 * healthBarWidth;
    healthImage.style.width = `${newWidth}rem`;
}

const updateMoneyLabel = () => {
    moneyLabel.innerText = `$${player.money}`;
}

const update = (deltaTime) => {
    blockInteractionProvider.preUpdate();

    let oldPlayerMoney = player.money;
    let oldPlayerHealth = player.health;

    player.update(deltaTime, scene, world, camera, input, enemies, blockInteractionProvider, listener);

    for (let [_hash, chunk] of world.chunks) {
        chunk.update(world);
    }

    for (let enemy of enemies) {
        enemy.update(deltaTime, world, player, blockInteractionProvider);
    }

    hatch.update();

    input.update();

    blockInteractionProvider.postUpdate();

    if (player.money != oldPlayerMoney) {
        updateMoneyLabel();
    }
    if (player.health != oldPlayerHealth) {
        if (player.health <= 0) {
            input.unlockPointer();
            setMenuEnabled(true);
            state = gameStates.menu;
        }

        updateHealthBar();
    }
}

const draw = (time) => {
    if (state == gameStates.inGame) {
        requestAnimationFrame(draw);
    } else {
        destroyMap();
        return;
    }

    const deltaTime = (time - lastTime) * 0.001;
    lastTime = time;

    // Pause game when player is not interacting with the page.
    if (!document.hasFocus() && totalTime != 0) return;
    // Ignore outlier delta time values.
    if (isNaN(deltaTime) || deltaTime > 0.100) return;
    totalTime += deltaTime;

    update(deltaTime);

    radar.draw(player, hatch, enemies);

    renderer.render(scene, camera);
}

const setMenuEnabled = (enabled) => {
    if (enabled) {
        hud.style.display = "none";
        menu.style.display = "flex";
    } else {
        hud.style.display = "flex";
        menu.style.display = "none";
    }
}

const initMap = () => {
    noise.seed(seed);

    const mapSizeInChunks = 4;
    const chunkCount = mapSizeInChunks * mapSizeInChunks * mapSizeInChunks;
    world = new World(16, mapSizeInChunks);
    world.generate(rng, scene, chunkTexture);

    const playerSpawnI = Math.floor(rng() * chunkCount);
    const playerSpawnChunk = indexTo3D(playerSpawnI, mapSizeInChunks);
    const playerSpawn = world.getSpawnPos(playerSpawnChunk.x, playerSpawnChunk.y, playerSpawnChunk.z, true);

    const hatchSpawnI = Math.floor(rng() * chunkCount);
    const hatchSpawnChunk = indexTo3D(hatchSpawnI, mapSizeInChunks);
    const hatchSpawn = world.getSpawnPos(hatchSpawnChunk.x, hatchSpawnChunk.y, hatchSpawnChunk.z, true);

    const avgEnemyCount = 32;
    const minEnemyDistance = 8;

    player = new Player(playerSpawn.x, playerSpawn.y, playerSpawn.z);

    while (world.getBlock(hatchSpawn.x, hatchSpawn.y - 1, hatchSpawn.z) == blocks.air.id) {
        hatchSpawn.y--;
    }

    hatch = new Hatch(hatchSpawn.x, hatchSpawn.y, hatchSpawn.z, scene);

    for (let i = 0; i < chunkCount; i++) {
        const chunkPos = indexTo3D(i, mapSizeInChunks);

        if (i == playerSpawnI || i == hatchSpawnI) {
            continue;
        }

        if (rng() < (avgEnemyCount - enemies.length) / avgEnemyCount) {
            const enemySpawn = world.getSpawnPos(chunkPos.x, chunkPos.y, chunkPos.z, false);

            let distX = player.x - enemySpawn.x;
            let distY = player.y - enemySpawn.y;
            let distZ = player.z - enemySpawn.z;

            let distMag = Math.sqrt(distX * distX + distY * distY + distZ * distZ);

            if (distMag >= minEnemyDistance && enemySpawn.succeeded) {
                enemies.push(new EnemyMiner(enemySpawn.x, enemySpawn.y, enemySpawn.z, scene, listener));
            }
        }
    }

    const onMouseMove = e => {
        player.onMouseMove(e, camera);
    }

    input.addListeners(onMouseMove);

    updateMoneyLabel();
    updateHealthBar();

    healthBackground.style.width = `${healthBarWidth}rem`;
}

const destroyMap = () => {
    world.destroy(scene);

    while (enemies.length > 0) {
        enemies.pop().destroy(scene);
    }

    hatch.destroy();

    input.removeListeners();
}

const setup = async () => {
    const bgColor = 0x492514;
    scene.background = new THREE.Color(bgColor);

    document.body.appendChild(renderer.domElement);

    const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener("resize", onResize);

    onResize();

    input = new Input();

    listener = new THREE.AudioListener();
    camera.add(listener);
    await loadResources(listener);

    radar = new Radar();

    blockInteractionProvider = new BlockInteractionProvider(scene, 100, listener);
}

const onClick = () => {
    if (state != gameStates.menu) return;

    state = gameStates.inGame;
    initMap();
    draw();
    setMenuEnabled(false);
}
const onFirstClick = async () => {
    document.removeEventListener("click", onFirstClick);
    document.addEventListener("click", onClick);
    await setup();
    onClick();
};
document.addEventListener("click", onFirstClick);
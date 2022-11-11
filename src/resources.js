import * as THREE from "../deps/three.js";
import { OBJLoader } from "../deps/OBJLoader.js";
import { breakingTexCount } from "./blockInteractionProvider.js";

export const textureLoader = new THREE.TextureLoader();

const ghostMinerTexture = textureLoader.load("res/ghostMinerTexture.png");
ghostMinerTexture.magFilter = THREE.NearestFilter;
ghostMinerTexture.minFilter = THREE.NearestFilter;
const ghostMinerMaterial = new THREE.MeshBasicMaterial({ map: ghostMinerTexture });

const hatchTexture = textureLoader.load("res/hatchTexture.png");
hatchTexture.magFilter = THREE.NearestFilter;
hatchTexture.minFilter = THREE.NearestFilter;
const hatchMaterial = new THREE.MeshBasicMaterial({ map: hatchTexture, color: 0xbbbbbb });

export const objLoader = new OBJLoader();
export let ghostMinerModel;
objLoader.load("res/ghostMiner.obj", (obj) => {
    obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.material = ghostMinerMaterial;
        }
    });
    ghostMinerModel = obj;
}, () => { }, () => { });

export let hatchModel;
objLoader.load("res/hatch.obj", (obj) => {
    obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.material = hatchMaterial;
        }
    });
    hatchModel = obj;
}, () => { }, () => { });


const blockTexSize = 16;
const blockTexCount = 16;
const blockTexSpan = blockTexSize * blockTexCount;

const breakingTexSize = 16;
const breakingTexSpan = breakingTexSize * breakingTexCount;

export const audioLoader = new THREE.AudioLoader();
export const imageLoader = new THREE.ImageLoader();

const texComponents = 4; // RGBA

const canvas = new OffscreenCanvas(blockTexSpan, blockTexSize);
const ctx2D = canvas.getContext("2d");

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

export let chunkTexture;
export let breakingTexture;

export let blockBreakAudioBuffer;
export let blockPlaceAudioBuffer;
export let playerStepSound;
export let ghostMinerAmbientAudioBuffer;

export const loadResources = async (listener) => {
    ghostMinerAmbientAudioBuffer = await audioLoader.loadAsync("res/ghostMinerAmbientSound.ogg");
    blockBreakAudioBuffer = await audioLoader.loadAsync("res/blockBreakSound.ogg");
    blockPlaceAudioBuffer = await audioLoader.loadAsync("res/blockPlaceSound.ogg");
    playerStepSound = new THREE.PositionalAudio(listener);
    playerStepSound.setBuffer(await audioLoader.loadAsync("res/playerStepSound.ogg"));
    playerStepSound.setRefDistance(1);
    playerStepSound.setVolume(2);

    const blocksImage = await imageLoader.loadAsync("res/blocks.png");
    const breakingImage = await imageLoader.loadAsync("res/breaking.png");

    chunkTexture = loadTexArray(blocksImage, blockTexCount, blockTexSize, blockTexSpan);
    breakingTexture = loadTexArray(breakingImage, breakingTexCount, breakingTexSize, breakingTexSpan);
}

export const createGhostMinerAmbientSound = (listener) => {
    const ghostMinerAmbientSound = new THREE.PositionalAudio(listener);
    ghostMinerAmbientSound.setBuffer(ghostMinerAmbientAudioBuffer);
    ghostMinerAmbientSound.setLoop(true);
    ghostMinerAmbientSound.setRefDistance(1);
    ghostMinerAmbientSound.setVolume(0.5);
    ghostMinerAmbientSound.play();
    return ghostMinerAmbientSound;
}

export const disposeResources = () => {
    ghostMinerMaterial.dispose();
}
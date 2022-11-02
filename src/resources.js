import * as THREE from "../deps/three.js";
import { OBJLoader } from "../deps/OBJLoader.js";

export const textureLoader = new THREE.TextureLoader();
export const ghostMinerTexture = textureLoader.load("res/ghostMinerTexture.png");
ghostMinerTexture.magFilter = THREE.NearestFilter;
ghostMinerTexture.minFilter = THREE.NearestFilter;
const ghostMinerMaterial = new THREE.MeshBasicMaterial({ map: ghostMinerTexture });

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

export let ghostMinerAmbientAudioBuffer;
export const setGhostMinerAmbientAudioBuffer = (buffer) => {
    ghostMinerAmbientAudioBuffer = buffer;
}
export const createGhostMinerAmbientSound = (listener) => {
    const ghostMinerAmbientSound = new THREE.PositionalAudio(listener);
    ghostMinerAmbientSound.setBuffer(ghostMinerAmbientAudioBuffer);
    ghostMinerAmbientSound.setLoop(true);
    ghostMinerAmbientSound.setRefDistance(1);
    ghostMinerAmbientSound.setVolume(1);
    ghostMinerAmbientSound.play();
    return ghostMinerAmbientSound;
}

export const audioLoader = new THREE.AudioLoader();
export let blockBreakAudioBuffer;

export const setBlockBreakAudioBuffer = (buffer) => {
    blockBreakAudioBuffer = buffer;
}

export let blockPlaceAudioBuffer;

export const setBlockPlaceAudioBuffer = (buffer) => {
    blockPlaceAudioBuffer = buffer;
}

export const disposeResources = () => {
    ghostMinerMaterial.dispose();
}
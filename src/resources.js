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
    ghostMinerModel = obj
}, () => { }, () => { });

export const disposeResources = () => {
    ghostMinerMaterial.dispose();
}
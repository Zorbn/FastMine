import * as THREE from "../deps/three.js";
import { hatchModel } from "./resources.js";

const meshYOffset = 0.5;

export class Hatch {
    constructor(x, y, z, scene) {
        this.mesh = new THREE.Object3D().copy(hatchModel);
        this.mesh.position.x = x;
        this.mesh.position.y = y - meshYOffset;
        this.mesh.position.z = z;

        scene.add(this.mesh);
    }

    destroy = (scene) => {
        scene.remove(this.mesh);
    }
}
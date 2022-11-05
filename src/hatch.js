import * as THREE from "../deps/three.js";
import { hatchModel } from "./resources.js";

const meshYOffset = 0.5;

export class Hatch {
    constructor(x, y, z, scene) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.mesh = new THREE.Object3D().copy(hatchModel);

        scene.add(this.mesh);
    }

    update = () => {
        this.mesh.position.x = this.x;
        this.mesh.position.y = this.y - meshYOffset;
        this.mesh.position.z = this.z;
    }

    destroy = (scene) => {
        scene.remove(this.mesh);
    }
}
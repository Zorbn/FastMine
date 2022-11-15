import * as THREE from "../deps/three.js";
import { blocks, blocksById } from "./blocks.js";
import { directionVecs } from "./direction.js";
import { cubeMesh } from "./cubeMesh.js";
import { crossMesh } from "./crossMesh.js";

const shadeNoiseScale = 0.2;
const caveNoiseScale = 0.1;
const caveNoiseSolidThreshold = 0.4;
const caveNoiseDecorationThreshold = 0.45;

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

    if (outColor.a < 0.5) {
        discard;
    }
}
`;

export class Chunk {
    constructor(size, x, y, z, scene, texture) {
        this.chunkX = x;
        this.chunkY = y;
        this.chunkZ = z;
        this.size = size;
        this.data = new Array(size * size * size);
        this.shadeNoise = new Array(size * size * size);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                diffuse: { value: texture },
            },
            vertexColors: true,
            vertexShader: vs,
            fragmentShader: fs,
            glslVersion: THREE.GLSL3,
        });
        this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
        this.mesh.geometry.dynamic = true;
        scene.add(this.mesh);

        this.needsUpdate = true;
    }

    getBlockIndex = (x, y, z) => {
        return x + y * this.size + z * this.size * this.size;
    }

    setBlock = (x, y, z, type) => {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) return false;

        this.data[this.getBlockIndex(x, y, z)] = type;
        this.needsUpdate = true;

        return true;
    }

    getBlock = (x, y, z) => {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) return blocks.air.id;

        return this.data[this.getBlockIndex(x, y, z)];
    }

    update = (world) => {
        if (this.needsUpdate) {
            this.updateMesh(world);
            this.needsUpdate = false;
        }
    }

    updateMesh = (world) => {
        let vertices = [];
        let uvs = [];
        let indices = [];
        let colors = [];

        let vertexComponentI = 0;
        let vertexI = 0;
        let indexI = 0;

        // Generate the mesh for the chunk's blocks.
        for (let z = 0; z < this.size; z++)
        for (let y = 0; y < this.size; y++)
        for (let x = 0; x < this.size; x++) {
            let worldX = x + this.chunkX * this.size;
            let worldY = y + this.chunkY * this.size;
            let worldZ = z + this.chunkZ * this.size;
            const block = world.getBlock(worldX, worldY, worldZ);
            const noiseValue = this.shadeNoise[x + y * this.size + z * this.size * this.size];


            // Don't render air.
            if (block == blocks.air.id) continue;

            let mesh;
            let cullFaces;

            if (blocksById.get(block).transparent) {
                mesh = crossMesh;
                cullFaces = false;
            } else {
                mesh = cubeMesh;
                cullFaces = true;
            }

            const faces = mesh.vertices.length;

            for (let face = 0; face < faces; face++) {
                // Only generate faces that will be visible when culling is enabled.
                const dir= directionVecs[face];
                if (!cullFaces || !world.isBlockOccupied(worldX + dir[0], worldY + dir[1], worldZ + dir[2], false)) {
                    for (let ii = 0; ii < 6; ii++) {
                        indices[indexI] = mesh.indices[face][ii] + vertexI;
                        indexI++;
                    }

                    for (let vi = 0; vi < 4; vi++) {
                        // Add vertex x, y, and z for this face.
                        vertices[vertexComponentI] = mesh.vertices[face][vi * 3] + worldX;
                        vertices[vertexComponentI + 1] = mesh.vertices[face][vi * 3 + 1] + worldY;
                        vertices[vertexComponentI + 2] = mesh.vertices[face][vi * 3 + 2] + worldZ;

                        // Add UV x and y for this face.
                        uvs[vertexComponentI] = mesh.uvs[face][vi * 2];
                        uvs[vertexComponentI + 1] = mesh.uvs[face][vi * 2 + 1];
                        // The UV's z is the index of it's texture.
                        uvs[vertexComponentI + 2] = block;

                        // Add color for this face.
                        let faceColor = mesh.colors[face] * 0.9 + noiseValue * 0.1;
                        colors[vertexComponentI] = faceColor;
                        colors[vertexComponentI + 1] = faceColor;
                        colors[vertexComponentI + 2] = faceColor;

                        vertexComponentI += 3;
                        vertexI++;
                    }
                }
            }
        }

        this.mesh.geometry.setIndex(indices);
        this.mesh.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
        this.mesh.geometry.setAttribute("uv3", new THREE.BufferAttribute(new Float32Array(uvs), 3));
        this.mesh.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
        this.mesh.geometry.verticesNeedUpdate = true;
    }

    generate = (rng, mapSize) => {
        this.data.length = this.size * this.size * this.size;
        this.data.fill(blocks.air.id);

        for (let z = 0; z < this.size; z++)
        for (let y = 0; y < this.size; y++)
        for (let x = 0; x < this.size; x++) {
            const worldX = x + this.chunkX * this.size;
            const worldY = y + this.chunkY * this.size;
            const worldZ = z + this.chunkZ * this.size;

            const shadeNoiseValue = noise.simplex3(worldX * shadeNoiseScale, worldY * shadeNoiseScale, worldZ * shadeNoiseScale);
            this.shadeNoise[x + y * this.size + z * this.size * this.size] = shadeNoiseValue;

            if (worldX == 0 || worldX == mapSize - 1 ||
                worldY == 0 || worldY == mapSize - 1 ||
                worldZ == 0 || worldZ == mapSize - 1) {
                this.setBlock(x, y, z, blocks.barrier.id);
                continue;
            }

            const noiseValue = noise.simplex3(worldX * caveNoiseScale, worldY * caveNoiseScale, worldZ * caveNoiseScale);

            if (noiseValue < caveNoiseSolidThreshold) {
                let randNum = rng();
                let block = blocks.dirt.id;

                if (randNum < 0.002) {
                    block = blocks.emerald.id;
                } else if (randNum < 0.03) {
                    block = blocks.iron.id;
                } else if (randNum < 0.07) {
                    block = blocks.coal.id;
                }

                this.setBlock(x, y, z, block);
            } else if (noiseValue < caveNoiseDecorationThreshold && rng() < 0.2) {
                let block = blocks.air.id;

                if (this.shouldGenerateSolid(worldX, worldY - 1, worldZ)) {
                    block = blocks.greenMushroom.id;
                } else if (this.shouldGenerateSolid(worldX, worldY + 1, worldZ)) {
                    block = blocks.redMushroom.id;
                }

                if (block != blocks.air.id) {
                    this.setBlock(x, y, z, block);
                }
            }
        }
    }

    shouldGenerateSolid = (worldX, worldY, worldZ) => {
        const noiseValue = noise.simplex3(worldX * caveNoiseScale, worldY * caveNoiseScale, worldZ * caveNoiseScale);
        return noiseValue < caveNoiseSolidThreshold;
    }

    destroy = (scene) => {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        scene.remove(this.mesh);
    }
}
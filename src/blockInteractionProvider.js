import * as THREE from "../deps/three.js";
import { blocks, blocksById } from "./blocks.js";
import { hashVector } from "./gameMath.js";
import { blockBreakAudioBuffer, blockPlaceAudioBuffer } from "./resources.js";
import { breakingTexture } from "./resources.js";

export const breakingTexCount = 4;
const breakingMeshSize = 1;
const breakingMeshPaddedSize = breakingMeshSize + 0.005;

export class BlockInteractionProvider {
    constructor(scene, maxBreakingBlocks, listener) {
        this.breakingBlocks = new Map();

        const breakingVs = `
        out vec2 vertUv;
        flat out int instId;

        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            instId = gl_InstanceID;
            vertUv = uv;
        }
        `;

        const breakingFs = `
        precision highp float;
        precision highp int;
        precision highp sampler2DArray;

        uniform sampler2DArray diffuse;
        uniform int depth[${maxBreakingBlocks}];
        in vec2 vertUv;
        flat in int instId;

        out vec4 outColor;

        void main() {
            outColor = texture(diffuse, vec3(vertUv, depth[instId]));

            if (outColor.a < 0.1) {
                discard;
            }
        }
        `;

        this.breakingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                diffuse: { value: breakingTexture },
                depth: { value: new Array(maxBreakingBlocks) },
            },
            vertexShader: breakingVs,
            fragmentShader: breakingFs,
            glslVersion: THREE.GLSL3,
        });

        this.breakingMesh = new THREE.InstancedMesh(
            new THREE.BoxGeometry(
                breakingMeshPaddedSize,
                breakingMeshPaddedSize,
                breakingMeshPaddedSize
            ), this.breakingMaterial, maxBreakingBlocks);
        this.breakingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        this.listener = listener;
        this.usedAudios = [];
        this.freeAudios = [];

        scene.add(this.breakingMesh);
    }

    playSound = (soundBuffer, x, y, z) => {
        let audio = this.freeAudios.pop();
        if (audio == undefined) {
            audio = new THREE.PositionalAudio(this.listener);
            audio.setRefDistance(1);
            audio.detune = Math.random() * 400;
            audio.setVolume(4);
        }
        audio.setBuffer(soundBuffer);
        audio.x = x + 0.5;
        audio.y = y + 0.5;
        audio.z = z + 0.5;
        audio.play();
        this.usedAudios.push(audio);
    }

    mineBlock = (world, x, y, z, deltaTime) => {
        let blockId = world.getBlock(x, y, z);
        let blockBeingBroken = blocksById.get(blockId);

        // Negative breakTime signals an unbreakable block.
        if (blockBeingBroken.breakTime < 0) {
            return blocks.air.id;
        }

        let hash = hashVector(x, y, z);
        let breakingBlock = this.breakingBlocks.get(hash);

        if (breakingBlock == undefined) {
            this.breakingBlocks.set(hash, {
                progress: 0,
                updatedThisFrame: true,
                id: blockId,
                x,
                y,
                z,
            });

            breakingBlock = this.breakingBlocks.get(hash);
        } else {
            breakingBlock.updatedThisFrame = true;
            let currentId = blockId;

            if (breakingBlock.id != currentId) {
                this.breakingBlocks.delete(hash);
                return breakingBlock.id;
            }
        }

        breakingBlock.progress += deltaTime;

        if (breakingBlock.progress >= blockBeingBroken.breakTime) {
            world.setBlock(x, y, z, blocks.air.id);
            this.breakingBlocks.delete(hash);

            this.playSound(blockBreakAudioBuffer, x, y, z);

            return breakingBlock.id;
        }

        return blocks.air.id;
    }

    placeBlock = (world, x, y, z, type) => {
        world.setBlock(x, y, z, type);
        this.playSound(blockPlaceAudioBuffer, x, y, z);
    }

    preUpdate = () => {
        for (let [_, breakingBlock] of this.breakingBlocks) {
            breakingBlock.updatedThisFrame = false;
        }
    }

    postUpdate = () => {
        let breakingBlockCount = 0;
        for (let [hash, breakingBlock] of this.breakingBlocks) {
            if (!breakingBlock.updatedThisFrame) {
                this.breakingBlocks.delete(hash);
                continue;
            }

            let blockBeingBroken = blocksById.get(breakingBlock.id);
            this.breakingMaterial.uniforms.depth.value[breakingBlockCount] = breakingBlock.progress / blockBeingBroken.breakTime * breakingTexCount;

            this.breakingMesh.setMatrixAt(breakingBlockCount, new THREE.Matrix4().makeTranslation(
                breakingBlock.x + breakingMeshSize * 0.5,
                breakingBlock.y + breakingMeshSize * 0.5,
                breakingBlock.z + breakingMeshSize * 0.5));
            breakingBlockCount++;
        }

        this.breakingMesh.instanceMatrix.needsUpdate = true;
        this.breakingMesh.count = breakingBlockCount;

        for (let i = this.freeAudios.length - 1; i >= 0; i--) {
            let audio = this.freeAudios[i];
            if (!audio.isPlaying) {
                this.freeAudios.splice(i, 1);
                this.usedAudios.push(audio);
            }
        }
    }
}
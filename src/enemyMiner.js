import * as THREE from "../deps/three.js";
import { createGhostMinerAmbientSound, ghostMinerModel } from "./resources.js";
import { blocks } from "./blocks.js";
import { gravity, getBlockCollision, isOnGround, overlapsBlock, raycast } from "./physics.js";

const enemyMinerStates = {
    chasing: 0,
    jumping: 1,
    mining: 2,
    resting: 3,
};

const meshYOffset = 0.1;
const animationSpeed = 3;
const legRangeOfMotion = Math.PI * 0.25;
const attackCooldown = 0.5;
const attackDamage = 10;
const detectionRange = 10;
const attackDistance = 0.8;

export class EnemyMiner {
    constructor(x, y, z, scene, listener) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.size = 0.8;
        this.state = enemyMinerStates.resting;
        this.yVelocity = 0;
        this.targetBlockX = 0;
        this.targetBlockY = 0;
        this.targetBlockZ = 0;
        this.newX = this.x;
        this.newY = this.y;
        this.newZ = this.z;
        this.speed = 4;
        this.attackTimer = attackCooldown;

        this.mesh = new THREE.Object3D().copy(ghostMinerModel);
        this.audio = createGhostMinerAmbientSound(listener);
        this.mesh.add(this.audio);
        this.mesh.rotation.y = Math.random() * Math.PI * 2;
        this.leftLeg = this.mesh.getObjectByName("lLeg");
        this.rightLeg = this.mesh.getObjectByName("rLeg");
        this.animationProgress = 0;

        scene.add(this.mesh);
    }

    attack = (player) => {
        if (this.attackTimer <= 0) {
            this.attackTimer = attackCooldown;

            player.damage(attackDamage);
        }
    }

    updateChasing = (deltaTime, world, player, blockInteractionProvider) => {
        let distX = player.x - this.x;
        let distY = player.y - this.y;
        let distZ = player.z - this.z;

        let distMag = Math.sqrt(distX * distX + distY * distY + distZ * distZ);

        let horX = player.x - this.x;
        let horZ = player.z - this.z;

        if (horX == 0 && horZ == 0) return;

        this.mesh.rotation.y = Math.atan2(horX, horZ);

        let horDistMag = Math.sqrt(horX * horX + horZ * horZ);

        if (distMag <= attackDistance) {
            this.attack(player);
            return;
        }

        horX /= horDistMag;
        horZ /= horDistMag;

        this.newX += horX * deltaTime * this.speed;
        this.newZ += horZ * deltaTime * this.speed;

        if (player.y - this.y > 0.2) {
            this.state = enemyMinerStates.jumping;
        }

        this.animationProgress += deltaTime * animationSpeed * this.speed;

        this.leftLeg.rotation.x = Math.sin(this.animationProgress) * legRangeOfMotion;
        this.rightLeg.rotation.x = Math.sin(this.animationProgress + Math.PI) * legRangeOfMotion;
    }

    updateJumping = (deltaTime, world, player, blockInteractionProvider) => {
        let grounded = isOnGround(world, this.x, this.y, this.z, this.size, this.size, this.size);

        if (grounded) {
            this.yVelocity = gravity * 20;
        } else {
            let blockX = Math.floor(this.x);
            let blockZ = Math.floor(this.z);
            let lowerBlockY = Math.floor(this.y - 1);

            if (!overlapsBlock(this.x, this.y, this.z, this.size, this.size, this.size, blockX, lowerBlockY, blockZ) && // Follower won't get stuck inside block.
                world.getBlock(blockX, lowerBlockY, blockZ) == blocks.air.id && // Block is currently empty.
                world.isBlockSupported(blockX, lowerBlockY, blockZ)) {          // Block is supported.
                blockInteractionProvider.placeBlock(world, blockX, lowerBlockY, blockZ, blocks.wood.id);
            }
        }

        if (this.y >= player.y) {
            this.state = enemyMinerStates.chasing;
        }
    }

    updateMining = (deltaTime, world, player, blockInteractionProvider) => {
        let minedBlock = blockInteractionProvider.mineBlock(world, this.targetBlockX, this.targetBlockY, this.targetBlockZ, deltaTime);

        if (world.getBlock(this.targetBlockX, this.targetBlockY, this.targetBlockZ) == blocks.air.id || minedBlock != blocks.air.id) {
            this.state = enemyMinerStates.chasing;
        }
    }

    updateResting = (deltaTime, world, player, blockInteractionProvider) => {
        let distX = player.x - this.x;
        let distY = player.y - this.y;
        let distZ = player.z - this.z;

        let distMag = Math.sqrt(distX * distX + distY * distY + distZ * distZ);

        if (distMag < detectionRange) {
            if (distMag != 0) {
                distX /= distMag;
                distY /= distMag;
                distZ /= distMag;
            }

            // Check if player can be seen by this enemy.
            if (raycast(world, this.x, this.y, this.z, distX, distY, distZ, detectionRange).distance > distMag) {
                this.state = enemyMinerStates.chasing;
            }
        }
    }

    beginMining = (x, y, z) => {
        this.state = enemyMinerStates.mining;
        this.targetBlockX = x;
        this.targetBlockY = y;
        this.targetBlockZ = z;
    }

    update = (deltaTime, world, player, blockInteractionProvider) => {
        this.newX = this.x;
        this.newY = this.y;
        this.newZ = this.z;

        switch (this.state) {
            case enemyMinerStates.chasing:
                this.updateChasing(deltaTime, world, player, blockInteractionProvider);
                break;
            case enemyMinerStates.jumping:
                this.updateJumping(deltaTime, world, player, blockInteractionProvider);
                break;
            case enemyMinerStates.mining:
                this.updateMining(deltaTime, world, player, blockInteractionProvider);
                break;
            case enemyMinerStates.resting:
                this.updateResting(deltaTime, world, player, blockInteractionProvider);
                break;
        }

        this.attackTimer -= deltaTime;

        this.yVelocity -= gravity;
        this.newY += this.yVelocity * deltaTime;

        let yCollision = getBlockCollision(world, this.x, this.newY, this.z, this.size, this.size, this.size);
        if (yCollision != null) {
            this.yVelocity = 0;
            this.newY = this.y;

            if (this.state == enemyMinerStates.jumping && yCollision.y > this.y ||
                this.state == enemyMinerStates.chasing && yCollision.y < this.y && this.y - player.y > 0.2) {
                this.beginMining(yCollision.x, yCollision.y, yCollision.z);
            }
        }

        let xCollision = getBlockCollision(world, this.newX, this.y, this.z, this.size, this.size, this.size);
        if (xCollision != null) {
            this.newX = this.x;

            if (this.state != enemyMinerStates.resting) {
                this.beginMining(xCollision.x, xCollision.y, xCollision.z);
            }
        }

        let zCollision = getBlockCollision(world, this.x, this.y, this.newZ, this.size, this.size, this.size);
        if (zCollision != null) {
            this.newZ = this.z;

            if (this.state != enemyMinerStates.resting) {
                this.beginMining(zCollision.x, zCollision.y, zCollision.z);
            }
        }

        this.x = this.newX;
        this.y = this.newY;
        this.z = this.newZ;

        this.mesh.position.x = this.x;
        this.mesh.position.y = this.y + meshYOffset;
        this.mesh.position.z = this.z;
    }

    destroy = (scene) => {
        this.audio.stop();
        scene.remove(this.mesh);
    }
}
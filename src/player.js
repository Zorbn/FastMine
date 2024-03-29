import * as THREE from "../deps/three.js";
import { gravity, isOnGround, isCollidingWithBlock, overlapsBlock, jumpForce } from "./physics.js";
import { blocks, blocksById } from "./blocks.js";
import { raycast } from "./physics.js";
import { playerStepSound, randomizeDetune } from "./resources.js";
import { debugMode } from "./debug.js";

const mouseSensitivity = 0.002;
const maxLookAngle = Math.PI * 0.5 * 0.99;

const reach = 4;
const scaffoldCost = 5;

export class Player {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.angle = new THREE.Euler(0, Math.random() * Math.PI * 2, 0, "YXZ");

        this.forwardX = 0;
        this.forwardZ = 1;

        this.rightX = 1;
        this.rightZ = 0;

        this.lookX = 0;
        this.lookY = 0;
        this.lookZ = 1;

        this.speed = 6;
        this.size = 0.8;
        this.isFlying = false;
        this.yVelocity = 0;

        this.money = 0;
        this.health = 100;

        this.stepSound = playerStepSound;
    }

    damage = (amount) => {
        this.health -= amount;
    }

    interact = (deltaTime, world, input, blockInteractionProvider) => {
        if (input.isMouseButtonPressed(0)) {
            let rayHit = raycast(world, this.x, this.y, this.z, this.lookX, this.lookY, this.lookZ, reach, true);

            if (rayHit.hit) {
                let minedBlock = blockInteractionProvider.mineBlock(world, rayHit.x, rayHit.y, rayHit.z, deltaTime);

                if (minedBlock != blocks.air.id) {
                    this.money += blocksById.get(minedBlock).value;
                }
            }
        } else if (input.wasMouseButtonPressed(2) && this.money >= scaffoldCost) {
            let rayHit = raycast(world, this.x, this.y, this.z, this.lookX, this.lookY, this.lookZ, reach, true);

            if (rayHit.hit && !overlapsBlock(this.x, this.y, this.z, this.size, this.size, this.size, rayHit.lastX, rayHit.lastY, rayHit.lastZ)) {
                this.money -= scaffoldCost;
                blockInteractionProvider.placeBlock(world, rayHit.lastX, rayHit.lastY, rayHit.lastZ, blocks.metal.id);
            }
        }
    }

    move = (deltaTime, world, camera, input) => {
        let isSneaking = input.isKeyPressed("ShiftLeft");
        let grounded = isOnGround(world, this.x, this.y, this.z, this.size, this.size, this.size);

        let moveForward = 0;
        let moveRight = 0;
        let moveUp = 0;

        if (input.isKeyPressed("KeyW")) {
            moveForward -= 1;
        }

        if (input.isKeyPressed("KeyS")) {
            moveForward += 1;
        }

        if (input.isKeyPressed("KeyA")) {
            moveRight -= 1;
        }

        if (input.isKeyPressed("KeyD")) {
            moveRight += 1;
        }

        if (this.isFlying) {
            if (input.isKeyPressed("Space")) {
                moveUp += 1;
            }

            if (isSneaking) {
                moveUp -= 1;
            }
        } else {
            if (input.isKeyPressed("Space") && grounded) {
                this.yVelocity = jumpForce;
            }
        }

        if (moveForward != 0 || moveRight != 0) {
            let moveMag = Math.sqrt(moveForward * moveForward + moveRight * moveRight);
            moveForward /= moveMag;
            moveRight /= moveMag;
        }

        let speedMultiplier = isSneaking ? 0.5 : 1;
        let currentSpeed = this.speed * speedMultiplier;

        moveForward *= deltaTime;
        moveRight *= deltaTime;
        moveUp *= deltaTime;

        let newX = this.x;
        let newY = this.y;
        let newZ = this.z;

        newX += moveForward * this.forwardX * currentSpeed;
        newX += moveRight * this.rightX * currentSpeed;

        if (isCollidingWithBlock(world, newX, newY, newZ, this.size, this.size, this.size)) {
            newX = this.x;
        } else if (isSneaking && grounded && !isOnGround(world, newX, newY, newZ, this.size, this.size, this.size)) {
            newX = this.x;
        }

        newZ += moveForward * this.forwardZ * currentSpeed;
        newZ += moveRight * this.rightZ * currentSpeed;

        if (isCollidingWithBlock(world, newX, newY, newZ, this.size, this.size, this.size)) {
            newZ = this.z;
        } else if (isSneaking && grounded && !isOnGround(world, newX, newY, newZ, this.size, this.size, this.size)) {
            newZ = this.z;
        }

        if (this.isFlying) {
            this.yVelocity = 0;
            newY += moveUp * currentSpeed;
        } else {
            this.yVelocity -= gravity * deltaTime;
            newY += this.yVelocity * deltaTime;
        }

        if (isCollidingWithBlock(world, newX, newY, newZ, this.size, this.size, this.size)) {
            this.yVelocity = 0;
            newY = this.y;
        }

        if (grounded && (this.x != newX || this.y != newY || this.z != newZ)) {
            if (!this.stepSound.isPlaying) {
                randomizeDetune(this.stepSound);
                this.stepSound.play();
            }
        }

        this.x = newX;
        this.y = newY;
        this.z = newZ;

        camera.position.x = this.x;
        camera.position.y = this.y;
        camera.position.z = this.z;
        camera.quaternion.setFromEuler(this.angle);

        this.stepSound.x = this.x;
        this.stepSound.y = this.y - 0.5;
        this.stepSound.z = this.z;
    }

    update = (deltaTime, world, camera, input, blockInteractionProvider) => {
        this.interact(deltaTime, world, input, blockInteractionProvider);

        if (debugMode && input.wasKeyPressed("KeyF")) {
            this.isFlying = !this.isFlying;
        }

        this.move(deltaTime, world, camera, input);
    }

    onMouseMove = (event, camera) => {
        this.angle.x -= event.movementY * mouseSensitivity;
        this.angle.y -= event.movementX * mouseSensitivity;
        this.angle.x = Math.max(Math.min(this.angle.x, maxLookAngle), -maxLookAngle);

        this.forwardX = Math.sin(this.angle.y);
        this.forwardZ = Math.cos(this.angle.y);

        let sideCameraAngle = this.angle.y + Math.PI / 2;

        this.rightX = Math.sin(sideCameraAngle);
        this.rightZ = Math.cos(sideCameraAngle);

        let worldDir = new THREE.Vector3(0, 0, 0);
        camera.getWorldDirection(worldDir);
        this.lookX = worldDir.x;
        this.lookY = worldDir.y;
        this.lookZ = worldDir.z;
    }
}
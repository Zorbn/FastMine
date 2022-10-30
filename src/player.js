const breakingMeshSize = 1;
const breakingMeshPaddedSize = breakingMeshSize + 0.005;

const gravity = 0.5;
const mouseSensitivity = 0.002;
const maxLookAngle = Math.PI * 0.5 * 0.99;

const reach = 4;
const scaffoldCost = 5;

const breakingVs = `
out vec2 vertUv;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vertUv = uv;
}
`;

const breakingFs = `
precision highp float;
precision highp int;
precision highp sampler2DArray;

uniform sampler2DArray diffuse;
uniform int depth;
in vec2 vertUv;

out vec4 outColor;

void main() {
    outColor = texture(diffuse, vec3(vertUv, depth));

    if (outColor.a < 0.1) {
        discard;
    }
}
`;

class Player {
    constructor(x, y, z, breakingTexture) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.angle = new THREE.Euler(0, 0, 0, "YXZ");

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

        this.breakingBlockX = 0;
        this.breakingBlockY = 0;
        this.breakingBlockZ = 0;
        this.breakingProgress = 0;
        this.blockIdBeingBroken = 0;

        this.breakingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                diffuse: { value: breakingTexture },
                depth: { value: 2 },
            },
            vertexShader: breakingVs,
            fragmentShader: breakingFs,
            glslVersion: THREE.GLSL3,
        });

        this.breakingMesh = new THREE.Mesh(
            new THREE.BoxGeometry(
                breakingMeshPaddedSize,
                breakingMeshPaddedSize,
                breakingMeshPaddedSize
            ), this.breakingMaterial);

        scene.add(this.breakingMesh);

        this.money = 0;
    }

    interact = (deltaTime, world, input) => {
        this.breakingMesh.visible = false;
        let lastBreakingProgress = this.breakingProgress;
        this.breakingProgress = 0;

        if (input.isMouseButtonPressed(0)) {
            let rayHit = raycast(world, this.x, this.y, this.z, this.lookX, this.lookY, this.lookZ, reach);

            if (rayHit.hit) {
                // Check if the player is breaking a new block.
                if (rayHit.x != this.breakingBlockX || rayHit.y != this.breakingBlockY ||
                    rayHit.z != this.breakingBlockZ) {
                    this.breakingBlockX = rayHit.x;
                    this.breakingBlockY = rayHit.y;
                    this.breakingBlockZ = rayHit.z;
                    this.blockIdBeingBroken = world.getBlock(rayHit.x, rayHit.y, rayHit.z);
                    lastBreakingProgress = 0;
                }

                const blockBeingBroken = blocksById.get(this.blockIdBeingBroken);

                this.breakingProgress = lastBreakingProgress + deltaTime;

                // Negative breakTime signals an unbreakable block.
                const unbreakable = blockBeingBroken.breakTime < 0;

                if (unbreakable) {
                    this.breakingProgress = 0;
                }

                if (!unbreakable && this.breakingProgress >= blockBeingBroken.breakTime) {
                    world.setBlock(rayHit.x, rayHit.y, rayHit.z, blocks.air.id);

                    this.money += blockBeingBroken.value;
                    this.breakingProgress = 0;
                }

                this.breakingMaterial.uniforms.depth.value = this.breakingProgress / blockBeingBroken.breakTime * breakingTexCount;
                this.breakingMesh.visible = true;
                this.breakingMesh.position.x = rayHit.x + 0.5;
                this.breakingMesh.position.y = rayHit.y + 0.5;
                this.breakingMesh.position.z = rayHit.z + 0.5;
            }
        } else if (input.wasMouseButtonPressed(2) && this.money >= scaffoldCost) {
            let rayHit = raycast(world, this.x, this.y, this.z, this.lookX, this.lookY, this.lookZ, reach);

            if (rayHit.hit && !overlapsBlock(this.x, this.y, this.z, this.size, this.size, this.size, rayHit.lastX, rayHit.lastY, rayHit.lastZ)) {
                this.money -= scaffoldCost;
                world.setBlock(rayHit.lastX, rayHit.lastY, rayHit.lastZ, blocks.metal.id);
            }
        }
    }

    update = (deltaTime, world, camera, input) => {
        this.interact(deltaTime, world, input);

        if (input.wasKeyPressed("KeyF")) {
            this.isFlying = !this.isFlying;
        }

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

            if (input.isKeyPressed("ShiftLeft")) {
                moveUp -= 1;
            }
        } else {
            if (input.isKeyPressed("Space") && isOnGround(world, this.x, this.y, this.z, this.size, this.size, this.size)) {
                this.yVelocity = gravity * 20;
            }
        }

        if (moveForward != 0 || moveRight != 0) {
            let moveMag = Math.sqrt(moveForward * moveForward + moveRight * moveRight);
            moveForward /= moveMag;
            moveRight /= moveMag;
        }

        moveForward *= deltaTime;
        moveRight *= deltaTime;
        moveUp *= deltaTime;

        let newX = this.x;
        let newY = this.y;
        let newZ = this.z;

        newX += moveForward * this.forwardX * this.speed;
        newX += moveRight * this.rightX * this.speed;

        if (isCollidingWithBlock(world, newX, newY, newZ, this.size, this.size, this.size)) {
            newX = this.x;
        }

        newZ += moveForward * this.forwardZ * this.speed;
        newZ += moveRight * this.rightZ * this.speed;

        if (isCollidingWithBlock(world, newX, newY, newZ, this.size, this.size, this.size)) {
            newZ = this.z;
        }

        if (this.isFlying) {
            this.yVelocity = 0;
            newY += moveUp * this.speed;
        } else {
            this.yVelocity -= gravity;
            newY += this.yVelocity * deltaTime;
        }

        if (isCollidingWithBlock(world, newX, newY, newZ, this.size, this.size, this.size)) {
            this.yVelocity = 0;
            newY = this.y;
        }

        this.x = newX;
        this.y = newY;
        this.z = newZ;

        camera.position.x = this.x;
        camera.position.y = this.y;
        camera.position.z = this.z;
        camera.quaternion.setFromEuler(this.angle);
    }

    onMouseMove = (event, camera) => {
        this.angle.x -= event.movementY * mouseSensitivity;
        this.angle.y -= event.movementX * mouseSensitivity;
        this.angle.x = Math.max(Math.min(this.angle.x, maxLookAngle), -maxLookAngle)

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
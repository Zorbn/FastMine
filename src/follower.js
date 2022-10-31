const followerStates = {
    chasing: 0,
    jumping: 1,
    mining: 2,
};

// TODO: Placeblock & IsBlockSupported (aka has another block next to it)
// API that ensures the position is empty for scaffolding.
class Follower {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.size = 0.8;
        this.state = followerStates.jumping;
        this.yVelocity = 0;
        this.targetBlockX = 0;
        this.targetBlockY = 0;
        this.targetBlockZ = 0;
        this.newX = this.x;
        this.newY = this.y;
        this.newZ = this.z;

        // this.material = new THREE.ShaderMaterial({
        //     uniforms: {
        //         diffuse: { value: breakingTexture },
        //         depth: { value: 2 },
        //     },
        //     vertexShader: breakingVs,
        //     fragmentShader: breakingFs,
        //     glslVersion: THREE.GLSL3,
        // });
        this.material = new THREE.MeshBasicMaterial();

        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(
                this.size,
                this.size,
                this.size,
            ), this.material);

        scene.add(this.mesh);

    }

    updateChasing = (deltaTime, world, player) => {
        let distX = player.x - this.x;
        let distZ = player.z - this.z;

        if (distX == 0 && distZ == 0) return;
        let distMag = Math.sqrt(distX * distX + distZ * distZ);
        if (distMag <= 1) return;
        distX /= distMag;
        distZ /= distMag;

        this.newX += distX * deltaTime;
        this.newZ += distZ * deltaTime;

        if (player.y - this.y > 0.2) {
            this.state = followerStates.jumping;
        }
    }

    updateJumping = (deltaTime, world, player) => {
        let grounded = isOnGround(world, this.x, this.y, this.z, this.size, this.size, this.size);

        if (grounded) {
            this.yVelocity = gravity * 20;
        } else {
            let blockX = Math.floor(this.x);
            let blockZ = Math.floor(this.z);
            let lowerBlockY = Math.floor(this.y - 1);

            if (!overlapsBlock(this.x, this.y, this.z, this.size, this.size, this.size, blockX, lowerBlockY, blockZ) && // Follower won't get stuck inside block.
                world.getBlock(blockX, lowerBlockY, blockZ) == blocks.air.id && // Block is currently empty.
                world.isBlockSupported(blockX, lowerBlockY - 1, blockZ)) {      // Block is supported.
                world.setBlock(blockX, lowerBlockY, blockZ, blocks.wood.id);
            }
        }

        if (this.y >= player.y) {
            this.state = followerStates.chasing;
        }
    }

    updateMining = (deltaTime, world, player) => {
        if (world.getBlock(this.targetBlockX, this.targetBlockY, this.targetBlockZ) == blocks.air.id) {
            this.state = followerStates.chasing;
            return;
        }

        world.setBlock(this.targetBlockX, this.targetBlockY, this.targetBlockZ, blocks.air.id);
    }

    beginMining = (x, y, z) => {
        this.state = followerStates.mining;
        this.targetBlockX = x;
        this.targetBlockY = y;
        this.targetBlockZ = z;
    }

    update = (deltaTime, world, player) => {
        this.newX = this.x;
        this.newY = this.y;
        this.newZ = this.z;

        switch (this.state) {
            case followerStates.chasing:
                this.updateChasing(deltaTime, world, player);
                break;
            case followerStates.jumping:
                this.updateJumping(deltaTime, world, player);
                break;
            case followerStates.mining:
                this.updateMining(deltaTime, world, player);
                break;
        }

        this.yVelocity -= gravity;
        this.newY += this.yVelocity * deltaTime;

        let yCollision = getBlockCollision(world, this.x, this.newY, this.z, this.size, this.size, this.size);
        if (yCollision != null) {
            this.yVelocity = 0;
            this.newY = this.y;

            if (this.state == followerStates.jumping && yCollision.y > this.y ||
                this.state == followerStates.chasing && yCollision.y < this.y && this.y - player.y > 0.2) {
                this.beginMining(yCollision.x, yCollision.y, yCollision.z);
            }
        }

        let xCollision = getBlockCollision(world, this.newX, this.y, this.z, this.size, this.size, this.size);
        if (xCollision != null) {
            this.newX = this.x;
            this.beginMining(xCollision.x, xCollision.y, xCollision.z);
        }

        let zCollision = getBlockCollision(world, this.x, this.y, this.newZ, this.size, this.size, this.size);
        if (zCollision != null) {
            this.newZ = this.z;
            this.beginMining(zCollision.x, zCollision.y, zCollision.z);
        }

        this.x = this.newX;
        this.y = this.newY;
        this.z = this.newZ;

        this.mesh.position.x = this.x;
        this.mesh.position.y = this.y;
        this.mesh.position.z = this.z;
    }

    destroy = () => {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        scene.remove(this.mesh);
    }
}
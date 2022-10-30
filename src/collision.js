// Check every corner of a cubic object for collisions.
const isCollidingWithBlock = (world, x, y, z, sizeX, sizeY, sizeZ) => {
    for (let i = 0; i < 8; i++) {
        let xOff = i % 2 * 2 - 1;
        let yOff = Math.floor(i / 4) * 2 - 1;
        let zOff = Math.floor(i / 2) % 2 * 2 - 1;

        let cornerX = Math.floor(x + sizeX * 0.5 * xOff);
        let cornerY = Math.floor(y + sizeY * 0.5 * yOff);
        let cornerZ = Math.floor(z + sizeZ * 0.5 * zOff);

        if (world.getBlock(cornerX, cornerY, cornerZ) != blocks.air.id) {
            return true;
        }
    }

    return false;
}

// Check every corner of a cubic object to see if it overlaps a certain block.
const overlapsBlock = (x, y, z, sizeX, sizeY, sizeZ, blockX, blockY, blockZ) => {
    let halfSizeX = sizeX * 0.5;
    let halfSizeY = sizeY * 0.5;
    let halfSizeZ = sizeZ * 0.5;

    return x + halfSizeX > blockX && x - halfSizeX < blockX + 1 &&
        y + halfSizeY > blockY && y - halfSizeY < blockY + 1 &&
        z + halfSizeZ > blockZ && z - halfSizeZ < blockZ + 1;
}

const isOnGround = (world, x, y, z, sizeX, sizeY, sizeZ) => {
    let feetHitboxSize = 0.1;
    return isCollidingWithBlock(world, x, y - (sizeY + feetHitboxSize) * 0.5, z, sizeX, feetHitboxSize, sizeZ);
}

const raycast = (world, startX, startY, startZ, dirX, dirY, dirZ, range) => {
    // Prevent initial step from being 0, it creates artifacts in the algorithm.
    // if (startX - Math.floor(startX) == 0) {
    //     startX -= 0.01;
    // }

    // if (startY - Math.floor(startY) == 0) {
    //     startY -= 0.01;
    // }

    // if (startZ - Math.floor(startZ) == 0) {
    //     startZ -= 0.01;
    // }

    const tileDirX = Math.sign(dirX);
    const tileDirY = Math.sign(dirY);
    const tileDirZ = Math.sign(dirZ);

    const stepX = Math.abs(1 / dirX);
    const stepY = Math.abs(1 / dirY);
    const stepZ = Math.abs(1 / dirZ);

    let initialStepX, initialStepY, initialStepZ;

    if (dirX > 0) {
        initialStepX = (Math.ceil(startX) - startX) * stepX;
    } else {
        initialStepX = (startX - Math.floor(startX)) * stepX;
    }

    if (dirY > 0) {
        initialStepY = (Math.ceil(startY) - startY) * stepY;
    } else {
        initialStepY = (startY - Math.floor(startY)) * stepY;
    }

    if (dirZ > 0) {
        initialStepZ = (Math.ceil(startZ) - startZ) * stepZ;
    } else {
        initialStepZ = (startZ - Math.floor(startZ)) * stepZ;
    }

    let distToNextX = initialStepX;
    let distToNextY = initialStepY;
    let distToNextZ = initialStepZ;

    let blockX = Math.floor(startX);
    let blockY = Math.floor(startY);
    let blockZ = Math.floor(startZ);
    let lastX = blockX;
    let lastY = blockY;
    let lastZ = blockZ;

    let lastDistToNext = 0;

    let hitBlock = blocks.air.id;
    while (hitBlock == blocks.air.id && lastDistToNext < range) {
        lastX = blockX;
        lastY = blockY;
        lastZ = blockZ;

        if (distToNextX < distToNextY && distToNextX < distToNextZ) {
            lastDistToNext = distToNextX;
            distToNextX += stepX;
            blockX += tileDirX;
        } else if (distToNextY < distToNextX && distToNextY < distToNextZ) {
            lastDistToNext = distToNextY;
            distToNextY += stepY;
            blockY += tileDirY;
        } else {
            lastDistToNext = distToNextZ;
            distToNextZ += stepZ;
            blockZ += tileDirZ;
        }

        hitBlock = world.getBlock(blockX, blockY, blockZ);
    }

    return {
        hit: hitBlock != blocks.air.id,
        block: hitBlock,
        distance: lastDistToNext,
        x: blockX,
        y: blockY,
        z: blockZ,
        lastX,
        lastY,
        lastZ,
    };
}

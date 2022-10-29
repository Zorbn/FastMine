/*
 * TODO:
 * Refactor this to not be one file,
 * Consider using Vectors instead of x, y, z,
 * Shade each face of the blocks,
 * Better input handling for single clicks,
 * Improve state handling, ie: flight mode,
 *
 * FEAT:
 * Better textures,
 * Spelunky-like cave generation,
 * Ores,
 * Mining delay,
 * Sound,
 * Multiple levels w/ transition between,
 * Hazards,
 */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

const blockTexSize = 16;
const blockCount = 4;
const blockTexSpan = blockTexSize * blockCount;
const texComponents = 4; // RGBA

const vs = `
attribute vec3 uv3;

out vec3 vertUv;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vertUv = uv3;
}
`;

const fs = `
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray diffuse;
in vec3 vertUv;

out vec4 outColor;

void main() {
    outColor = texture(diffuse, vertUv);
}
`;

const direction = {
    forward: 0,
    backward: 1,
    right: 2,
    left: 3,
    up: 4,
    down: 5,
};

const cubeVertices = [
    // Forward
    new Float32Array([
        0, 0, 0,
        0, 1, 0,
        1, 1, 0,
        1, 0, 0,
    ]),
    // Backward
    new Float32Array([
        0, 0, 1,
        0, 1, 1,
        1, 1, 1,
        1, 0, 1,
    ]),
    // Right
    new Float32Array([
        1, 0, 0,
        1, 0, 1,
        1, 1, 1,
        1, 1, 0,
    ]),
    // Left
    new Float32Array([
        0, 0, 0,
        0, 0, 1,
        0, 1, 1,
        0, 1, 0,
    ]),
    // Up
    new Float32Array([
        0, 1, 0,
        0, 1, 1,
        1, 1, 1,
        1, 1, 0,
    ]),
    // Down
    new Float32Array([
        0, 0, 0,
        0, 0, 1,
        1, 0, 1,
        1, 0, 0,
    ]),
];

const cubeUvs = [
    // Forward
    new Float32Array([
        1, 1,
        1, 0,
        0, 0,
        0, 1,
    ]),
    // Backward
    new Float32Array([
        0, 1,
        0, 0,
        1, 0,
        1, 1,
    ]),
    // Right
    new Float32Array([
        1, 1,
        0, 1,
        0, 0,
        1, 0,
    ]),
    // Left
    new Float32Array([
        0, 1,
        1, 1,
        1, 0,
        0, 0,
    ]),
    // Up
    new Float32Array([
        0, 1,
        0, 0,
        1, 0,
        1, 1,
    ]),
    // Down
    new Float32Array([
        0, 1,
        0, 0,
        1, 0,
        1, 1,
    ]),
];

const cubeIndices = [
    [ 0, 1, 2, 0, 2, 3 ], // Forward
    [ 0, 2, 1, 0, 3, 2 ], // Backward
    [ 0, 2, 1, 0, 3, 2 ], // Right
    [ 0, 1, 2, 0, 2, 3 ], // Left
    [ 0, 1, 2, 0, 2, 3 ], // Up
    [ 0, 2, 1, 0, 3, 2 ], // Down
];

const directionVecs = [
    // Forward
    [0, 0, -1],
    // Backward
    [0, 0, 1],
    // Right
    [1, 0, 0],
    // Left
    [-1, 0, 0],
    // Up
    [0, 1, 0],
    // Down
    [0, -1, 0],
];

const canvas = new OffscreenCanvas(blockTexSpan, blockTexSize);
const ctx2D = canvas.getContext("2d");

const worldSize = 16;

let world = [];

let lastTime = 0;

const getBlockIndex = (x, y, z) => {
    return x + y * worldSize + z * worldSize * worldSize;
}

const setBlock = (x, y, z, type) => {
    if (x < 0 || x >= worldSize || y < 0 || y >= worldSize || z < 0 || z >= worldSize) return;

    world[getBlockIndex(x, y, z)] = type;
}

const getBlock = (x, y, z) => {
    if (x < 0 || x >= worldSize || y < 0 || y >= worldSize || z < 0 || z >= worldSize) return -1;

    return world[getBlockIndex(x, y, z)];
}

const generateWorld = () => {
    world.length = worldSize * worldSize * worldSize;
    world.fill(-1);

    for (let z = 0; z < worldSize; z++) {
        for (let y = 0; y < worldSize; y++) {
            for (let x = 0; x < worldSize; x++) {
                const rnd = Math.random();

                if (rnd > 0.9) {
                    setBlock(x, y, z, 3);
                } else if (rnd > 0.8) {
                    setBlock(x, y, z, 2);
                } else if (rnd > 0.7) {
                    setBlock(x, y, z, 1);
                } else if (rnd > 0.6) {
                    setBlock(x, y, z, 0);
                }
            }
        }
    }
}

const loadTexArray = image => {
    ctx2D.drawImage(image, 0, 0);
    const tex = ctx2D.getImageData(0, 0, blockTexSpan, blockTexSize);

    const texData = new Uint8Array(texComponents * blockTexSpan * blockTexSize);

    // The loaded texture is layed out in rows of the full texture.
    // Convert it to be stored in rows of each individual textured.
    let i = 0;
    for (let z = 0; z < blockCount; z++) {
        for (let y = 0; y < blockTexSize; y++) {
            for (let x = 0; x < blockTexSize; x++) {
                const pixelI = ((x + z * blockTexSize) + y * blockTexSpan) * texComponents;
                texData[i] = tex.data[pixelI];
                texData[i + 1] = tex.data[pixelI + 1];
                texData[i + 2] = tex.data[pixelI + 2];
                texData[i + 3] = tex.data[pixelI + 3];

                i += texComponents;
            }
        }
    }

    const texture = new THREE.DataArrayTexture(texData, blockTexSize, blockTexSize, blockCount);
    texture.needsUpdate = true;

    return texture;
}

let totalTime = 0;
let pressedKeys = new Set();
let cameraAngle = new THREE.Euler(0, 0, 0, "YXZ");

let forwardX = 0;
let forwardZ = 1;

let rightX = 1;
let rightZ = 0;

let lookX = 0;
let lookY = 0;
let lookZ = 1;

let playerSpeed = 6;
let playerSize = 0.8;
let isPlayerFlying = false;
let playerYVelocity = 0;

const gravity = 0.5;
const mouseSensitivity = 0.002;
const maxLookAngle = Math.PI * 0.5 * 0.95;

const mouseMove = (event) => {
    cameraAngle.x -= event.movementY * mouseSensitivity;
    cameraAngle.y -= event.movementX * mouseSensitivity;

    // cameraAngle.x = Math.floor(Math.ceil(cameraAngle.x, -0.5), 0.5);
    if (cameraAngle.x < -maxLookAngle) {
        cameraAngle.x = -maxLookAngle;
    } else if (cameraAngle.x > maxLookAngle) {
        cameraAngle.x = maxLookAngle;
    }

    forwardX = Math.sin(cameraAngle.y);
    forwardZ = Math.cos(cameraAngle.y);

    let sideCameraAngle = cameraAngle.y + Math.PI / 2;

    rightX = Math.sin(sideCameraAngle);
    rightZ = Math.cos(sideCameraAngle);

    let worldDir = new THREE.Vector3(0, 0, 0);
    camera.getWorldDirection(worldDir);
    lookX = worldDir.x;
    lookY = worldDir.y;
    lookZ = worldDir.z;
}

// Check every corner of a cubic object for collisions.
const isCollidingWithVoxel = (x, y, z, sizeX, sizeY, sizeZ) => {
    for (let i = 0; i < 8; i++) {
        let xOff = i % 2 * 2 - 1;
        let yOff = Math.floor(i / 4) * 2 - 1;
        let zOff = Math.floor(i / 2) % 2 * 2 - 1;

        let cornerX = Math.floor(x + sizeX * 0.5 * xOff);
        let cornerY = Math.floor(y + sizeY * 0.5 * yOff);
        let cornerZ = Math.floor(z + sizeZ * 0.5 * zOff);

        if (getBlock(cornerX, cornerY, cornerZ) != -1) {
            return true;
        }
    }

    return false;
}

const isOnGround = (x, y, z, sizeX, sizeY, sizeZ) => {
    let feetHitboxSize = 0.1;
    return isCollidingWithVoxel(x, y - (sizeY + feetHitboxSize) * 0.5, z, sizeX, feetHitboxSize, sizeZ);
}

const raycast = (startX, startY, startZ, dirX, dirY, dirZ, range) => {
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

    let lastDistToNext = 0;

    let hitBlock = -1;
    while (hitBlock == -1 && lastDistToNext < range) {
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

        hitBlock = getBlock(blockX, blockY, blockZ);
    }

    return {
        hit: hitBlock != -1,
        block: hitBlock,
        distance: lastDistToNext,
        x: blockX,
        y: blockY,
        z: blockZ,
    };
}

const updateMesh = (mesh) => {
    mesh.geometry.dispose();

    let vertices = [];
    let uvs = [];
    let indices = [];

    let vertexComponentI = 0;
    let vertexI = 0;
    let indexI = 0;

    // Generate the mesh for the world's blocks.
    for (let z = 0; z < worldSize; z++)
    for (let y = 0; y < worldSize; y++)
    for (let x = 0; x < worldSize; x++) {
        const block = getBlock(x, y, z);

        // Don't render air.
        if (block == -1) continue;

        for (let dir = 0; dir < 6; dir++) {
            // Only generate faces that will be visible.
            const dirVec = directionVecs[dir];
            if (getBlock(x + dirVec[0], y + dirVec[1], z + dirVec[2]) == -1) {
                // Add indices before adding vertices, they refer
                // to the upcoming vertices.
                for (let ii = 0; ii < 6; ii++) {
                    indices[indexI] = cubeIndices[dir][ii] + vertexI;
                    indexI++;
                }

                for (let vi = 0; vi < 4; vi++) {
                    // Add vertex x, y, and z for this face.
                    vertices[vertexComponentI] = cubeVertices[dir][vi * 3] + x;
                    vertices[vertexComponentI + 1] = cubeVertices[dir][vi * 3 + 1] + y;
                    vertices[vertexComponentI + 2] = cubeVertices[dir][vi * 3 + 2] + z;

                    // Add UV x and y for this face.
                    uvs[vertexComponentI] = cubeUvs[dir][vi * 2];
                    uvs[vertexComponentI + 1] = cubeUvs[dir][vi * 2 + 1];
                    // The UV's z is the index of it's texture.
                    uvs[vertexComponentI + 2] = block;

                    vertexComponentI += 3;
                    vertexI++;
                }
            }
        }
    }

    mesh.geometry.setIndex(indices);
    mesh.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
    mesh.geometry.setAttribute("uv3", new THREE.BufferAttribute(new Float32Array(uvs), 3));
}

const update = (deltaTime) => {
    let moveForward = 0;
    let moveRight = 0;
    let moveUp = 0;

    if (pressedKeys.has("KeyW")) {
        moveForward -= 1;
    }

    if (pressedKeys.has("KeyS")) {
        moveForward += 1;
    }

    if (pressedKeys.has("KeyA")) {
        moveRight -= 1;
    }

    if (pressedKeys.has("KeyD")) {
        moveRight += 1;
    }

    if (isPlayerFlying) {
        if (pressedKeys.has("Space")) {
            moveUp += 1;
        }

        if (pressedKeys.has("ShiftLeft")) {
            moveUp -= 1;
        }
    } else {
        if (pressedKeys.has("Space") && isOnGround(camera.position.x, camera.position.y, camera.position.z, playerSize, playerSize, playerSize)) {
            playerYVelocity = gravity * 20;
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

    let newX = camera.position.x;
    let newY = camera.position.y;
    let newZ = camera.position.z;

    newX += moveForward * forwardX * playerSpeed;
    newX += moveRight * rightX * playerSpeed;

    if (isCollidingWithVoxel(newX, newY, newZ, playerSize, playerSize, playerSize)) {
        newX = camera.position.x;
    }

    newZ += moveForward * forwardZ * playerSpeed;
    newZ += moveRight * rightZ * playerSpeed;

    if (isCollidingWithVoxel(newX, newY, newZ, playerSize, playerSize, playerSize)) {
        newZ = camera.position.z;
    }

    if (isPlayerFlying) {
        playerYVelocity = 0;
        newY += moveUp * playerSpeed;
    } else {
        playerYVelocity -= gravity;
        newY += playerYVelocity * deltaTime;
    }

    if (isCollidingWithVoxel(newX, newY, newZ, playerSize, playerSize, playerSize)) {
        playerYVelocity = 0;
        newY = camera.position.y;
    }

    camera.position.x = newX;
    camera.position.y = newY;
    camera.position.z = newZ;

    camera.quaternion.setFromEuler(cameraAngle);
}

const draw = (time) => {
    requestAnimationFrame(draw);

    const deltaTime = (time - lastTime) * 0.001;
    lastTime = time;

    if (isNaN(deltaTime)) return;
    totalTime += deltaTime;

    update(deltaTime);

    renderer.render(scene, camera);
}

const setup = async () => {
    scene.background = new THREE.Color(0x0088ff);

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    document.addEventListener("click", () => {
        document.body.requestPointerLock();

        let rayHit = raycast(camera.position.x, camera.position.y, camera.position.z, lookX, lookY, lookZ, 10);

        if (rayHit.hit) {
            setBlock(rayHit.x, rayHit.y, rayHit.z, -1);
            updateMesh(mesh);
        }
    });
    document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement == document.body) {
            document.addEventListener("mousemove", mouseMove);
        } else {
            document.removeEventListener("mousemove", mouseMove);
        }
    });

    document.addEventListener("keydown", (event) => {
        pressedKeys.add(event.code);

        if (event.code == "KeyF") {
            isPlayerFlying = !isPlayerFlying;
        }
    })
    document.addEventListener("keyup", (event) => {
        pressedKeys.delete(event.code);
    })

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    generateWorld();
    camera.position.x = 9.5;
    camera.position.y = 20;
    camera.position.z = 9.5;

    // const textureLoader = new THREE.TextureLoader();
    // const bgTexture = textureLoader.load("bg.png");

    // scene.background = bgTexture;

    const imageLoader = new THREE.ImageLoader();
    const image = await imageLoader.loadAsync("blocks.png");

    const texture = loadTexArray(image);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            diffuse: { value: texture },
        },
        vertexShader: vs,
        fragmentShader: fs,
        glslVersion: THREE.GLSL3,
    });

    mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    updateMesh(mesh);

    scene.add(mesh);

    draw();
}

setup();
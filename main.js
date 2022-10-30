/*
 * TODO:
 * Refactor this to not be one file,
 * Better input handling for single clicks,
 * Improve state handling, ie: player object, flight mode,
 *
 * FEAT:
 * Spelunky-like cave generation,
 * Ores,
 * Sound,
 * Multiple levels w/ transition between,
 * Hazards,
 */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

const blockTexSize = 16;
const blockCount = 8;
const blockTexSpan = blockTexSize * blockCount;
const breakingTexSize = 16;
const breakingTexCount = 4;
const breakingTexSpan = breakingTexSize * breakingTexCount;
const texComponents = 4; // RGBA
const barrierId = 4;

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
}
`;

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

const faceColors = new Float32Array([
    // Forward
    0.9,
    // Backward
    0.6,
    // Right
    0.8,
    // Left
    0.7,
    // Up
    1.0,
    // Down
    0.5,
]);

const canvas = new OffscreenCanvas(blockTexSpan, blockTexSize);
const ctx2D = canvas.getContext("2d");

const chunkSize = 16;
const mapSizeInChunks = 4;
const mapSize = chunkSize * mapSizeInChunks;
const chunks = new Map();

const getChunk = (x, y, z) => {
    let hash = hashVector(x, y, z);
    return chunks.get(hash);
}

const setChunk = (x, y, z, chunk) => {
    let hash = hashVector(x, y, z);
    chunks.set(hash, chunk);
}

const updateChunk = (x, y, z) => {
    let chunk = getChunk(x, y, z);
    if (chunk == null) return;
    chunk.needsUpdate = true;
}

const hashVector = (x, y, z) => {
    return x * 73856093 ^ y * 19349663 ^ z * 83492791;
}

class Chunk {
    constructor(size, x, y, z) {
        this.chunkX = x;
        this.chunkY = y;
        this.chunkZ = z;
        this.size = size;
        this.data = new Array(size * size * size);
        this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
        this.mesh.geometry.dynamic = true;
        this.needsUpdate = true;
        scene.add(this.mesh);
    }

    getBlockIndex = (x, y, z) => {
        return x + y * this.size + z * this.size * this.size;
    }

    setBlock = (x, y, z, type) => {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) return;

        this.data[this.getBlockIndex(x, y, z)] = type;
        this.needsUpdate = true;

        if (x == 0)             updateChunk(this.chunkX - 1, this.chunkY, this.chunkZ);
        if (x == chunkSize - 1) updateChunk(this.chunkX + 1, this.chunkY, this.chunkZ);
        if (y == 0)             updateChunk(this.chunkX, this.chunkY - 1, this.chunkZ);
        if (y == chunkSize - 1) updateChunk(this.chunkX, this.chunkY + 1, this.chunkZ);
        if (z == 0)             updateChunk(this.chunkX, this.chunkY, this.chunkZ - 1);
        if (z == chunkSize - 1) updateChunk(this.chunkX, this.chunkY, this.chunkZ + 1);
    }

    getBlock = (x, y, z) => {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) return -1;

        return this.data[this.getBlockIndex(x, y, z)];
    }

    update = () => {
        if (this.needsUpdate) {
            this.updateMesh();
            this.needsUpdate = false;
        }
    }

    updateMesh = () => {
        // this.mesh.geometry.dispose();

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
            let worldX = x + this.chunkX * chunkSize;
            let worldY = y + this.chunkY * chunkSize;
            let worldZ = z + this.chunkZ * chunkSize;
            const block = getBlock(worldX, worldY, worldZ);

            // Don't render air.
            if (block == -1) continue;

            for (let dir = 0; dir < 6; dir++) {
                // Only generate faces that will be visible.
                const dirVec = directionVecs[dir];
                if (getBlock(worldX + dirVec[0], worldY + dirVec[1], worldZ + dirVec[2]) == -1) {
                    // Add indices before adding vertices, they refer
                    // to the upcoming vertices.
                    for (let ii = 0; ii < 6; ii++) {
                        indices[indexI] = cubeIndices[dir][ii] + vertexI;
                        indexI++;
                    }

                    for (let vi = 0; vi < 4; vi++) {
                        // Add vertex x, y, and z for this face.
                        vertices[vertexComponentI] = cubeVertices[dir][vi * 3] + worldX;
                        vertices[vertexComponentI + 1] = cubeVertices[dir][vi * 3 + 1] + worldY;
                        vertices[vertexComponentI + 2] = cubeVertices[dir][vi * 3 + 2] + worldZ;

                        // Add UV x and y for this face.
                        uvs[vertexComponentI] = cubeUvs[dir][vi * 2];
                        uvs[vertexComponentI + 1] = cubeUvs[dir][vi * 2 + 1];
                        // The UV's z is the index of it's texture.
                        uvs[vertexComponentI + 2] = block;

                        // Add color for this face.
                        colors[vertexComponentI] = faceColors[dir];
                        colors[vertexComponentI + 1] = faceColors[dir];
                        colors[vertexComponentI + 2] = faceColors[dir];

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

    generate = () => {
        this.data.length = this.size * this.size * this.size;
        this.data.fill(-1);

        for (let z = 0; z < this.size; z++)
        for (let y = 0; y < this.size; y++)
        for (let x = 0; x < this.size; x++) {
            const worldX = x + this.chunkX * this.size;
            const worldY = y + this.chunkY * this.size;
            const worldZ = z + this.chunkZ * this.size;

            if (worldX == 0 || worldX == mapSize - 1 ||
                worldY == 0 || worldY == mapSize - 1 ||
                worldZ == 0 || worldZ == mapSize - 1) {
                this.setBlock(x, y, z, barrierId);
                continue;
            }

            const noiseValue = noise.simplex3(worldX * 0.1, worldY * 0.1, worldZ * 0.1);

            if (noiseValue < 0.4) {
                this.setBlock(x, y, z, 0);
            }

            // const rnd = Math.random();

            // if (rnd > 0.9) {
            //     setBlock(x, y, z, 3);
            // } else if (rnd > 0.8) {
            //     setBlock(x, y, z, 2);
            // } else if (rnd > 0.7) {
            //     setBlock(x, y, z, 1);
            // } else if (rnd > 0.6) {
            //     setBlock(x, y, z, 0);
            // }
        }
    }

    destroy = () => {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        scene.remove(this.mesh);
    }
}

let lastTime = 0;
let material;

const setBlock = (x, y, z, type) => {
    let chunkX = Math.floor(x / chunkSize);
    let chunkY = Math.floor(y / chunkSize);
    let chunkZ = Math.floor(z / chunkSize);
    let localX = x % chunkSize;
    let localY = y % chunkSize;
    let localZ = z % chunkSize;
    let chunk = getChunk(chunkX, chunkY, chunkZ);
    if (chunk == null) return;
    chunk.setBlock(localX, localY, localZ, type);
}

const getBlock = (x, y, z) => {
    let chunkX = Math.floor(x / chunkSize);
    let chunkY = Math.floor(y / chunkSize);
    let chunkZ = Math.floor(z / chunkSize);
    let localX = x % chunkSize;
    let localY = y % chunkSize;
    let localZ = z % chunkSize;
    let chunk = getChunk(chunkX, chunkY, chunkZ);
    if (chunk == null) return -1;
    return chunk.getBlock(localX, localY, localZ);
}

const loadTexArray = (image, depth, size, span) => {
    ctx2D.clearRect(0, 0, canvas.width, canvas.height);
    ctx2D.drawImage(image, 0, 0);
    const tex = ctx2D.getImageData(0, 0, span, size);

    const texData = new Uint8Array(texComponents * span * size);

    // The loaded texture is layed out in rows of the full texture.
    // Convert it to be stored in rows of each individual textured.
    let i = 0;
    for (let z = 0; z < depth; z++)
    for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
        const pixelI = ((x + z * size) + y * span) * texComponents;
        texData[i] = tex.data[pixelI];
        texData[i + 1] = tex.data[pixelI + 1];
        texData[i + 2] = tex.data[pixelI + 2];
        texData[i + 3] = tex.data[pixelI + 3];

        i += texComponents;
    }

    const texture = new THREE.DataArrayTexture(texData, size, size, depth);
    texture.needsUpdate = true;

    return texture;
}

let totalTime = 0;
let pressedKeys = new Set();
let pressedMouseButtons = new Set();
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

let breakingBlockX = 0;
let breakingBlockY = 0;
let breakingBlockZ = 0;
let breakingProgress = 0;
let breakingMesh;
let breakingMaterial;
const breakingMeshSize = 1;
const breakingMeshPaddedSize = breakingMeshSize + 0.01;
const breakTime = 0.5;

const gravity = 0.5;
const mouseSensitivity = 0.002;
const maxLookAngle = Math.PI * 0.5 * 0.99;

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

const update = (deltaTime) => {
    breakingMesh.visible = false;
    if (pressedMouseButtons.has(0)) {
        let rayHit = raycast(camera.position.x, camera.position.y, camera.position.z, lookX, lookY, lookZ, 10);

        if (rayHit.hit && rayHit.block != barrierId) {
            breakingMaterial.uniforms.depth.value = breakingProgress / breakTime * breakingTexCount;
            breakingMesh.visible = true;
            breakingMesh.position.x = rayHit.x + 0.5;
            breakingMesh.position.y = rayHit.y + 0.5;
            breakingMesh.position.z = rayHit.z + 0.5;

            if (rayHit.x == breakingBlockX && rayHit.y == breakingBlockY &&
                rayHit.z == breakingBlockZ) {
                breakingProgress += deltaTime;

                if (breakingProgress >= breakTime) {
                    setBlock(rayHit.x, rayHit.y, rayHit.z, -1);
                    breakingProgress = 0;
                }
            } else {
                breakingBlockX = rayHit.x;
                breakingBlockY = rayHit.y;
                breakingBlockZ = rayHit.z;
                breakingProgress = 0;
            }
        } else {
            breakingProgress = 0;
        }
    } else {
        breakingProgress = 0;
    }

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

    for (let [_hash, chunk] of chunks) {
        chunk.update();
    }
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
    const bgColor = 0x492514;
    scene.background = new THREE.Color(bgColor);

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    document.addEventListener("click", () => {
        document.body.requestPointerLock();
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

    document.addEventListener("mousedown", (event) => {
        pressedMouseButtons.add(event.button);
    })
    document.addEventListener("mouseup", (event) => {
        pressedMouseButtons.delete(event.button);
    })

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const imageLoader = new THREE.ImageLoader();
    const image = await imageLoader.loadAsync("blocks.png");
    const breakingImage = await imageLoader.loadAsync("breaking.png");

    const texture = loadTexArray(image, blockCount, blockTexSize, blockTexSpan);

    material = new THREE.ShaderMaterial({
        uniforms: {
            diffuse: { value: texture },
        },
        vertexColors: true,
        vertexShader: vs,
        fragmentShader: fs,
        glslVersion: THREE.GLSL3,
    });

    const breakingTexture = loadTexArray(breakingImage, breakingTexCount, breakingTexSize, breakingTexSpan);

    breakingMaterial = new THREE.ShaderMaterial({
        uniforms: {
            diffuse: { value: breakingTexture },
            depth: { value: 2 },
        },
        vertexShader: breakingVs,
        fragmentShader: breakingFs,
        glslVersion: THREE.GLSL3,
    });

    breakingMesh = new THREE.Mesh(
        new THREE.BoxGeometry(
            breakingMeshPaddedSize,
            breakingMeshPaddedSize,
            breakingMeshPaddedSize
        ), breakingMaterial);

    scene.add(breakingMesh);

    noise.seed(Math.random());

    for (let x = 0; x < mapSizeInChunks; x++)
    for (let y = 0; y < mapSizeInChunks; y++)
    for (let z = 0; z < mapSizeInChunks; z++) {
        let newChunk = new Chunk(chunkSize, x, y, z);
        newChunk.generate();
        setChunk(x, y, z, newChunk);
    }

    const spawnChunkX = mapSizeInChunks - 1;
    const spawnChunkY = mapSizeInChunks - 1;
    const spawnChunkZ = mapSizeInChunks - 1;

    const spawnChunkWorldX = spawnChunkX * chunkSize;
    const spawnChunkWorldY = spawnChunkY * chunkSize;
    const spawnChunkWorldZ = spawnChunkZ * chunkSize;

    const spawnChunk = getChunk(spawnChunkX, spawnChunkY, spawnChunkZ);

    let foundSpawnPos = false;

    for (let x = 0; x < chunkSize; x++)
    for (let y = 0; y < chunkSize; y++)
    for (let z = 0; z < chunkSize; z++) {
        if (spawnChunk.getBlock(x, y, z) != -1) continue;

        camera.position.x = spawnChunkWorldX + x + 0.5;
        camera.position.y = spawnChunkWorldY + y + 0.5;
        camera.position.z = spawnChunkWorldZ + z + 0.5;
        foundSpawnPos = true;
        break;
    }

    if (!foundSpawnPos) {
        let x = Math.floor(chunkSize * 0.5);
        let y = Math.floor(chunkSize * 0.5);
        let z = Math.floor(chunkSize * 0.5);
        spawnChunk.setBlock(x, y, z, -1);
        camera.position.x = spawnChunkWorldX + x + 0.5;
        camera.position.y = spawnChunkWorldY + y + 0.5;
        camera.position.z = spawnChunkWorldZ + z + 0.5;
    }

    draw();
}

setup();
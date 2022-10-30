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
        if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) return false;

        this.data[this.getBlockIndex(x, y, z)] = type;
        this.needsUpdate = true;

        return true;
    }

    getBlock = (x, y, z) => {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) return -1;

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

            // Don't render air.
            if (block == -1) continue;

            for (let dir = 0; dir < 6; dir++) {
                // Only generate faces that will be visible.
                const dirVec = directionVecs[dir];
                if (world.getBlock(worldX + dirVec[0], worldY + dirVec[1], worldZ + dirVec[2]) == -1) {
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

    generate = (mapSize) => {
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
        }
    }

    destroy = () => {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        scene.remove(this.mesh);
    }
}
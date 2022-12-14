import { Chunk } from "./chunk.js";
import { hashVector } from "./gameMath.js";
import { blocks } from "./blocks.js";
import { hitBlockById } from "./physics.js";

export class World {
    constructor(chunkSize, mapSizeInChunks) {
        this.chunkSize = chunkSize;
        this.mapSizeInChunks = mapSizeInChunks;
        this.mapSize = chunkSize * mapSizeInChunks;
        this.chunks = new Map();
    }

    getChunk = (x, y, z) => {
        let hash = hashVector(x, y, z);
        return this.chunks.get(hash);
    }

    setChunk = (x, y, z, chunk) => {
        let hash = hashVector(x, y, z);
        this.chunks.set(hash, chunk);
    }

    updateChunk = (x, y, z) => {
        let chunk = this.getChunk(x, y, z);
        if (chunk == null) return;
        chunk.needsUpdate = true;
    }

    setBlock = (x, y, z, type) => {
        let chunkX = Math.floor(x / this.chunkSize);
        let chunkY = Math.floor(y / this.chunkSize);
        let chunkZ = Math.floor(z / this.chunkSize);
        let localX = x % this.chunkSize;
        let localY = y % this.chunkSize;
        let localZ = z % this.chunkSize;
        let chunk = this.getChunk(chunkX, chunkY, chunkZ);
        if (chunk == null) return;
        if (!chunk.setBlock(localX, localY, localZ, type)) return;

        let maxPos = this.chunkSize - 1;

        if (localX == 0)      this.updateChunk(chunkX - 1, chunkY, chunkZ);
        if (localX == maxPos) this.updateChunk(chunkX + 1, chunkY, chunkZ);
        if (localY == 0)      this.updateChunk(chunkX, chunkY - 1, chunkZ);
        if (localY == maxPos) this.updateChunk(chunkX, chunkY + 1, chunkZ);
        if (localZ == 0)      this.updateChunk(chunkX, chunkY, chunkZ - 1);
        if (localZ == maxPos) this.updateChunk(chunkX, chunkY, chunkZ + 1);
    }

    getBlock = (x, y, z) => {
        let chunkX = Math.floor(x / this.chunkSize);
        let chunkY = Math.floor(y / this.chunkSize);
        let chunkZ = Math.floor(z / this.chunkSize);
        let localX = x % this.chunkSize;
        let localY = y % this.chunkSize;
        let localZ = z % this.chunkSize;
        let chunk = this.getChunk(chunkX, chunkY, chunkZ);
        if (chunk == null) return blocks.air.id;
        return chunk.getBlock(localX, localY, localZ);
    }

    // Check if a block is occupied (ie: not air). Optionally, consider transparent blocks to be occupied.
    isBlockOccupied = (x, y, z, includeTransparent) => {
        let id = this.getBlock(x, y, z);
        return hitBlockById(id, includeTransparent);
    }

    isBlockSupported = (x, y, z) => {
        return this.getBlock(x + 1, y, z) != blocks.air.id ||
            this.getBlock(x - 1, y, z) != blocks.air.id ||
            this.getBlock(x, y + 1, z) != blocks.air.id ||
            this.getBlock(x, y - 1, z) != blocks.air.id ||
            this.getBlock(x, y, z + 1) != blocks.air.id ||
            this.getBlock(x, y, z - 1) != blocks.air.id;
    }

    getSpawnPos = (spawnChunkX, spawnChunkY, spawnChunkZ, force) => {
        const spawnChunkWorldX = spawnChunkX * this.chunkSize;
        const spawnChunkWorldY = spawnChunkY * this.chunkSize;
        const spawnChunkWorldZ = spawnChunkZ * this.chunkSize;

        const spawnChunk = this.getChunk(spawnChunkX, spawnChunkY, spawnChunkZ);

        for (let z = 0; z < this.chunkSize; z++)
        for (let y = 0; y < this.chunkSize; y++)
        for (let x = 0; x < this.chunkSize; x++) {
            if (spawnChunk.getBlock(x, y, z) != blocks.air.id) continue;

            return {
                succeeded: true,
                x: spawnChunkWorldX + x + 0.5,
                y: spawnChunkWorldY + y + 0.5,
                z: spawnChunkWorldZ + z + 0.5,
            }
        }

        if (force) {
            let x = Math.floor(this.chunkSize * 0.5);
            let y = Math.floor(this.chunkSize * 0.5);
            let z = Math.floor(this.chunkSize * 0.5);
            spawnChunk.setBlock(x, y, z, blocks.air.id);

            return {
                succeeded: true,
                x: spawnChunkWorldX + x + 0.5,
                y: spawnChunkWorldY + y + 0.5,
                z: spawnChunkWorldZ + z + 0.5,
            }
        }

        return {
            succeeded: false,
            x: 0,
            y: 0,
            z: 0,
        }
    }

    generate = (rng, scene, texture, paletteId) => {
        for (let x = 0; x < this.mapSizeInChunks; x++)
        for (let y = 0; y < this.mapSizeInChunks; y++)
        for (let z = 0; z < this.mapSizeInChunks; z++) {
            let newChunk = new Chunk(this.chunkSize, x, y, z, scene, texture);
            newChunk.generate(rng, this.mapSize, paletteId);
            this.setChunk(x, y, z, newChunk);
        }
    }

    destroy = (scene) => {
        for (let [_hash, chunk] of this.chunks) {
            chunk.destroy(scene);
        }
    }
}
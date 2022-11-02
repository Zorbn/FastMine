import { Chunk } from "./chunk.js";
import { hashVector } from "./gameMath.js";
import { blocks } from "./blocks.js";

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

    isBlockSupported = (x, y, z) => {
        return this.getBlock(x + 1, y, z) != blocks.air.id ||
            this.getBlock(x - 1, y, z) != blocks.air.id ||
            this.getBlock(x, y + 1, z) != blocks.air.id ||
            this.getBlock(x, y - 1, z) != blocks.air.id ||
            this.getBlock(x, y, z + 1) != blocks.air.id ||
            this.getBlock(x, y, z - 1) != blocks.air.id;
    }

    getPlayerSpawnPos = () => {
        const spawnChunkX = this.mapSizeInChunks - 1;
        const spawnChunkY = this.mapSizeInChunks - 1;
        const spawnChunkZ = this.mapSizeInChunks - 1;

        const spawnChunkWorldX = spawnChunkX * this.chunkSize;
        const spawnChunkWorldY = spawnChunkY * this.chunkSize;
        const spawnChunkWorldZ = spawnChunkZ * this.chunkSize;

        const spawnChunk = this.getChunk(spawnChunkX, spawnChunkY, spawnChunkZ);

        for (let x = 0; x < this.chunkSize; x++)
        for (let y = 0; y < this.chunkSize; y++)
        for (let z = 0; z < this.chunkSize; z++) {
            if (spawnChunk.getBlock(x, y, z) != blocks.air.id) continue;

            return {
                x: spawnChunkWorldX + x + 0.5,
                y: spawnChunkWorldY + y + 0.5,
                z: spawnChunkWorldZ + z + 0.5,
            }
        }

        let x = Math.floor(this.chunkSize * 0.5);
        let y = Math.floor(this.chunkSize * 0.5);
        let z = Math.floor(this.chunkSize * 0.5);
        spawnChunk.setBlock(x, y, z, blocks.air.id);

        return {
            x: spawnChunkWorldX + x + 0.5,
            y: spawnChunkWorldY + y + 0.5,
            z: spawnChunkWorldZ + z + 0.5,
        }
    }

    generate = (rng, scene, texture) => {
        for (let x = 0; x < this.mapSizeInChunks; x++)
        for (let y = 0; y < this.mapSizeInChunks; y++)
        for (let z = 0; z < this.mapSizeInChunks; z++) {
            let newChunk = new Chunk(this.chunkSize, x, y, z, scene, texture);
            newChunk.generate(rng, this.mapSize);
            this.setChunk(x, y, z, newChunk);
        }
    }
}
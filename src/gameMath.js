export const hashVector = (x, y, z) => {
    return x * 73856093 ^ y * 19349663 ^ z * 83492791;
}

export const indexTo3D = (i, size) => {
    return {
        x: i % size,
        y: Math.floor(i / size) % size,
        z: Math.floor(i / (size * size)),
    }
}
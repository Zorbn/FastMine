export const direction = {
    forward: 0,
    backward: 1,
    right: 2,
    left: 3,
    up: 4,
    down: 5,
};

export const directionVecs = [
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

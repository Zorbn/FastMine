export class cubeMesh {
    static vertices = [
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

    static uvs = [
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

    static indices = [
        [ 0, 1, 2, 0, 2, 3 ], // Forward
        [ 0, 2, 1, 0, 3, 2 ], // Backward
        [ 0, 2, 1, 0, 3, 2 ], // Right
        [ 0, 1, 2, 0, 2, 3 ], // Left
        [ 0, 1, 2, 0, 2, 3 ], // Up
        [ 0, 2, 1, 0, 3, 2 ], // Down
    ];

    static colors = new Float32Array([
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
}
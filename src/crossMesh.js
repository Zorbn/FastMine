export class crossMesh {
    static vertices = [
        new Float32Array([
            0, 0, 0,
            0, 1, 0,
            1, 1, 1,
            1, 0, 1,
        ]),
        new Float32Array([
            0, 0, 1,
            0, 1, 1,
            1, 1, 0,
            1, 0, 0,
        ]),
        new Float32Array([
            0, 0, 1,
            0, 1, 1,
            1, 1, 0,
            1, 0, 0,
        ]),
        new Float32Array([
            0, 0, 0,
            0, 1, 0,
            1, 1, 1,
            1, 0, 1,
        ]),
    ]

    static uvs = [
        new Float32Array([
            1, 1,
            1, 0,
            0, 0,
            0, 1,
        ]),
        new Float32Array([
            1, 1,
            1, 0,
            0, 0,
            0, 1,
        ]),
        new Float32Array([
            0, 1,
            0, 0,
            1, 0,
            1, 1,
        ]),
        new Float32Array([
            0, 1,
            0, 0,
            1, 0,
            1, 1,
        ]),
    ]

    static indices = [
        [ 0, 1, 2, 0, 2, 3 ],
        [ 0, 1, 2, 0, 2, 3 ],
        [ 0, 2, 1, 0, 3, 2 ],
        [ 0, 2, 1, 0, 3, 2 ],
    ];

    static colors = new Float32Array([1.0, 1.0, 1.0, 1.0]);
}
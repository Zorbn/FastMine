export const blocks = {
    air: {
        id: -1,
        value: 0,
        breakTime: -1,
        transparent: true,
    },
    dirt: {
        id: 0,
        value: 1,
        breakTime: 0.5,
        transparent: false,
    },
    clay: {
        id: 1,
        value: 1,
        breakTime: 0.5,
        transparent: false,
    },
    metal: {
        id: 2,
        value: 1,
        breakTime: 1,
        transparent: false,
    },
    wood: {
        id: 3,
        value: 1,
        breakTime: 0.5,
        transparent: false,
    },
    barrier: {
        id: 4,
        value: 777,
        breakTime: -1,
        transparent: false,
    },
    redDirt: {
        id: 5,
        value: 1,
        breakTime: 0.5,
        transparent: false,
    },
    coal: {
        id: 6,
        value: 5,
        breakTime: 0.5,
        transparent: false,
    },
    iron: {
        id: 7,
        value: 20,
        breakTime: 1,
        transparent: false,
    },
    emerald: {
        id: 8,
        value: 100,
        breakTime: 2,
        transparent: false,
    },
    greenMushroom: {
        id: 9,
        value: 1,
        breakTime: 0,
        transparent: true,
    },
    redMushroom: {
        id: 10,
        value: 1,
        breakTime: 0,
        transparent: true,
    }
};

export const blocksById = new Map();
for (let [name, data] of Object.entries(blocks)) {
    let namedData = data;
    namedData.name = name;
    blocksById.set(data.id, namedData);
}
const blocks = {
    air: {
        id: -1,
        value: 0,
        breakTime: -1,
    },
    dirt: {
        id: 0,
        value: 1,
        breakTime: 0.5,
    },
    clay: {
        id: 1,
        value: 1,
        breakTime: 0.5,
    },
    metal: {
        id: 2,
        value: 1,
        breakTime: 1,
    },
    wood: {
        id: 3,
        value: 1,
        breakTime: 0.5,
    },
    barrier: {
        id: 4,
        value: 777,
        breakTime: -1,
    },
    redDirt: {
        id: 5,
        value: 1,
        breakTime: 0.5,
    },
    coal: {
        id: 6,
        value: 5,
        breakTime: 0.5,
    },
    iron: {
        id: 7,
        value: 20,
        breakTime: 1,
    },
    emerald: {
        id: 8,
        value: 100,
        breakTime: 2,
    },
};

const blocksById = new Map();
for (let [name, data] of Object.entries(blocks)) {
    let namedData = data;
    namedData.name = name;
    blocksById.set(data.id, namedData);
}
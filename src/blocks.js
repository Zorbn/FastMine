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
    },
    grass: {
        id: 11,
        value: 1,
        breakTime: 0.5,
        transparent: false,
    },
    tin: {
        id: 12,
        value: 5,
        breakTime: 0.5,
        transparent: false,
    },
    copper: {
        id: 13,
        value: 20,
        breakTime: 1,
        transparent: false,
    },
    ruby: {
        id: 14,
        value: 100,
        breakTime: 2,
        transparent: false,
    },
    bush: {
        id: 15,
        value: 1,
        breakTime: 0,
        transparent: true,
    },
    venusFlytrap: {
        id: 16,
        value: 1,
        breakTime: 0,
        transparent: true,
    },
    bronze: {
        id: 17,
        value: 5,
        breakTime: 0.5,
        transparent: false,
    },
    silver: {
        id: 18,
        value: 20,
        breakTime: 1,
        transparent: false,
    },
    gold: {
        id: 19,
        value: 100,
        breakTime: 2,
        transparent: false,
    },
    skull: {
        id: 20,
        value: 1,
        breakTime: 0,
        transparent: true,
    },
    lamp: {
        id: 21,
        value: 1,
        breakTime: 0,
        transparent: true,
    },
};

export const blockPalettes = [
    {
        "ground": blocks.dirt.id,
        "ore0": blocks.coal.id,
        "ore1": blocks.iron.id,
        "ore2": blocks.emerald.id,
        "groundDecor": blocks.greenMushroom.id,
        "ceilingDecor": blocks.redMushroom.id,
    },
    {
        "ground": blocks.grass.id,
        "ore0": blocks.tin.id,
        "ore1": blocks.copper.id,
        "ore2": blocks.ruby.id,
        "groundDecor": blocks.bush.id,
        "ceilingDecor": blocks.venusFlytrap.id,
    },
    {
        "ground": blocks.clay.id,
        "ore0": blocks.bronze.id,
        "ore1": blocks.silver.id,
        "ore2": blocks.gold.id,
        "groundDecor": blocks.skull.id,
        "ceilingDecor": blocks.lamp.id,
    },
];

export const blocksById = new Map();
for (let [name, data] of Object.entries(blocks)) {
    let namedData = data;
    namedData.name = name;
    blocksById.set(data.id, namedData);
}
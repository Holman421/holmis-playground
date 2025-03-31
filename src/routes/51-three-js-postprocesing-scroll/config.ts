export const imageArrays = {
	earth: Array.from({ length: 12 }, (_, i) => `/pictures/earth/earth-${i + 1}.jpg`),
	universe: Array.from({ length: 12 }, (_, i) => `/pictures/universe/universe-${i + 1}.jpg`),
	galaxy: Array.from({ length: 12 }, (_, i) => `/pictures/galaxy/galaxy-${i + 1}.jpg`),
	blackHole: Array.from({ length: 12 }, (_, i) => `/pictures/black-hole/hole-${i + 1}.jpg`)
};

export const UI = {
	groupNames: ['Earth', 'Universe', 'Galaxy', 'Black hole'],
	internalGroupNames: Array.from({ length: 4 }, (_, i) => `Group ${i + 1}`)
};

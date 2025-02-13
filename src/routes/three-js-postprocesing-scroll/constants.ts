export const CONSTANTS = {
	IMAGES: {
		earth: Array.from({ length: 12 }, (_, i) => `/pictures/earth/earth-${i + 1}.jpg`),
		universe: Array.from({ length: 12 }, (_, i) => `/pictures/universe/universe-${i + 1}.jpg`),
		galaxy: Array.from({ length: 12 }, (_, i) => `/pictures/galaxy/galaxy-${i + 1}.jpg`),
		blackHole: Array.from({ length: 12 }, (_, i) => `/pictures/black-hole/hole-${i + 1}.jpg`)
	},
	UI: {
		groupNames: ['Earth', 'Universe', 'Galaxy', 'Black hole'],
		internalGroupNames: Array.from({ length: 4 }, (_, i) => `Group ${i + 1}`)
	},
	CAMERA: {
		INITIAL_FRUSTUM_SIZE: 7.5,
		ZOOMED_FRUSTUM_SIZE: 1.8,
		INITIAL_Y: -0.5
	},
	GRID: {
		ROWS: 4,
		COLUMNS: 3,
		HORIZONTAL_SPACING: 1.5,
		VERTICAL_SPACING: 1.5,
		TOTAL_SETS: 4,
		BUFFER_SETS: 2
	},
	SCROLL: {
		SPEED: 5.0,
		LERP_FACTOR: 0.1,
		DECELERATION: 0.92,
		MAX_VELOCITY: 0.5
	},
	EFFECT: {
		INTENSITY: 0.15,
		LERP: 0.08
	},
	SCALE: {
		HOVER: 2.0,
		ZOOM: 2.0,
		NEIGHBOR: 0.7
	},
	DURATION: {
		HOVER: 0.3,
		ZOOM: 1.0,
		OPACITY_TRANSITION: 0.5
	},
	AUTO_CENTER: {
		DELAY: 500,
		SPEED: 0.02,
		THRESHOLD: 0.0008,
		MAX_MULTIPLIER: 2.0
	},
	TOUCH: {
		SCROLL_THRESHOLD: 10,
		TIME_THRESHOLD: 200
	},
	OPACITY: {
		ACTIVE: 1.0,
		INACTIVE: 0.5
	},
	TEXT: {
		HIDE_THRESHOLD: 0.3,
		CONTAINER_ID: 'text-container',
		GROUP_SWITCH_THRESHOLD: 1.4
	},
	OVERLAP: {
		VERTICAL_OFFSET: 0.5
	}
} as const;

export default CONSTANTS;

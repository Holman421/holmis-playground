import Stats from 'stats.js';

export interface StatsInstance {
	stats: Stats;
	statsMs: Stats;
	statsMb: Stats;
}

interface SetupStatsOptions {
	/**
	 * Position from the top of the screen in pixels
	 * @default 0
	 */
	top?: number;
	/**
	 * Position from the left of the screen in pixels
	 * @default 0
	 */
	left?: number;
	/**
	 * Spacing between panels in pixels
	 * @default 80
	 */
	spacing?: number;
	/**
	 * Opacity of the panels (0-1)
	 * @default 0.9
	 */
	opacity?: number;
	/**
	 * Whether to use fixed positioning
	 * @default true
	 */
	fixed?: boolean;
}

/**
 * Sets up three Stats.js panels side by side for FPS, MS, and MB monitoring
 * @param options Configuration options for positioning and appearance
 * @returns Object containing the three stats instances
 */
export function setupStats(options: SetupStatsOptions = {}): StatsInstance {
	const {
		top = 0,
		left = 0,
		spacing = 80,
		opacity = 0.9,
		fixed = true
	} = options;

	const position = fixed ? 'fixed' : 'absolute';

	// FPS Panel
	const stats = new Stats();
	stats.showPanel(0); // FPS
	stats.domElement.style.cssText = `position:${position};top:${top}px;left:${left}px;cursor:pointer;opacity:${opacity};z-index:10000`;
	document.body.appendChild(stats.domElement);

	// MS Panel
	const statsMs = new Stats();
	statsMs.showPanel(1); // MS
	statsMs.domElement.style.cssText = `position:${position};top:${top}px;left:${left + spacing}px;cursor:pointer;opacity:${opacity};z-index:10000`;
	document.body.appendChild(statsMs.domElement);

	// MB Panel
	const statsMb = new Stats();
	statsMb.showPanel(2); // MB
	statsMb.domElement.style.cssText = `position:${position};top:${top}px;left:${left + spacing * 2}px;cursor:pointer;opacity:${opacity};z-index:10000`;
	document.body.appendChild(statsMb.domElement);

	return { stats, statsMs, statsMb };
}

/**
 * Updates all three stats panels
 * @param statsInstance The stats instance returned from setupStats
 */
export function updateStats(statsInstance: StatsInstance): void {
	statsInstance.stats.update();
	statsInstance.statsMs.update();
	statsInstance.statsMb.update();
}

/**
 * Removes all stats panels from the DOM
 * @param statsInstance The stats instance returned from setupStats
 */
export function removeStats(statsInstance: StatsInstance): void {
	document.body.removeChild(statsInstance.stats.domElement);
	document.body.removeChild(statsInstance.statsMs.domElement);
	document.body.removeChild(statsInstance.statsMb.domElement);
}

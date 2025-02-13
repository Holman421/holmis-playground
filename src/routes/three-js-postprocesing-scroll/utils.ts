import type { Mesh } from 'three';

interface PlaneMetadata {
	row: number;
	col: number;
	setIndex: number;
	id: string;
	groupName: string;
}

export const calculateScaleOffset = (
	plane: Mesh,
	targetScale: number,
	planeMetadata: Map<Mesh, PlaneMetadata>
) => {
	const metadata = planeMetadata.get(plane);
	if (!metadata) return { x: 0, y: 0 };

	const isTopRow = metadata.row === 0;
	const isBottomRow = metadata.row === ROWS - 1;
	const scaleDelta = targetScale - 1;

	let yOffset = 0;
	if (isTopRow) {
		yOffset = scaleDelta * 0.5; // Move up when scaling from top
	} else if (isBottomRow) {
		yOffset = -(scaleDelta * 0.5); // Move down when scaling from bottom
	}

	return { x: 0, y: yOffset };
};

const ROWS = 4; // Required constant for the function

interface GridConstants {
	ROWS: number;
	COLUMNS: number;
	HORIZONTAL_SPACING: number;
	VERTICAL_SPACING: number;
	TOTAL_SETS: number;
	BUFFER_SETS: number;
}

export const findNeighboringPlanes = (
	plane: Mesh,
	allPlanes: Mesh[],
	gridConstants: GridConstants,
	planeMetadata: Map<Mesh, PlaneMetadata>
) => {
	const targetMetadata = planeMetadata.get(plane);
	if (!targetMetadata) return [];

	return allPlanes.filter((p) => {
		const metadata = planeMetadata.get(p);
		if (!metadata || p === plane) return false;

		// Calculate row and column differences
		const rowDiff = Math.abs(metadata.row - targetMetadata.row);
		const colDiff = Math.abs(metadata.col - targetMetadata.col);

		// Check if it's a direct or diagonal neighbor (within 1 step in any direction)
		const isNeighbor = rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);

		// If in same set, just check if neighbor
		if (metadata.setIndex === targetMetadata.setIndex) {
			return isNeighbor;
		}

		// For adjacent sets, handle edge wrapping
		const setDiff = Math.abs(metadata.setIndex - targetMetadata.setIndex);
		const wrappedSetDiff = Math.min(setDiff, Math.abs(setDiff - gridConstants.TOTAL_SETS));

		if (wrappedSetDiff === 1) {
			const isLeftEdge = targetMetadata.col === 0;
			const isRightEdge = targetMetadata.col === gridConstants.COLUMNS - 1;
			const neighborIsLeftEdge = metadata.col === 0;
			const neighborIsRightEdge = metadata.col === gridConstants.COLUMNS - 1;

			// Allow connections between edges including diagonals
			return (
				rowDiff <= 1 && // Same row or adjacent row
				((isRightEdge && neighborIsLeftEdge) || // Right edge connects to left edge
					(isLeftEdge && neighborIsRightEdge)) // Left edge connects to right edge
			);
		}

		return false;
	});
};

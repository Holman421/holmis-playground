import type { Material, Object3D } from 'three';

export type AnimationMode = 'gentle' | 'accelerating';

export interface BoxConfig {
	col: number;
	row: number;
	size: number;
	numCols: number;
	numRows: number;
}

export interface AnimatedBox extends Object3D {
	userData: {
		col: number;
		row: number;
		size: number;
		update: () => void;
	};
}

export interface BoxMaterials {
	mainMaterial: Material & { uniforms?: { opacity: { value: number } } };
	lineMaterial: Material;
}

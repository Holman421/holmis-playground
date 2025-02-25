import * as THREE from 'three';

export type ShaderMeshType = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

// Update export interfaces to match Three.js IUniform structure
export interface BaseUniforms {
	[uniform: string]: THREE.IUniform<any>;
	uTime: THREE.IUniform<number>;
	uResolution: THREE.IUniform<THREE.Vector2>;
}

export interface Shader1Uniforms {
	[uniform: string]: THREE.IUniform<any>;
	uTime: THREE.IUniform<number>;
	uResolution: THREE.IUniform<THREE.Vector2>;
	uColorA: THREE.IUniform<THREE.Color>;
	uColorB: THREE.IUniform<THREE.Color>;
}

export interface Shader3Uniforms {
	[uniform: string]: THREE.IUniform<any>;
	uTime: THREE.IUniform<number>;
	uResolution: THREE.IUniform<THREE.Vector2>;
	uTimeScale: THREE.IUniform<number>;
	uNoiseScale: THREE.IUniform<number>;
	uDistortScale: THREE.IUniform<number>;
}

export interface Shader4Uniforms {
	[uniform: string]: THREE.IUniform<any>;
	uTime: THREE.IUniform<number>;
	uResolution: THREE.IUniform<THREE.Vector2>;
	uColorA: THREE.IUniform<THREE.Color>;
	uColorB: THREE.IUniform<THREE.Color>;
	uColorC: THREE.IUniform<THREE.Color>;
	uSpeed: THREE.IUniform<number>;
	uNoiseScale: THREE.IUniform<number>;
	uEdgeIntensity: THREE.IUniform<number>;
	uVignetteIntensity: THREE.IUniform<number>;
	uHighlightColor: THREE.IUniform<THREE.Color>;
	uHighlightIntensity: THREE.IUniform<number>;
	uNormalInfluence: THREE.IUniform<number>;
}

export interface Shader5Uniforms {
	[uniform: string]: THREE.IUniform<any>;
	uTime: THREE.IUniform<number>;
	uResolution: THREE.IUniform<THREE.Vector2>;
	uNoiseScale: THREE.IUniform<number>;
}

export interface Shader6Uniforms {
	[uniform: string]: THREE.IUniform<any>;
	uTime: THREE.IUniform<number>;
	uResolution: THREE.IUniform<THREE.Vector2>;
	uBaseColor1: THREE.IUniform<THREE.Color>;
	uBaseColor2: THREE.IUniform<THREE.Color>;
	uAccentColor1: THREE.IUniform<THREE.Color>;
	uAccentColor2: THREE.IUniform<THREE.Color>;
	uAccentColor3: THREE.IUniform<THREE.Color>;
	uAccentColor4: THREE.IUniform<THREE.Color>;
	uNoiseScale: THREE.IUniform<number>;
	uTimeScale: THREE.IUniform<number>;
	uContrast: THREE.IUniform<number>;
	uVignetteIntensity: THREE.IUniform<number>;
}

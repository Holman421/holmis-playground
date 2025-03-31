import * as THREE from 'three';
import GUI from 'lil-gui';
import type { ShaderMeshType } from '../types';

// Add specific types for each shader's debug properties
export interface Shader1Debug {
	colorA: string;
	colorB: string;
}

export interface Shader2Debug {
	speed: number;
	noiseScale: number;
}

export interface Shader3Debug {
	timeScale: number;
	noiseScale: number;
	distortScale: number;
}

export interface Shader4Debug {
	colorA: string;
	colorB: string;
	colorC: string;
	speed: number;
	noiseScale: number;
	edgeIntensity: number;
	vignetteIntensity: number;
	highlightColor: string;
	highlightIntensity: number;
	normalInfluence: number;
}

export interface Shader5Debug {
	noiseScale: number;
}

export interface Shader6Debug {
	shader6BaseColor1: string;
	shader6BaseColor2: string;
	shader6AccentColor1: string;
	shader6AccentColor2: string;
	shader6AccentColor3: string;
	shader6AccentColor4: string;
	shader6NoiseScale: number;
	shader6TimeScale: number;
	shader6Contrast: number;
	shader6VignetteIntensity: number;
}

export interface Shader7Debug {}

export interface Shader8Debug {}

export interface Shader9Debug {
	speed: number;
	noiseScale: number;
	uOctaves: number;
	color1: string;
	color2: string;
	color3: string;
	color4: string;
	offsetX: number;
	offsetY: number;
	zoom: number; // Add this line
}

export interface Shader10Debug {
	fbmOffsetX: number;
	fbmOffsetY: number;
	fbmMoveSpeed: number;
}

export interface ShaderDebugObjects {
	shader1: Shader1Debug;
	shader2: Shader2Debug;
	shader3: Shader3Debug;
	shader4: Shader4Debug;
	shader5: Shader5Debug;
	shader6: Shader6Debug;
	shader7: Shader7Debug;
	shader8: Shader8Debug;
	shader9: Shader9Debug;
	shader10: Shader10Debug;
}

export function createDefaultDebugObjects(): ShaderDebugObjects {
	return {
		shader1: {
			colorA: '#239f76',
			colorB: '#ffbf59'
		},
		shader2: {
			speed: 0.05,
			noiseScale: 1.0
		},
		shader3: {
			timeScale: 0.95,
			noiseScale: 0.7,
			distortScale: 4.0
		},
		shader4: {
			colorA: '#239f76',
			colorB: '#ffbf59',
			colorC: '#145d58',
			speed: 0.05,
			noiseScale: 1.0,
			edgeIntensity: 0.0,
			vignetteIntensity: 0.0,
			highlightColor: '#ffb399',
			highlightIntensity: 1.0,
			normalInfluence: 1.0
		},
		shader5: {
			noiseScale: 1.0
		},
		shader6: {
			shader6BaseColor1: '#1A6666',
			shader6BaseColor2: '#80B300',
			shader6AccentColor1: '#59001A',
			shader6AccentColor2: '#0033FF',
			shader6AccentColor3: '#4C0000',
			shader6AccentColor4: '#008000',
			shader6NoiseScale: 0.004,
			shader6TimeScale: 0.007,
			shader6Contrast: 2.0,
			shader6VignetteIntensity: 0.65
		},
		shader7: {},
		shader8: {},
		shader9: {
			speed: 0.5,
			noiseScale: 0.8,
			uOctaves: 9,
			color1: '#813232', // Deep Blue
			color2: '#fea062', // Greenish
			color3: '#000000', // Yellow/Gold
			color4: '#90cefe', // Reddish
			offsetX: 0,
			offsetY: 0,
			zoom: 1.0 // Add this line
		},
		shader10: {
			fbmOffsetX: 0.0,
			fbmOffsetY: 0.0,
			fbmMoveSpeed: 0.5 // Changed from 0.05 to 1.5
		}
	};
}

// Update the GUI config interface to use the new types
export interface ShaderGuiConfig<T = any> {
	folder: GUI;
	plane: ShaderMeshType;
	debugObject: T;
}

// Update setup functions with specific types
export function setupShader3GUI({ folder, plane, debugObject }: ShaderGuiConfig<Shader3Debug>) {
	folder.add(debugObject, 'timeScale', 0.01, 2.0).onChange(() => {
		(plane.material as THREE.ShaderMaterial).uniforms.uTimeScale.value = debugObject.timeScale;
	});
	folder.add(debugObject, 'noiseScale', 0.1, 10.0).onChange(() => {
		(plane.material as THREE.ShaderMaterial).uniforms.uNoiseScale.value = debugObject.noiseScale;
	});
	folder.add(debugObject, 'distortScale', 1.0, 10.0).onChange(() => {
		(plane.material as THREE.ShaderMaterial).uniforms.uDistortScale.value =
			debugObject.distortScale;
	});
}

export function setupShader4GUI({ folder, plane, debugObject }: ShaderGuiConfig<Shader4Debug>) {
	folder.addColor(debugObject, 'colorA').onChange(() => {
		(plane.material as THREE.ShaderMaterial).uniforms.uColorA.value.set(debugObject.colorA);
	});
	// ...add other shader 4 controls...
}

function randomColor(): string {
	return (
		'#' +
		Math.floor(Math.random() * 16777215)
			.toString(16)
			.padStart(6, '0')
	);
}

// Update the adjustColor function to allow more variation
function adjustColor(baseColor: string): string {
	const rgb = new THREE.Color(baseColor);
	const hsl = { h: 0, s: 0, l: 0 };
	rgb.getHSL(hsl);

	// Add a bigger hue shift (0.1 to 0.3 of the color wheel)
	const hueShift = 0.1 + Math.random() * 0.2;
	const newHue = (hsl.h + hueShift) % 1.0;

	// Randomize saturation and lightness more
	const newSaturation = 0.3 + Math.random() * 0.7; // Between 0.3 and 1.0
	const newLightness = 0.2 + Math.random() * 0.6; // Between 0.2 and 0.8

	rgb.setHSL(newHue, newSaturation, newLightness);
	return '#' + rgb.getHexString();
}

// Remove the generateNearBlackOrWhite function since we don't need it anymore

export function setupShader9GUI({ folder, plane, debugObject }: ShaderGuiConfig<Shader9Debug>) {
	const material = plane.material as THREE.ShaderMaterial;

	folder
		.add(
			{
				randomizeColors: function () {
					// Generate three completely random colors
					const color1 = randomColor();
					const color2 = adjustColor(color1);
					const color3 = randomColor(); // Now completely random
					const color4 = randomColor();

					// Update debug object
					debugObject.color1 = color1;
					debugObject.color2 = color2;
					debugObject.color3 = color3;
					debugObject.color4 = color4;

					// Update uniforms
					material.uniforms.uColor1.value.set(color1);
					material.uniforms.uColor2.value.set(color2);
					material.uniforms.uColor3.value.set(color3);
					material.uniforms.uColor4.value.set(color4);

					// Update all color controllers
					folder.controllers.forEach((controller) => {
						if (controller.property.startsWith('color')) {
							controller.updateDisplay();
						}
					});
				}
			},
			'randomizeColors'
		)
		.name('Randomize Colors');

	// Update zoom range from 10.0 to 50.0
	folder.add(debugObject, 'zoom', 0.0, 50.0).onChange((value: number) => {
		material.uniforms.uZoom.value = value;
	});

	folder.add(debugObject, 'speed', 0.01, 2.0).onChange((value: number) => {
		material.uniforms.uSpeed.value = value;
	});

	folder.add(debugObject, 'noiseScale', 0.01, 4.0).onChange((value: number) => {
		material.uniforms.uNoiseScale.value = value;
	});

	folder.add(debugObject, 'uOctaves', 1, 15, 1).onChange((value: number) => {
		material.uniforms.uOctaves.value = value;
	});

	folder.addColor(debugObject, 'color1').onChange((value: string) => {
		material.uniforms.uColor1.value.set(value);
	});

	folder.addColor(debugObject, 'color2').onChange((value: string) => {
		material.uniforms.uColor2.value.set(value);
	});

	folder.addColor(debugObject, 'color3').onChange((value: string) => {
		material.uniforms.uColor3.value.set(value);
	});

	folder.addColor(debugObject, 'color4').onChange((value: string) => {
		material.uniforms.uColor4.value.set(value);
	});

	folder.add(debugObject, 'offsetX', -20, 20, 0.01).onChange((value: number) => {
		material.uniforms.uOffsetX.value = value;
	});

	folder.add(debugObject, 'offsetY', -20, 20, 0.01).onChange((value: number) => {
		material.uniforms.uOffsetY.value = value;
	});
}

export function setupShader10GUI({ folder, plane, debugObject }: ShaderGuiConfig<Shader10Debug>) {
	folder.add(debugObject, 'fbmOffsetX', -10.0, 10.0, 0.01).onChange((value: number) => {
		(plane.material as THREE.ShaderMaterial).uniforms.uFbmOffset.value.x = value;
	});

	folder.add(debugObject, 'fbmOffsetY', -10.0, 10.0, 0.01).onChange((value: number) => {
		(plane.material as THREE.ShaderMaterial).uniforms.uFbmOffset.value.y = value;
	});

	folder.add(debugObject, 'fbmMoveSpeed', 0.01, 1.5, 0.01).name('Movement Speed');
}

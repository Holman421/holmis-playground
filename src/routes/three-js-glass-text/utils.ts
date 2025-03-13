import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import type GUI from 'lil-gui';

export const addTorus = (scene: THREE.Scene, debugObject: any) => {
	const torusGeometry = new THREE.TorusGeometry(1.5, 0.4, 16, 100);
	const torusMaterial = new THREE.MeshPhysicalMaterial({
		color: debugObject.torusColor,
		metalness: debugObject.metalness,
		roughness: debugObject.roughness,
		transmission: debugObject.transmission,
		thickness: debugObject.thickness,
		clearcoat: debugObject.clearcoat,
		clearcoatRoughness: debugObject.clearcoatRoughness,
		ior: debugObject.ior,
		wireframe: debugObject.wireframe,
		dispersion: debugObject.dispersion,
		anisotropy: debugObject.anisotropy,
		iridescence: debugObject.iridescence
	});

	const torus = new THREE.Mesh(torusGeometry, torusMaterial);
	torus.rotation.x = Math.PI * 0.5;
	scene.add(torus);

	return { torus, torusMaterial };
};

export const setupTorusGUI = (
	gui: GUI,
	torusMaterial: THREE.MeshPhysicalMaterial,
	debugObject: any
) => {
	const torusFolder = gui.addFolder('Torus');
	torusFolder.addColor(debugObject, 'torusColor').onChange(() => {
		torusMaterial.color.set(debugObject.torusColor);
	});
	torusFolder
		.add(debugObject, 'metalness')
		.min(0)
		.max(1)
		.step(0.1)
		.onChange(() => {
			torusMaterial.metalness = debugObject.metalness;
		});
	torusFolder
		.add(debugObject, 'roughness')
		.min(0)
		.max(1)
		.step(0.1)
		.onChange(() => {
			torusMaterial.roughness = debugObject.roughness;
		});
	torusFolder
		.add(debugObject, 'transmission')
		.min(0)
		.max(1)
		.step(0.01)
		.onChange(() => {
			torusMaterial.transmission = debugObject.transmission;
		});
	torusFolder
		.add(debugObject, 'thickness')
		.min(0)
		.max(2)
		.step(0.1)
		.onChange(() => {
			torusMaterial.thickness = debugObject.thickness;
		});
	torusFolder
		.add(debugObject, 'clearcoat')
		.min(0)
		.max(1)
		.step(0.1)
		.onChange(() => {
			torusMaterial.clearcoat = debugObject.clearcoat;
		});
	torusFolder
		.add(debugObject, 'clearcoatRoughness')
		.min(0)
		.max(1)
		.step(0.1)
		.onChange(() => {
			torusMaterial.clearcoatRoughness = debugObject.clearcoatRoughness;
		});
	torusFolder
		.add(debugObject, 'ior')
		.min(1)
		.max(2.333)
		.step(0.01)
		.onChange(() => {
			torusMaterial.ior = debugObject.ior;
		});
	torusFolder
		.add(debugObject, 'dispersion')
		.min(0)
		.max(20)
		.step(0.01)
		.onChange(() => {
			torusMaterial.dispersion = debugObject.dispersion;
		});
	torusFolder
		.add(debugObject, 'anisotropy')
		.min(-1)
		.max(1)
		.step(0.01)
		.onChange(() => {
			torusMaterial.anisotropy = debugObject.anisotropy;
		});

	torusFolder
		.add(debugObject, 'iridescence')
		.min(0)
		.max(1)
		.step(0.01)
		.onChange(() => {
			torusMaterial.iridescence = debugObject.iridescence;
		});

	torusFolder.add(debugObject, 'wireframe').onChange(() => {
		torusMaterial.wireframe = debugObject.wireframe;
	});
};

export const addText = (scene: THREE.Scene, debugObject: any) => {
	const loader = new FontLoader();
	const uniforms = {
		uTime: { value: 0 }
	};

	return new Promise<{ textMesh: THREE.Mesh; uniforms: { uTime: { value: number } } }>(
		(resolve) => {
			loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
				const geometry = new TextGeometry('Wonder Makers Wonder Makers', {
					font: font,
					size: 0.4,
					depth: 0.005,
					curveSegments: 12,
					bevelEnabled: true,
					bevelThickness: 0.03,
					bevelSize: 0.01,
					bevelOffset: 0,
					bevelSegments: 10
				});

				const material = new THREE.MeshStandardMaterial({
					color: debugObject.textColor
				});

				material.onBeforeCompile = (shader) => {
					shader.uniforms.uTime = uniforms.uTime;

					shader.vertexShader =
						`
						uniform float uTime;
						
						mat4 rotationMatrix(vec3 axis, float angle) {
							axis = normalize(axis);
							float s = sin(angle);
							float c = cos(angle);
							float oc = 1.0 - c;
							
							return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
									  oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
									  oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
									  0.0,                                0.0,                                0.0,                                1.0);
						}

						vec3 rotate(vec3 v, vec3 axis, float angle) {
							mat4 m = rotationMatrix(axis, angle);
							return (m * vec4(v, 1.0)).xyz;
						}
						` + shader.vertexShader;

					shader.vertexShader = shader.vertexShader.replace(
						'#include <begin_vertex>',
						`
						#include <begin_vertex>
						float radius = 1.6;
						float angle = position.x * 0.75;
						
						vec3 pos = position;
						float theta = angle;
						vec3 dir = vec3(sin(theta), 0.0, cos(theta));
						transformed = radius * dir + vec3(0.0, pos.y, 0.0) + dir * pos.z;
						`
					);
				};

				const textMesh = new THREE.Mesh(geometry, material);
				textMesh.position.set(-0, -0.15, 0);
				scene.add(textMesh);

				resolve({ textMesh, uniforms });
			});
		}
	);
};

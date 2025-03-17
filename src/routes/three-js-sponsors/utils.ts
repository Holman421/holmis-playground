import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import type GUI from 'lil-gui';

export const addRectangle = (scene: THREE.Scene, debugObject: any) => {
	const rectangleGeometry = new THREE.BoxGeometry(1, 20, 1, 10, 100, 10);
	const uniforms = {
		uTime: { value: 0 },
		uMetalnessSpeed: { value: 1.0 },
		uMetalnessStrength: { value: 1.0 }
	};

	const rectangleMaterial = new THREE.MeshPhysicalMaterial({
		color: debugObject.rectangleColor,
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

	rectangleMaterial.onBeforeCompile = (shader) => {
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
			float radius = 1.0;
			
			vec3 pos = position;
			float twistAdjustment = (position.y - 0.5) * 0.1;
			twistAdjustment = abs(twistAdjustment);
			twistAdjustment = smoothstep(0.0, 1.0, twistAdjustment);
			float twistAmount = 2.0 * sin(5.0) * 0.05 * twistAdjustment;
			float twistAngle = pos.y * twistAmount;
			transformed = rotate(position, vec3(0.0, 1.0, 0.0), twistAngle);
			`
		);
	};

	const rectangle = new THREE.Mesh(rectangleGeometry, rectangleMaterial);
	rectangle.rotation.x = Math.PI * 0.5;
	rectangle.rotation.z = Math.PI * 0.5;

	scene.add(rectangle);

	return { rectangle, rectangleMaterial, uniforms };
};

export const setupRectangleGUI = (
	gui: GUI,
	rectangleMaterial: THREE.MeshPhysicalMaterial,
	debugObject: any
) => {
	const rectangleFolder = gui.addFolder('Rectangle');
	rectangleFolder.addColor(debugObject, 'rectangleColor').onChange(() => {
		rectangleMaterial.color.set(debugObject.rectangleColor);
	});
	rectangleFolder
		.add(debugObject, 'metalness')
		.min(0)
		.max(1)
		.step(0.01)
		.onChange(() => {
			rectangleMaterial.metalness = debugObject.metalness;
		});
	rectangleFolder
		.add(debugObject, 'roughness')
		.min(0)
		.max(1)
		.step(0.1)
		.onChange(() => {
			rectangleMaterial.roughness = debugObject.roughness;
		});
	rectangleFolder
		.add(debugObject, 'transmission')
		.min(0)
		.max(1)
		.step(0.01)
		.onChange(() => {
			rectangleMaterial.transmission = debugObject.transmission;
		});
	rectangleFolder
		.add(debugObject, 'thickness')
		.min(0)
		.max(5)
		.step(0.1)
		.onChange(() => {
			rectangleMaterial.thickness = debugObject.thickness;
		});
	rectangleFolder
		.add(debugObject, 'clearcoat')
		.min(0)
		.max(1)
		.step(0.1)
		.onChange(() => {
			rectangleMaterial.clearcoat = debugObject.clearcoat;
		});
	rectangleFolder
		.add(debugObject, 'clearcoatRoughness')
		.min(0)
		.max(1)
		.step(0.1)
		.onChange(() => {
			rectangleMaterial.clearcoatRoughness = debugObject.clearcoatRoughness;
		});
	rectangleFolder
		.add(debugObject, 'ior')
		.min(1)
		.max(2.333)
		.step(0.01)
		.onChange(() => {
			rectangleMaterial.ior = debugObject.ior;
		});
	rectangleFolder
		.add(debugObject, 'dispersion')
		.min(0)
		.max(20)
		.step(0.01)
		.onChange(() => {
			rectangleMaterial.dispersion = debugObject.dispersion;
		});
	rectangleFolder
		.add(debugObject, 'anisotropy')
		.min(-1)
		.max(1)
		.step(0.01)
		.onChange(() => {
			rectangleMaterial.anisotropy = debugObject.anisotropy;
		});

	rectangleFolder
		.add(debugObject, 'iridescence')
		.min(0)
		.max(1)
		.step(0.01)
		.onChange(() => {
			rectangleMaterial.iridescence = debugObject.iridescence;
		});

	rectangleFolder.add(debugObject, 'wireframe').onChange(() => {
		rectangleMaterial.wireframe = debugObject.wireframe;
	});
};

export const addText = (scene: THREE.Scene, debugObject: any) => {
	const loader = new FontLoader();
	const uniforms = {
		uTime: { value: 0 },
		uSpeed: { value: 0.5 } // Reduced speed for smoother animation
	};
	const TEXT_SPACING = 0.5; // Space between text instances

	return new Promise<{
		textMeshes: THREE.Mesh[];
		uniforms: { uTime: { value: number }; uSpeed: { value: number } };
	}>((resolve) => {
		loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
			const geometry = new TextGeometry(
				'Wonder Makers  Wonder Makers  Wonder Makers  Wonder Makers',
				{
					font: font,
					size: 0.4,
					depth: 0.005,
					curveSegments: 12,
					bevelEnabled: true,
					bevelThickness: 0.03,
					bevelSize: 0.01,
					bevelOffset: 0,
					bevelSegments: 10
				}
			);

			// Center vertically
			geometry.computeBoundingBox();
			const textWidth = geometry.boundingBox!.max.x - geometry.boundingBox!.min.x;
			const centerOffset = geometry.boundingBox!.getCenter(new THREE.Vector3());
			geometry.translate(0, -centerOffset.y, 0);

			const material = new THREE.MeshStandardMaterial({
				color: debugObject.textColor
			});

			const createShaderMaterial = (offset: number) => {
				const mat = material.clone();
				mat.onBeforeCompile = (shader) => {
					shader.uniforms.uTime = uniforms.uTime;
					shader.uniforms.uSpeed = uniforms.uSpeed;
					shader.uniforms.uOffset = { value: offset };

					shader.vertexShader = shader.vertexShader.replace(
						'#include <common>',
						`
                        #include <common>
                        uniform float uTime;
                        uniform float uSpeed;
                        uniform float uOffset;
                        `
					);

					shader.vertexShader = shader.vertexShader.replace(
						'#include <begin_vertex>',
						`
                        #include <begin_vertex>
                        float spacing = ${TEXT_SPACING.toFixed(1)};
                        float totalWidth = ${textWidth.toFixed(5)} + spacing;
                        float xOffset = mod(uTime * uSpeed, totalWidth);
                        transformed.x -= xOffset;
                        transformed.x += uOffset;
                        `
					);
				};
				return mat;
			};

			// Create two meshes with proper spacing
			const textMesh1 = new THREE.Mesh(geometry, createShaderMaterial(-8));
			const textMesh2 = new THREE.Mesh(
				geometry,
				createShaderMaterial(-8 + textWidth + TEXT_SPACING)
			);

			// Position the meshes
			textMesh1.position.set(0, 0, 0);
			textMesh2.position.set(0, 0, 0);

			scene.add(textMesh1);
			scene.add(textMesh2);

			resolve({ textMeshes: [textMesh1, textMesh2], uniforms });
		});
	});
};

export const handleResize = (
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer,
	sizes: any,
	window: Window
) => {
	window.addEventListener('resize', () => {
		sizes.width = window.innerWidth;
		sizes.height = window.innerHeight - 56;
		sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);
		camera.aspect = sizes.width / sizes.height;
		camera.updateProjectionMatrix();
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
	});
};

export const handleSizes = (window: Window) => {
	return {
		width: window.innerWidth,
		height: window.innerHeight - 56,
		pixelRatio: Math.min(window.devicePixelRatio, 2)
	};
};

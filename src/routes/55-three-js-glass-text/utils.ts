import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import type GUI from 'lil-gui';
import gsap from 'gsap/all';

export type GlassTextState = 'idle' | 'active';

export const addTorus = (
	scene: THREE.Scene,
	debugObject: any,
	position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
	rotation: THREE.Euler = new THREE.Euler(Math.PI * 0.5, 0, 0)
) => {
	// Create two geometries - high and low quality
	const torusGeometryHQ = new THREE.TorusGeometry(2.5, 0.4, 32, 200);
	const torusGeometryLQ = new THREE.TorusGeometry(2.5, 0.4, 8, 25);
	// Start with low quality
	const torusGeometry = torusGeometryLQ;
	const uniforms = {
		uTime: { value: 0 },
		uMetalnessSpeed: { value: 1.0 },
		uMetalnessStrength: { value: 0.0 }
	};

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

	torusMaterial.onBeforeCompile = (shader) => {
		shader.uniforms.uTime = uniforms.uTime;
		shader.uniforms.uMetalnessSpeed = uniforms.uMetalnessSpeed;
		shader.uniforms.uMetalnessStrength = uniforms.uMetalnessStrength;

		shader.vertexShader = shader.vertexShader.replace(
			'#include <common>',
			`
			#include <common>
			varying vec3 vPosition;
			`
		);

		shader.vertexShader = shader.vertexShader.replace(
			'#include <begin_vertex>',
			`
			#include <begin_vertex>
			vPosition = position;
			`
		);

		shader.fragmentShader =
			`
			varying vec3 vPosition;
			uniform float uTime;
			uniform float uMetalnessSpeed;
			uniform float uMetalnessStrength;

			// Perlin noise functions
			vec4 permute(vec4 x) {
				return mod(((x*34.0)+1.0)*x, 289.0);
			}
			vec4 taylorInvSqrt(vec4 r) {
				return 1.79284291400159 - 0.85373472095314 * r;
			}
			vec3 fade(vec3 t) {
				return t*t*t*(t*(t*6.0-15.0)+10.0);
			}

			float cnoise(vec3 P) {
				vec3 Pi0 = floor(P);
				vec3 Pi1 = Pi0 + vec3(1.0);
				Pi0 = mod(Pi0, 289.0);
				Pi1 = mod(Pi1, 289.0);
				vec3 Pf0 = fract(P);
				vec3 Pf1 = Pf0 - vec3(1.0);
				vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
				vec4 iy = vec4(Pi0.yy, Pi1.yy);
				vec4 iz0 = Pi0.zzzz;
				vec4 iz1 = Pi1.zzzz;

				vec4 ixy = permute(permute(ix) + iy);
				vec4 ixy0 = permute(ixy + iz0);
				vec4 ixy1 = permute(ixy + iz1);

				vec4 gx0 = ixy0/7.0;
				vec4 gy0 = fract(floor(gx0)/7.0)-0.5;
				gx0 = fract(gx0);
				vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
				vec4 sz0 = step(gz0, vec4(0.0));
				gx0 -= sz0 * (step(0.0, gx0) - 0.5);
				gy0 -= sz0 * (step(0.0, gy0) - 0.5);

				vec4 gx1 = ixy1/7.0;
				vec4 gy1 = fract(floor(gx1)/7.0)-0.5;
				gx1 = fract(gx1);
				vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
				vec4 sz1 = step(gz1, vec4(0.0));
				gx1 -= sz1 * (step(0.0, gx1) - 0.5);
				gy1 -= sz1 * (step(0.0, gy1) - 0.5);

				vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
				vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
				vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
				vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
				vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
				vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
				vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
				vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

				vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
				g000 *= norm0.x;
				g010 *= norm0.y;
				g100 *= norm0.z;
				g110 *= norm0.w;
				vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
				g001 *= norm1.x;
				g011 *= norm1.y;
				g101 *= norm1.z;
				g111 *= norm1.w;

				float n000 = dot(g000, Pf0);
				float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
				float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
				float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
				float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
				float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
				float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
				float n111 = dot(g111, Pf1);

				vec3 fade_xyz = fade(Pf0);
				vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
				vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
				float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
				return 2.2 * n_xyz;
			}
		` + shader.fragmentShader;

		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <metalnessmap_fragment>',
			`
			#include <metalnessmap_fragment>
            float adjustedPosition = vPosition.y + 1.25;
			float noise = cnoise(vec3(vPosition.xzy * 1.0) + uTime * 0.5);
            noise = noise * 0.5 + 0.5;
            noise = smoothstep(0.0, 0.5, noise);
            // noise = noise * 2.0 + 0.25;
            // noise = step(0.5, noise);   

			float positionBasedMetalness = 1.0 - smoothstep(0.2, 1.0, adjustedPosition);
            float noisePosition = 1.0 - smoothstep(-0.75, 1.5, vPosition.y - 2.0);
            float finalNoise = noise * noisePosition;
            float finalMetalness = positionBasedMetalness + finalNoise;
            metalnessFactor = min(1.0, finalMetalness) * uMetalnessStrength;
            `
		);
	};

	const torus = new THREE.Mesh(torusGeometry, torusMaterial);
	torus.position.copy(position);
	torus.rotation.copy(rotation);
	scene.add(torus);

	return { torus, torusMaterial, uniforms, torusGeometryHQ, torusGeometryLQ };
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
		.step(0.01)
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
		.max(5)
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

export const addText = async (
	scene: THREE.Scene,
	debugObject: any,
	text: string = 'Ales Holman  Ales Holman  Ales Holman',
	position: THREE.Vector3 = new THREE.Vector3(0, -0.15, 0)
) => {
	const loader = new FontLoader();
	const uniforms = {
		uTime: { value: 0 }
	};

	return new Promise<{ textMesh: THREE.Mesh; uniforms: { uTime: { value: number } } }>(
		(resolve) => {
			loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
				const geometry = new TextGeometry(text, {
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
						float radius = 2.6;
						float angle = position.x * 0.49;
						
						vec3 pos = position;
						float theta = angle;
						vec3 dir = vec3(sin(theta), 0.0, cos(theta));
						transformed = radius * dir + vec3(0.0, pos.y, 0.0) + dir * pos.z;
						`
					);
				};

				const textMesh = new THREE.Mesh(geometry, material);
				textMesh.position.copy(position);
				scene.add(textMesh);

				resolve({ textMesh, uniforms });
			});
		}
	);
};

export const createGlassTextDisplay = async (
	scene: THREE.Scene,
	gui: GUI,
	options = {
		id: 1, // Add id to options
		text: 'Ales Holman  Ales Holman  Ales Holman',
		startPosition: { x: -10, y: 17.5, z: -75 },
		startRotation: { x: 1.5, y: 0, z: 0 },
		targetPosition: { x: 0, y: 0, z: 0 },
		targetRotation: { x: 0.3, y: 0, z: 0 }
	}
) => {
	const group = new THREE.Group();
	scene.add(group);

	let currentRotation = { ...options.startRotation };
	let continuousRotationY = 0; // Add this
	let isHovered = false;
	let currentSpeed = 0.01; // Add this line to track current speed

	const debugObject = {
		torusColor: '#aaaaaa',
		textColor: '#e1fc06',
		metalness: 0.0,
		roughness: 0.0,
		transmission: 1.0,
		thickness: 0.6,
		clearcoat: 1.0,
		clearcoatRoughness: 0.3,
		ior: 1.05,
		wireframe: false,
		anisotropy: 0,
		dispersion: 0.0,
		iridescence: 1.0,
		text: options.text,
		scale: 1.0
	};

	const {
		torus,
		torusMaterial,
		uniforms: torusUniforms,
		torusGeometryHQ,
		torusGeometryLQ
	} = addTorus(
		scene,
		debugObject,
		new THREE.Vector3(0, 0, 0),
		new THREE.Euler(Math.PI * 0.5, 0, 0)
	);

	const textResult = await addText(
		scene,
		debugObject,
		options.text,
		new THREE.Vector3(0, -0.15, 0)
	);

	group.add(torus);
	group.add(textResult.textMesh);

	group.position.set(options.startPosition.x, options.startPosition.y, options.startPosition.z);
	group.rotation.set(options.startRotation.x, options.startRotation.y, options.startRotation.z);

	// Setup GUI controls as before
	// const displayFolder = gui.addFolder('Glass Text Display');

	// Text controls
	// const textControls = displayFolder.addFolder('Text');
	// textControls.add(debugObject, 'text').onChange(async () => {
	// 	scene.remove(textResult.textMesh);
	// 	const newText = await addText(
	// 		scene,
	// 		debugObject,
	// 		debugObject.text,
	// 		new THREE.Vector3(0, -0.15, 0)
	// 	);
	// 	Object.assign(textResult, newText);
	// });
	// textControls.addColor(debugObject, 'textColor').onChange(() => {
	// 	(textResult.textMesh.material as THREE.MeshStandardMaterial).color.set(debugObject.textColor);
	// });

	// Torus controls
	// setupTorusGUI(displayFolder, torusMaterial, debugObject);

	// Group controls
	// const groupControls = displayFolder.addFolder('Group');
	// groupControls.add(debugObject, 'scale', 0.1, 2, 0.1).onChange((value: number) => {
	// 	torus.scale.setScalar(value);
	// 	textResult.textMesh.scale.setScalar(value);
	// });

	let state: GlassTextState = 'idle';
	let currentAnimation: gsap.core.Timeline | null = null;
	let currentHoverAnimation: any;
	const getBaseRotation = () => ({ ...currentRotation });

	const animate = (targetState: GlassTextState) => {
		if (currentAnimation) currentAnimation.kill();
		if (currentHoverAnimation) currentHoverAnimation.kill();

		// Reset hover state and speed when becoming active
		if (targetState === 'active') {
			isHovered = false;
			const speedObj = { speed: currentSpeed };
			gsap.to(speedObj, {
				speed: 0.01,
				duration: 0.3,
				ease: 'power2.inOut',
				onUpdate: () => {
					currentSpeed = speedObj.speed;
				}
			});
		}

		const prevState = state;
		state = targetState;

		// Reset any mouse-based rotation before starting animation
		if (prevState === 'active' && state === 'idle') {
			group.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z);
		}

		const easing = state === 'active' ? 'power4.out' : 'power1.out';

		const timeline = gsap.timeline({ defaults: { duration: 1.75, ease: easing } });

		if (state === 'active') {
			// Switch to high quality geometry
			torus.geometry.dispose();
			torus.geometry = torusGeometryHQ;

			// Enhance material quality
			torusMaterial.roughness = 0.0;
			torusMaterial.transmission = 1.0;
			torusMaterial.clearcoat = 1.0;
			torusMaterial.clearcoatRoughness = 0.3;

			timeline
				.to(group.position, options.targetPosition)
				.to(
					group.rotation,
					{
						x: options.targetRotation.x,
						y: options.targetRotation.y,
						z: options.targetRotation.z,
						onUpdate: () => {
							currentRotation.x = group.rotation.x;
							currentRotation.y = group.rotation.y;
							currentRotation.z = group.rotation.z;
						}
					},
					'<'
				)
				.to(torusUniforms.uMetalnessStrength, { value: 1.0 }, '<');
		} else {
			// Switch to low quality geometry
			torus.geometry.dispose();
			torus.geometry = torusGeometryLQ;

			// Reduce material quality
			torusMaterial.roughness = 0.2;
			torusMaterial.transmission = 1;
			torusMaterial.clearcoat = 0.5;
			torusMaterial.clearcoatRoughness = 0.5;

			timeline
				.to(group.position, options.startPosition)
				.to(
					group.rotation,
					{
						x: options.startRotation.x,
						y: options.startRotation.y,
						z: options.startRotation.z,
						onUpdate: () => {
							currentRotation.x = group.rotation.x;
							currentRotation.y = group.rotation.y;
							currentRotation.z = group.rotation.z;
						}
					},
					'<'
				)
				.to(torusUniforms.uMetalnessStrength, { value: 0.0 }, '<');
		}

		currentAnimation = timeline;
	};

	const setHovered = (value: boolean) => {
		// Only allow hover speed changes in idle state
		if (state === 'idle') {
			isHovered = value;
			const speedObj = { speed: currentSpeed };
			gsap.to(speedObj, {
				speed: value ? 0.07 : 0.01,
				duration: 0.3,
				ease: 'power2.inOut',
				onUpdate: () => {
					currentSpeed = speedObj.speed;
				}
			});
		}
	};

	const update = (elapsedTime: number, mouseX: number, mouseY: number, rotationSpeed: number) => {
		// Use the current animated speed
		continuousRotationY -= currentSpeed;
		textResult.textMesh.rotation.y = continuousRotationY;

		// Only apply mouse-based rotation when group is active
		if (state === 'active') {
			group.rotation.x = currentRotation.x + mouseY * 0.075;
			group.rotation.y = currentRotation.y;
			group.rotation.z = currentRotation.z + mouseX * 0.075;
		}

		if (textResult.uniforms) textResult.uniforms.uTime.value = elapsedTime;
		if (torusUniforms) torusUniforms.uTime.value = elapsedTime;
	};

	torus.userData.groupId = options.id; // Add id to torus
	textResult.textMesh.userData.groupId = options.id; // Add id to text

	// Add pointer cursor to meshes
	torus.userData.cursor = 'pointer';
	textResult.textMesh.userData.cursor = 'pointer';

	return {
		id: options.id, // Add id to return value
		group,
		torus,
		textMesh: textResult.textMesh,
		torusMaterial,
		torusUniforms,
		textUniforms: textResult.uniforms,
		animate,
		update,
		currentHoverAnimation,
		getBaseRotation,
		setHovered,
		get state() {
			return state;
		}
	};
};

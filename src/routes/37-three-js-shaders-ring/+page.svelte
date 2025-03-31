<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import vertexShader from './shaders/vertex.glsl';
	import fragmentShader from './shaders/fragment.glsl';
	import {
		EffectComposer,
		FontLoader,
		RenderPass,
		ShaderPass,
		TextGeometry,
		UnrealBloomPass
	} from 'three/examples/jsm/Addons.js';
	import { gsap } from 'gsap';
	import { text } from '@sveltejs/kit';

	interface CustomShaderMaterial extends THREE.ShaderMaterial {
		uniforms: {
			uTime: { value: number };
			uNoiseFrequency: { value: number };
			uNoiseAmplitude: { value: number };
			uNoiseSpeed: { value: number };
			uThreshold: { value: number };
			uSmoothness: { value: number };
			uInwardColor: { value: THREE.Color };
			uOutwardColor: { value: THREE.Color };
			uSmoothStart: { value: number };
			uSmoothEnd: { value: number };
			uPowFactor: { value: number };
		};
	}

	interface CustomTextMaterial extends THREE.ShaderMaterial {
		uniforms: {
			uTransition: { value: number };
			uColor: { value: THREE.Color };
		};
	}

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {
			noiseFrequency: 6.0,
			noiseAmplitude: 0.4,
			noiseSpeed: 1.0,
			threshold: 0.093,
			smoothness: 0.106,
			inwardColor: [0, 0, 0],
			outwardColor: [0.92, 0.99, 0.02],
			bloomStrength: 1.3,
			bloomRadius: 0.0002,
			bloomThreshold: 0.0,
			smoothStart: 0.1,
			smoothEnd: 1.0,
			powFactor: 2.0,
			text1: {
				textTransition: 1.0
			},
			text2: {
				textTransition: 1.1
			},
			textColor: [0.92, 0.99, 0.02] // Yellow color
		};

		const BLOOM_SCENE = 1;
		const bloomLayer = new THREE.Layers();
		bloomLayer.set(BLOOM_SCENE);

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Plane
		const torus = new THREE.Mesh(
			new THREE.TorusGeometry(1, 0.3, 500, 500),
			new THREE.ShaderMaterial({
				vertexShader,
				fragmentShader,
				side: THREE.DoubleSide,
				wireframe: false,
				uniforms: {
					uTime: { value: 0 },
					uNoiseFrequency: { value: debugObject.noiseFrequency },
					uNoiseAmplitude: { value: debugObject.noiseAmplitude },
					uNoiseSpeed: { value: debugObject.noiseSpeed },
					uThreshold: { value: debugObject.threshold },
					uSmoothness: { value: debugObject.smoothness },
					uInwardColor: { value: new THREE.Color(...debugObject.inwardColor) },
					uOutwardColor: { value: new THREE.Color(...debugObject.outwardColor) },
					uSmoothStart: { value: debugObject.smoothStart },
					uSmoothEnd: { value: debugObject.smoothEnd },
					uPowFactor: { value: debugObject.powFactor }
				}
			}) as CustomShaderMaterial
		);

		torus.rotateY(Math.PI * -0.25);
		torus.position.x = 3;
		torus.layers.enable(BLOOM_SCENE);
		scene.add(torus);

		const createText = (
			text: string,
			position: THREE.Vector3,
			transmisiton: number,
			direction: 'left' | 'right' = 'left'
		): Promise<THREE.Mesh> => {
			return new Promise((resolve) => {
				const fontLoader = new FontLoader();

				fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
					const textGeometry = new TextGeometry(text, {
						font,
						size: 0.9,
						height: 0.0,
						curveSegments: 12,
						bevelEnabled: false,
						bevelThickness: 0.03,
						bevelSize: 0.02,
						bevelOffset: 0,
						bevelSegments: 5
					});

					// Compute bounding box for UV normalization
					textGeometry.computeBoundingBox();
					if (!textGeometry.boundingBox) return;
					const boundingBox = textGeometry.boundingBox;
					const width = boundingBox.max.x - boundingBox.min.x;

					// Modify UVs to be continuous across the text
					const uvs = textGeometry.attributes.uv;
					const positions = textGeometry.attributes.position;

					for (let i = 0; i < positions.count; i++) {
						const x = positions.getX(i);
						// Normalize x position to 0-1 range
						const normalizedX = (x - boundingBox.min.x) / width;
						uvs.setX(i, normalizedX);
					}

					const textMaterial = new THREE.ShaderMaterial({
						vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
						fragmentShader: `
          uniform float uTransition;
          uniform vec3 uColor;
          varying vec2 vUv;
          
          void main() {
            float opacity = smoothstep(uTransition + 0.1, uTransition - 0.1, vUv.x);
            opacity = ${direction === 'right' ? '1.0 - opacity' : 'opacity'};
            gl_FragColor = vec4(uColor, opacity);
          }
        `,
						transparent: true,
						uniforms: {
							uTransition: { value: transmisiton },
							uColor: { value: new THREE.Color(...debugObject.textColor) }
						}
					});

					const textMesh = new THREE.Mesh(textGeometry, textMaterial);
					textGeometry.center();
					textMesh.position.copy(position);

					resolve(textMesh);
				});
			});
		};

		// Update text mesh creation
		let textMesh1: THREE.Mesh;
		let textMesh2: THREE.Mesh;

		createText(
			'Wonder Makers',
			new THREE.Vector3(-3, 0, 0),
			debugObject.text1.textTransition,
			'left'
		).then((mesh) => {
			textMesh1 = mesh;
			scene.add(textMesh1);
		});

		createText(
			'We are awesome',
			new THREE.Vector3(-3, 0, 0),
			debugObject.text2.textTransition,
			'right'
		).then((mesh) => {
			textMesh2 = mesh;
			scene.add(textMesh2);
		});

		let animationDirection: 'forward' | 'backwards' = 'forward';

		// Animation
		function animateText() {
			if (textMesh1 && textMesh2) {
				if (animationDirection === 'forward') {
					// Move the leaving text behind
					gsap.to(textMesh1.position, {
						duration: 1,
						x: 3.25,
						z: -0.1, // Move back in Z
						ease: 'power2.inOut'
					});
					gsap.to((textMesh1.material as CustomTextMaterial).uniforms.uTransition, {
						duration: 1,
						value: -0.1,
						ease: 'power2.inOut'
					});
					// Keep the entering text in front
					gsap.to(textMesh2.position, {
						duration: 1,
						x: 3.25,
						z: 0.1, // Move forward in Z
						ease: 'power2.inOut'
					});
					gsap.to((textMesh2.material as CustomTextMaterial).uniforms.uTransition, {
						duration: 1,
						value: -0.0,
						ease: 'power2.inOut'
					});
					gsap.to(torus.rotation, {
						duration: 1,
						y: Math.PI * -0.75,
						ease: 'power2.inOut'
					});
					gsap.to(torus.position, {
						duration: 1,
						x: -3,
						ease: 'power2.inOut'
					});
					animationDirection = 'backwards';
				} else if (animationDirection === 'backwards') {
					// Reset Z positions for the reverse animation
					gsap.to(textMesh1.position, {
						duration: 1,
						x: -3,
						z: 0, // Reset Z
						ease: 'power2.inOut'
					});
					gsap.to((textMesh1.material as CustomTextMaterial).uniforms.uTransition, {
						duration: 1,
						value: 1.0,
						ease: 'power2.inOut'
					});
					gsap.to(textMesh2.position, {
						duration: 1,
						x: -3,
						z: 0, // Reset Z
						ease: 'power2.inOut'
					});
					gsap.to((textMesh2.material as CustomTextMaterial).uniforms.uTransition, {
						duration: 1,
						value: 1.1,
						ease: 'power2.inOut'
					});
					gsap.to(torus.rotation, {
						duration: 1,
						y: Math.PI * -0.25,
						ease: 'power2.inOut'
					});
					gsap.to(torus.position, {
						duration: 1,
						x: 3,
						ease: 'power2.inOut'
					});
					animationDirection = 'forward';
				}
			}
		}

		// Ligths
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		scene.add(ambientLight);

		// GUI
		const noiseFolder = gui.addFolder('Noise');
		noiseFolder
			.add(debugObject, 'noiseFrequency', 1, 20, 0.1)
			.onChange((value: any) => (torus.material.uniforms.uNoiseFrequency.value = value));
		noiseFolder
			.add(debugObject, 'noiseAmplitude', 0, 2, 0.01)
			.onChange((value: any) => (torus.material.uniforms.uNoiseAmplitude.value = value));
		noiseFolder
			.add(debugObject, 'noiseSpeed', 0, 5, 0.1)
			.onChange((value: any) => (torus.material.uniforms.uNoiseSpeed.value = value));

		const colorFolder = gui.addFolder('Colors');
		colorFolder
			.addColor(debugObject, 'inwardColor')
			.onChange((value: [number, number, number]) =>
				torus.material.uniforms.uInwardColor.value.setRGB(...value)
			);
		colorFolder
			.addColor(debugObject, 'outwardColor')
			.onChange((value: [number, number, number]) =>
				torus.material.uniforms.uOutwardColor.value.setRGB(...value)
			);

		const thresholdFolder = gui.addFolder('Threshold');
		thresholdFolder
			.add(debugObject, 'threshold', 0, 0.2, 0.001)
			.onChange((value: any) => (torus.material.uniforms.uThreshold.value = value));
		thresholdFolder
			.add(debugObject, 'smoothness', 0, 0.2, 0.001)
			.onChange((value: any) => (torus.material.uniforms.uSmoothness.value = value));

		const bloomFolder = gui.addFolder('Bloom');
		bloomFolder
			.add(debugObject, 'bloomStrength', 0, 15, 0.1)
			.onChange((value: any) => (bloomPass.strength = value));
		bloomFolder
			.add(debugObject, 'bloomRadius', 0, 0.001, 0.0001)
			.onChange((value: any) => (bloomPass.radius = value));
		bloomFolder
			.add(debugObject, 'bloomThreshold', 0, 1, 0.01)
			.onChange((value: any) => (bloomPass.threshold = value));

		const shapeFolder = gui.addFolder('Shape Parameters');
		shapeFolder
			.add(debugObject, 'smoothStart', 0, 1, 0.01)
			.onChange((value: any) => (torus.material.uniforms.uSmoothStart.value = value));
		shapeFolder
			.add(debugObject, 'smoothEnd', 0, 2, 0.01)
			.onChange((value: any) => (torus.material.uniforms.uSmoothEnd.value = value));
		shapeFolder
			.add(debugObject, 'powFactor', 0, 5, 0.1)
			.onChange((value: any) => (torus.material.uniforms.uPowFactor.value = value));

		const animationFolder = gui.addFolder('Animation');
		animationFolder.add({ animateText }, 'animateText');

		// Add text controls to GUI
		const textFolder = gui.addFolder('Text');
		textFolder.addColor(debugObject, 'textColor').onChange((value: [number, number, number]) => {
			if (textMesh1) {
				(textMesh1.material as CustomTextMaterial).uniforms.uColor.value.setRGB(...value);
			}
			if (textMesh2) {
				(textMesh2.material as CustomTextMaterial).uniforms.uColor.value.setRGB(...value);
			}
		});

		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Update camera
			camera.left = (frustumSize * aspect) / -2;
			camera.right = (frustumSize * aspect) / 2;
			camera.top = frustumSize / 2;
			camera.bottom = frustumSize / -2;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		// Camera
		const aspect = sizes.width / sizes.height;
		const frustumSize = 10;
		const camera = new THREE.OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			0.1,
			100
		);
		camera.position.set(0, 0, 12);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Setup composers
		const renderScene = new RenderPass(scene, camera);
		const bloomPass = new UnrealBloomPass(
			new THREE.Vector2(sizes.width, sizes.height),
			debugObject.bloomStrength,
			debugObject.bloomRadius,
			debugObject.bloomThreshold
		);

		const bloomComposer = new EffectComposer(renderer);
		bloomComposer.renderToScreen = false;
		bloomComposer.addPass(renderScene);
		bloomComposer.addPass(bloomPass);

		// Create shader pass for combining
		const mixPass = new ShaderPass(
			new THREE.ShaderMaterial({
				uniforms: {
					baseTexture: { value: null },
					bloomTexture: { value: bloomComposer.renderTarget2.texture }
				},
				vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
				fragmentShader: `
            uniform sampler2D baseTexture;
            uniform sampler2D bloomTexture;
            varying vec2 vUv;
            void main() {
                gl_FragColor = (texture2D(baseTexture, vUv) + vec4(1.0) * texture2D(bloomTexture, vUv));
            }
        `
			}),
			'baseTexture'
		);

		canvas.addEventListener('click', () => {
			animateText();
		});

		const finalComposer = new EffectComposer(renderer);
		finalComposer.addPass(renderScene);
		finalComposer.addPass(mixPass);

		const materials: { [key: string]: THREE.Material } = {};

		function darkenNonBloomed(obj: THREE.Object3D) {
			if (obj instanceof THREE.Mesh && bloomLayer.test(obj.layers) === false) {
				materials[obj.uuid] = obj.material;
				obj.material = darkMaterial;
			}
		}

		function restoreMaterial(obj: THREE.Object3D) {
			if (obj instanceof THREE.Mesh && materials[obj.uuid]) {
				obj.material = materials[obj.uuid];
				delete materials[obj.uuid];
			}
		}

		// Animate
		const clock = new THREE.Clock();
		const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();
			(torus.material as CustomShaderMaterial).uniforms.uTime.value = elapsedTime;
			// Update controls
			controls.update();

			// Render
			// Render bloom
			scene.traverse(darkenNonBloomed);
			bloomComposer.render();
			scene.traverse(restoreMaterial);

			// Final render
			finalComposer.render();

			// Call tick again on the next frame
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

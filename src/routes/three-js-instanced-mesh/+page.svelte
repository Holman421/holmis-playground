<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
	import vertexShader from './shaders/vertex.glsl?raw';
	import fragmentShader from './shaders/fragment.glsl?raw';
	import { uniform } from 'three/src/nodes/TSL.js';
	import gsap from 'gsap';

	const noise = `//	Classic Perlin 3D Noise 
//	by Stefan Gustavson (https://github.com/stegu/webgl-noise)
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
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
  float n100 = dot(g100, vec3(Pf1.x, Pf0.y, Pf0.z));
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
}`;
	// Add these constants for Czech Republic bounds
	const CZ_BOUNDS = {
		north: 51.0557,
		south: 48.5518,
		west: 12.0905,
		east: 18.8592
	};

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		type TextureKey =
			| 'czech-republic-map'
			| 'street-texture'
			| 'towers-texture'
			| 'black-white-texture'
			| 'square-texture';
		const debugObject: {
			progress: number;
			isAnimating: boolean;
			selectedTexture: TextureKey;
			animate: () => void;
			lightPosition: { x: number; y: number; z: number };
			cameraPosition: { x: number; y: number; z: number }; // Add this line
			cameraZoom: number; // Replace cameraDistance with cameraZoom
			logLightSettings: () => void;
			showHelper: boolean; // Add this line
			userLocation: { lat: number; lon: number }; // Changed from nullable type
		} = {
			progress: 0,
			isAnimating: false,
			selectedTexture: 'czech-republic-map',
			animate: () => {
				if (debugObject.isAnimating) return;
				debugObject.isAnimating = true;

				const targetProgress = debugObject.progress < 0.5 ? 1 : 0;
				const isGoingForward = targetProgress === 1;

				// Camera animation targets
				const cameraTargets = {
					forward: { x: 0, y: 69, z: 48, zoom: 0.39945021311618206 },
					backward: { x: 60, y: 60, z: 60, zoom: 1 }
				};

				// Light position targets
				const lightTargets = {
					start: {
						x: -17.1,
						y: 8.8,
						z: -15.4,
						intensity: 25.0
					},
					end: {
						x: -96,
						y: 26,
						z: -20.8,
						intensity: 150.0
					}
				};

				gsap.to(debugObject, {
					duration: 3,
					progress: targetProgress,
					ease: isGoingForward ? 'power3.in' : 'power3.out',
					onUpdate: () => {
						fboMaterial.uniforms.uProgress.value = debugObject.progress;
						progressController.updateDisplay();
					}
				});

				const cameraTarget = isGoingForward ? cameraTargets.forward : cameraTargets.backward;
				const lightTarget = isGoingForward ? lightTargets.end : lightTargets.start;

				gsap.to(camera.position, {
					duration: 3,
					x: cameraTarget.x,
					y: cameraTarget.y,
					z: cameraTarget.z,
					ease: 'power3.inOut'
				});

				gsap.to(spotLight.position, {
					duration: 3,
					x: lightTarget.x,
					y: lightTarget.y,
					z: lightTarget.z,
					ease: 'power3.inOut',
					onUpdate: () => {
						debugObject.lightPosition.x = spotLight.position.x;
						debugObject.lightPosition.y = spotLight.position.y;
						debugObject.lightPosition.z = spotLight.position.z;
						posFolder.controllers.forEach((controller) => controller.updateDisplay());
						spotLightHelper.update();
					}
				});

				gsap.to(camera, {
					duration: 3,
					zoom: cameraTarget.zoom,
					ease: 'power3.inOut',
					onUpdate: () => {
						camera.updateProjectionMatrix();
						debugObject.cameraZoom = camera.zoom;
						cameraFolder.controllers[0].updateDisplay();
					},
					onComplete: () => {
						debugObject.isAnimating = false;
					}
				});

				gsap.to(spotLight, {
					duration: 3,
					intensity: lightTarget.intensity,
					ease: 'power3.inOut',
					onUpdate: () => {
						lightFolder.controllers[1].updateDisplay(); // Update intensity slider
					}
				});
			},
			// Add new debug properties for light
			lightPosition: { x: -5, y: 20, z: -5 },
			cameraPosition: { x: 60, y: 60, z: 60 }, // Add this line
			cameraZoom: 1, // Initial zoom level
			logLightSettings: () => {
				const pos = spotLight.position;
				const rot = spotLight.rotation;
				const settings = `// Spotlight Settings
spotLight.position.set(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)});
spotLight.rotation.set(${rot.x.toFixed(2)}, ${rot.y.toFixed(2)}, ${rot.z.toFixed(2)});
spotLight.angle = ${spotLight.angle.toFixed(2)};
spotLight.penumbra = ${spotLight.penumbra.toFixed(2)};
spotLight.decay = ${spotLight.decay.toFixed(2)};
spotLight.intensity = ${spotLight.intensity.toFixed(2)};`;
				console.log(settings);
			},
			showHelper: false, // Add this line
			userLocation: { lat: 49.8155, lon: 14.4378 } // Hardcoded Prague coordinates
		};

		// Add this function to convert coordinates
		function convertToUV(lat: number, lon: number) {
			// Clamp coordinates to bounds
			lon = Math.max(CZ_BOUNDS.west, Math.min(CZ_BOUNDS.east, lon));
			lat = Math.max(CZ_BOUNDS.south, Math.min(CZ_BOUNDS.north, lat));

			// Calculate UV coordinates
			const u = (lon - CZ_BOUNDS.west) / (CZ_BOUNDS.east - CZ_BOUNDS.west);
			// Invert v coordinate since texture coordinates are flipped vertically
			const v = 1.0 - (lat - CZ_BOUNDS.south) / (CZ_BOUNDS.north - CZ_BOUNDS.south);

			console.log(`Coordinates: ${lat}°N, ${lon}°E -> UV: ${u}, ${v}`);
			return { u, v };
		}

		// Replace the getUserLocation function with this simplified version
		function updateUserLocation() {
			const { latitude, longitude } = {
				latitude: debugObject.userLocation.lat,
				longitude: debugObject.userLocation.lon
			};
			console.log(`Using coordinates:`, latitude, longitude);
			const uvCoords = convertToUV(latitude, longitude);

			// Update the shader uniform
			if (fboMaterial) {
				fboMaterial.uniforms.uUserLocation.value.set(uvCoords.u, uvCoords.v);
				fboMaterial.uniforms.uHasUserLocation.value = 1.0;
			}
		}

		// Move GUI creation for location outside of updateUserLocation
		const locationFolder = gui.addFolder('Location Debug');
		locationFolder
			.add(debugObject.userLocation, 'lat', CZ_BOUNDS.south, CZ_BOUNDS.north)
			.name('Latitude')
			.onChange(updateUserLocation);
		locationFolder
			.add(debugObject.userLocation, 'lon', CZ_BOUNDS.west, CZ_BOUNDS.east)
			.name('Longitude')
			.onChange(updateUserLocation);

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();
		const gltfLoader = new GLTFLoader();

		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		const setupFBO = () => {
			const textureLoader = new THREE.TextureLoader();

			// Define all available textures
			const textures = {
				'czech-republic-map': textureLoader.load(
					'/models/instancedMeshModel/czech-republic-regions.jpg'
				),
				'street-texture': textureLoader.load('/models/instancedMeshModel/street-texture.png'),
				'towers-texture': textureLoader.load('/models/instancedMeshModel/towers-texture.png'),
				'black-white-texture': textureLoader.load(
					'/models/instancedMeshModel/black-white-texture.jpg'
				),
				'square-texture': textureLoader.load('/models/instancedMeshModel/texture-mask.png')
			};

			// Make sure none of the textures are flipped
			Object.values(textures).forEach((texture) => {
				texture.flipY = false;
			});

			const fbo = new THREE.WebGLRenderTarget(sizes.width, sizes.height);
			const fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
			const fboScene = new THREE.Scene();
			const fboMaterial = new THREE.ShaderMaterial({
				uniforms: {
					uFBO: { value: null },
					uProgress: { value: 0 },
					uState1: { value: textures['square-texture'] },
					uState2: { value: textures[debugObject.selectedTexture] },
					uUserLocation: { value: new THREE.Vector2(0.5, 0.5) }, // Add this line
					uHasUserLocation: { value: 0.0 } // Add this line
				},
				vertexShader,
				fragmentShader
			});

			// Add texture selection to GUI
			const textureFolder = gui.addFolder('Textures');
			textureFolder
				.add(debugObject, 'selectedTexture', Object.keys(textures))
				.name('Texture')
				.onChange(() => {
					fboMaterial.uniforms.uState2.value = textures[debugObject.selectedTexture];
				});

			const fboGeo = new THREE.PlaneGeometry(2, 2);
			const fboMesh = new THREE.Mesh(fboGeo, fboMaterial);
			fboScene.add(fboMesh);

			return { fbo, fboCamera, fboScene, fboMaterial, fboMesh };
		};

		const { fbo, fboCamera, fboScene, fboMaterial, fboMesh } = setupFBO();

		const progressController = gui
			.add(debugObject, 'progress')
			.min(0)
			.max(1)
			.step(0.01)
			.name('Progress')
			.onChange(() => {
				fboMaterial.uniforms.uProgress.value = debugObject.progress;
			});

		gui.add(debugObject, 'animate').name('Animate Progress');

		const addModel = () => {
			const aoTexture = new THREE.TextureLoader().load(
				'/models/instancedMeshModel/bar-texture.png'
			);

			const heightTexture1 = new THREE.TextureLoader().load(
				'/models/instancedMeshModel/texture-mask.png'
			);

			const debug = new THREE.Mesh(
				new THREE.PlaneGeometry(5, 5),
				new THREE.MeshBasicMaterial({ map: fbo.texture })
			);
			debug.position.set(0, 4, 0);

			// scene.add(debug);

			aoTexture.flipY = false;

			const uniforms: any = {
				uTime: { value: 0 },
				uAoMap: { value: aoTexture },
				uFBO: { value: null },
				light_Color: { value: new THREE.Color('#ffe9e9') },
				ramp_color_one: { value: new THREE.Color('#06082D') },
				ramp_color_two: { value: new THREE.Color('#020284') },
				ramp_color_three: { value: new THREE.Color('#0000ff') },
				ramp_color_four: { value: new THREE.Color('#71c7f5') }
			};

			const materialPhysical = new THREE.MeshPhysicalMaterial({
				roughness: 0.65,
				map: aoTexture,
				aoMap: aoTexture,
				aoMapIntensity: 0.5
			});

			materialPhysical.onBeforeCompile = (shader) => {
				shader.uniforms = Object.assign(shader.uniforms, uniforms);
				shader.vertexShader = shader.vertexShader.replace(
					'#include <common>',
					`
					uniform sampler2D uFBO;
					uniform float uTime;
					attribute vec2 instanceUV;
					varying float vHeight;
					varying float vHeightUV;
					varying vec2 vInstanceUV;
					${noise}
					`
				);

				shader.vertexShader = shader.vertexShader.replace(
					'#include <begin_vertex>',
					`
					#include <begin_vertex>

					float n = cnoise(vec3(instanceUV.x * 10.0, instanceUV.y * 10.0, uTime * 0.5));
					float noiseScale = 0.25;
					transformed.y *= n * noiseScale + 0.25;
					transformed.y += n * noiseScale * 0.5;
					
					vec4 transition = texture2D(uFBO, instanceUV);
					transformed *= transition.g;
					transformed.y += transition.r * 1.5;
					transformed.y *= transition.g * 10.0;
					transformed.y -= (1.0 - transition.g);
					

					vHeight = transformed.y;
					vHeightUV = clamp(position.y * 2.0, 0.0, 1.0 );
					vInstanceUV = instanceUV;
					`
				);

				shader.fragmentShader = shader.fragmentShader.replace(
					'#include <common>',
					`#include <common>
					uniform float uTime;
					uniform sampler2D uAoMap;
					uniform sampler2D uFBO;
					uniform vec3 light_Color;
					uniform vec3 ramp_color_one;
					uniform vec3 ramp_color_two;
					uniform vec3 ramp_color_three;
					uniform vec3 ramp_color_four;
					varying float vHeight;
					varying float vHeightUV;
					varying vec2 vInstanceUV;
					`
				);

				shader.fragmentShader = shader.fragmentShader.replace(
					'#include <map_fragment>',
					`#include <map_fragment>
					vec3 hightlight = mix(ramp_color_three, ramp_color_four, vHeightUV);
					diffuseColor.rgb = ramp_color_two;
					
					// Get the location signal from FBO texture
					vec4 fboData = texture2D(uFBO, vInstanceUV);
					float locationSignal = fboData.b;
					
					// Mix with red color based on location signal
					vec3 locationColor = vec3(1.0, 0.0, 0.0); // Red color
					diffuseColor.rgb = mix(diffuseColor.rgb, ramp_color_three, vHeightUV);
					diffuseColor.rgb = mix(diffuseColor.rgb, locationColor, locationSignal);
					diffuseColor.rgb = mix(diffuseColor.rgb, hightlight, clamp(vHeight/5.0 - 0.4, 0.0, 1.0)); 
					`
				);
			};

			gltfLoader.load('/models/instancedMeshModel/bar.glb', (gltf) => {
				const model = gltf.scene.children[0] as THREE.Mesh;
				model.material = materialPhysical;
				model.scale.set(1.0, 1.0, 1.0);

				const iSize = 100;
				const instances = iSize ** 2;
				const width = 1.5; // moved width declaration up
				// Calculate the total grid size
				const totalGridSize = width * iSize;
				let instanceUV = new Float32Array(instances * 2);

				const instanceMesh = new THREE.InstancedMesh(model.geometry, materialPhysical, instances);
				let dummy = new THREE.Object3D();
				for (let i = 0; i < iSize; i++) {
					for (let j = 0; j < iSize; j++) {
						instanceUV.set([i / iSize, j / iSize], (i * iSize + j) * 2);
						dummy.position.set(width * (i - iSize / 2), 0, width * (j - iSize / 2));
						dummy.updateMatrix();
						instanceMesh.setMatrixAt(i * iSize + j, dummy.matrix);
					}
				}
				model.geometry.setAttribute(
					'instanceUV',
					new THREE.InstancedBufferAttribute(instanceUV, 2)
				);
				scene.add(instanceMesh);

				// scene.add(model);
			});
			return { uniforms };
		};

		const { uniforms } = addModel();

		// Lights
		const spotLight = new THREE.SpotLight('#ffffff', 25);
		spotLight.position.set(-17.1, 8.8, -15.4); // Set initial position
		spotLight.rotation.set(-1.2, -3.14, 0.0);
		spotLight.angle = 0.5;
		spotLight.penumbra = 1.5;
		spotLight.decay = 0.7;
		spotLight.intensity = 25.0;

		// Create and set spotlight target
		const spotLightTarget = new THREE.Object3D();
		spotLightTarget.position.set(0, 0, 0);
		scene.add(spotLightTarget);
		spotLight.target = spotLightTarget;

		scene.add(spotLight);

		const spotLightHelper = new THREE.SpotLightHelper(spotLight);
		spotLightHelper.visible = debugObject.showHelper; // Add this line
		scene.add(spotLightHelper);

		const ambientLight = new THREE.AmbientLight('#ffffff', 0.95);
		scene.add(ambientLight);

		const lightFolder = gui.addFolder('Spotlight');
		lightFolder
			.add(debugObject, 'showHelper') // Add these lines
			.name('Show Helper')
			.onChange((value: boolean) => {
				spotLightHelper.visible = value;
			});
		lightFolder.add(spotLight, 'intensity').min(0).max(100).step(0.1).name('Intensity');
		lightFolder
			.add(spotLight, 'angle')
			.min(0)
			.max(Math.PI / 2)
			.step(0.01)
			.name('Angle');
		lightFolder.add(spotLight, 'penumbra').min(0).max(1).step(0.01).name('Penumbra');
		lightFolder.add(spotLight, 'decay').min(0).max(2).step(0.1).name('Decay');

		const posFolder = lightFolder.addFolder('Position');
		posFolder
			.add(debugObject.lightPosition, 'x')
			.min(-100)
			.max(100)
			.step(0.1)
			.onChange(() => {
				spotLight.position.x = debugObject.lightPosition.x;
				spotLightHelper.update();
			});
		posFolder
			.add(debugObject.lightPosition, 'y')
			.min(-100)
			.max(100)
			.step(0.1)
			.onChange(() => {
				spotLight.position.y = debugObject.lightPosition.y;
				spotLightHelper.update();
			});
		posFolder
			.add(debugObject.lightPosition, 'z')
			.min(-100)
			.max(100)
			.step(0.1)
			.onChange(() => {
				spotLight.position.z = debugObject.lightPosition.z;
				spotLightHelper.update();
			});

		// Remove rotFolder creation and all rotation controls

		// Add camera position controls
		const cameraFolder = gui.addFolder('Camera');
		cameraFolder
			.add(debugObject, 'cameraZoom')
			.min(0.1)
			.max(10)
			.step(0.1)
			.name('Zoom')
			.onChange(() => {
				camera.zoom = debugObject.cameraZoom;
				camera.updateProjectionMatrix();
			});
		cameraFolder
			.add(debugObject.cameraPosition, 'x')
			.min(-100)
			.max(100)
			.step(1)
			.onChange(() => {
				camera.position.x = debugObject.cameraPosition.x;
			});
		cameraFolder
			.add(debugObject.cameraPosition, 'y')
			.min(-100)
			.max(100)
			.step(1)
			.onChange(() => {
				camera.position.y = debugObject.cameraPosition.y;
			});
		cameraFolder
			.add(debugObject.cameraPosition, 'z')
			.min(-100)
			.max(100)
			.step(1)
			.onChange(() => {
				camera.position.z = debugObject.cameraPosition.z;
			});

		lightFolder.add(debugObject, 'logLightSettings').name('Log Settings');

		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Update camera
			const newAspectRatio = sizes.width / sizes.height;
			camera.left = -frustumSize * newAspectRatio;
			camera.right = frustumSize * newAspectRatio;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		// Camera
		const aspectRatio = sizes.width / sizes.height;
		const frustumSize = 20; // Increased to fit all instances
		const camera = new THREE.OrthographicCamera(
			-frustumSize * aspectRatio, // left
			frustumSize * aspectRatio, // right
			frustumSize, // top
			-frustumSize, // bottom
			0.1, // near
			200 // far (increased to ensure nothing is clipped)
		);
		camera.position.set(60, 60, 60); // Adjusted for better initial view
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		controls.addEventListener('change', () => {
			debugObject.cameraZoom = camera.zoom;
			cameraFolder.controllers[0].updateDisplay();
		});

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setClearColor('#060a29');
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Replace getUserLocation() call with updateUserLocation()
		updateUserLocation();

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			uniforms.uTime.value = elapsedTime;

			controls.update();
			spotLightHelper.update(); // Add this line to update helper every frame

			renderer.setRenderTarget(fbo);
			renderer.render(fboScene, fboCamera);

			renderer.setRenderTarget(null);
			uniforms.uFBO.value = fbo.texture;
			renderer.render(scene, camera);

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

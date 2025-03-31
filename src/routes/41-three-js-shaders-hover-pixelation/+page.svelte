<script lang="ts">
	import * as THREE from 'three';
	// Remove OrbitControls import
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
	import vertexShader from './shaders/vertex.glsl';
	import fragmentShader from './shaders/fragment.glsl';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		type ImageOptionKeys = keyof typeof imageOptions;
		const debugObject = {
			pixelSize: 26, // Base pixel size
			maxDistance: 6,
			decaySpeed: 0.95,
			selectedImage: 'Universe' as ImageOptionKeys, // Add default image selection
			distortionStrength: 4 // Add new parameter
		};

		// Add image options
		const imageOptions = {
			Universe: '/pictures/universe/universe-8.jpg',
			Galaxy: '/pictures/galaxy/galaxy-1.jpg',
			Earth: '/pictures/earth/earth-1.jpg',
			Grid: '/pictures/grid.jpg'
		};

		const getScaledMaxDistance = () => {
			return debugObject.maxDistance * (debugObject.pixelSize / 32);
		};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const rgbeLoader = new RGBELoader();
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('./draco/');
		const gltfLoader = new GLTFLoader();
		gltfLoader.setDRACOLoader(dracoLoader);

		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		const createDataTexture = (pixelSize: number) => {
			const height = pixelSize;
			const width = Math.floor((pixelSize * sizes.width) / sizes.height);
			const size = width * height;
			const data = new Float32Array(size * 2);
			const originalData = new Float32Array(size * 2);

			for (let i = 0; i < size; i++) {
				let r = Math.random() * 1;
				data[i * 2 + 0] = r;
				data[i * 2 + 1] = r;
				// Store original values
				originalData[i * 2 + 0] = r;
				originalData[i * 2 + 1] = r;
			}

			const texture = new THREE.DataTexture(data, width, height, THREE.RGFormat, THREE.FloatType);
			texture.needsUpdate = true;
			return { texture, data, originalData, width, height };
		};

		const mouse = {
			x: 0,
			y: 0,
			prevX: 0,
			prevY: 0,
			vX: 0,
			vY: 0
		};
		const mouseEvents = () => {
			window.addEventListener('mousemove', (event) => {
				mouse.x = event.clientX / sizes.width;
				mouse.y = (event.clientY - 56) / sizes.height;

				mouse.vX = mouse.x - mouse.prevX;
				mouse.vY = mouse.y - mouse.prevY;

				mouse.prevX = mouse.x;
				mouse.prevY = mouse.y;
			});
		};

		mouseEvents();

		const addObjects = () => {
			const { texture, data, originalData, width, height } = createDataTexture(
				debugObject.pixelSize
			);

			// Create texture loader
			const textureLoader = new THREE.TextureLoader();
			const loadTexture = (path: string) => {
				return textureLoader.load(path, (texture) => {
					material.uniforms.uTexture.value = texture;
				});
			};

			const material = new THREE.ShaderMaterial({
				side: THREE.DoubleSide,
				vertexShader: vertexShader,
				fragmentShader: fragmentShader,
				uniforms: {
					uTime: { value: 0 },
					resolution: { value: new THREE.Vector4() },
					uTexture: {
						value: loadTexture(imageOptions[debugObject.selectedImage])
					},
					uDataTexture: { value: texture },
					uPixelOffset: { value: 0.2 }
				}
			});

			const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
			const mesh = new THREE.Mesh(geometry, material);
			scene.add(mesh);

			// Add image selector to GUI
			gui
				.add(debugObject, 'selectedImage', Object.keys(imageOptions))
				.name('Select Image')
				.onChange((value: keyof typeof imageOptions) => {
					loadTexture(imageOptions[value]);
				});

			// Add GUI controls
			gui
				.add(material.uniforms.uPixelOffset, 'value')
				.min(0)
				.max(1)
				.step(0.01)
				.name('Pixel Offset');

			// Add pixelSize to GUI
			gui
				.add(debugObject, 'pixelSize')
				.min(8)
				.max(1024)
				.step(1)
				.name('Pixel Resolution')
				.onChange(() => {
					const {
						texture,
						data,
						width: newWidth,
						height: newHeight
					} = createDataTexture(debugObject.pixelSize);
					material.uniforms.uDataTexture.value = texture;
					textureData.texture = texture;
					textureData.data = data;
					textureData.width = newWidth;
					textureData.height = newHeight;
				});

			// Add maxDistance to GUI
			gui.add(debugObject, 'maxDistance').min(2).max(20).step(0.5).name('Effect Radius');

			// Add decaySpeed to GUI
			gui.add(debugObject, 'decaySpeed').min(0.8).max(0.99).step(0.001).name('Decay Speed');

			// Add distortion strength to GUI
			gui
				.add(debugObject, 'distortionStrength')
				.min(0.1)
				.max(30)
				.step(0.1)
				.name('Distortion Strength');

			// Add animation button
			const animatePixels = () => {
				// Reset the data texture to original values
				for (let i = 0; i < textureData.data.length; i++) {
					textureData.data[i] = textureData.originalData[i];
				}
				textureData.texture.needsUpdate = true;
			};

			gui.add({ animatePixels }, 'animatePixels').name('Reset Effect');

			return { material, mesh, textureData: { texture, data, originalData, width, height } };
		};

		const { material, textureData } = addObjects();

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		scene.add(directionalLight);

		// Sizes
		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Create new texture with current pixelSize
			const { texture, data, width, height } = createDataTexture(debugObject.pixelSize);
			material.uniforms.uDataTexture.value = texture;
			textureData.texture = texture;
			textureData.data = data;
			textureData.width = width;
			textureData.height = height;

			// Update resolution uniform
			material.uniforms.resolution.value.x = sizes.width;
			material.uniforms.resolution.value.y = sizes.height;
			material.uniforms.resolution.value.z = 1;
			material.uniforms.resolution.value.w = sizes.height / sizes.width;

			// Update camera
			camera.left = -1;
			camera.right = 1;
			camera.top = 1;
			camera.bottom = -1;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		// Camera - adjust near/far to ensure plane is visible
		const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
		camera.position.z = 1;
		scene.add(camera);

		// Initial resolution set
		material.uniforms.resolution.value.x = sizes.width;
		material.uniforms.resolution.value.y = sizes.height;
		material.uniforms.resolution.value.z = 1;
		material.uniforms.resolution.value.w = sizes.height / sizes.width;

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setClearColor('#ffffff', 1);
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		const updateDataTexture = () => {
			const { data, width, height } = textureData;

			let gridMouseX = Math.floor(mouse.x * width);
			let gridMouseY = Math.floor((1 - mouse.y) * height);
			let maxDist = getScaledMaxDistance();

			// Slower decay for smoother restoration
			for (let i = 0; i < data.length; i += 2) {
				data[i] *= debugObject.decaySpeed;
				data[i + 1] *= debugObject.decaySpeed;
			}

			// Update cells near mouse
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					let distance = Math.sqrt((x - gridMouseX) ** 2 + (y - gridMouseY) ** 2);
					let maxDistSq = maxDist ** 2;

					if (distance < maxDist) {
						let index = 2 * (x + width * y);
						let power = Math.max(0, 1 - distance / maxDist);
						// power = Math.pow(power, 2);

						data[index] += mouse.vX * debugObject.distortionStrength * power;
						data[index + 1] -= mouse.vY * debugObject.distortionStrength * power;
					}
				}
			}

			mouse.vX *= debugObject.decaySpeed;
			mouse.vY *= debugObject.decaySpeed;

			textureData.texture.needsUpdate = true;
		};

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Remove controls update
			// controls.update();

			material.uniforms.uTime.value = elapsedTime;
			updateDataTexture();
			// Update data texture

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

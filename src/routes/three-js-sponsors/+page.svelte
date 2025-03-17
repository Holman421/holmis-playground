<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { addRectangle, setupRectangleGUI, addText, handleResize, handleSizes } from './utils';
	import { setupCameraGUI } from '$lib/utils/cameraGUI';
	import gsap from 'gsap';
	import { setupLightGUI } from '$lib/utils/lightGUI';

	let isAnimatedIn = $state(false);

	$effect(() => {
		const gui = new GUI({ width: 325 });
		const debugObject: any = {
			rectangleColor: '#aaaaaa',
			textColor: '#e1fc06',
			rotationSpeed: 0.5,
			textSpeed: 1.0, // Add this line
			metalness: 0.0,
			roughness: 0.0,
			transmission: 1.0,
			thickness: 0.6,
			clearcoat: 1.0,
			clearcoatRoughness: 0.3,
			ior: 1.05,
			wireframe: false,
			dispersion: 20.0,
			anisotropy: 0.75,
			iridescence: 1.0
		};
		const sizes = handleSizes(window);
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();

		// Add environment map
		const textureLoader = new THREE.TextureLoader();
		const environmentMap = textureLoader.load(
			'/environmentMaps/blockadesLabsSkybox/digital_painting_neon_city_night_orange_lights_.jpg'
		);
		environmentMap.mapping = THREE.EquirectangularReflectionMapping;
		environmentMap.colorSpace = THREE.SRGBColorSpace;
		scene.environment = environmentMap;
		scene.environmentIntensity = 1;

		// Add environment controls to GUI
		// const envFolder = gui.addFolder('Environment');
		// envFolder.add(scene, 'environmentIntensity').min(0).max(10).step(0.001);

		const {
			rectangle,
			rectangleMaterial,
			uniforms: rectangleUniforms
		} = addRectangle(scene, debugObject);
		setupRectangleGUI(gui, rectangleMaterial, debugObject);

		let textMeshes: THREE.Mesh[];
		let textUniforms: { uTime: { value: number }; uSpeed: { value: number } };

		addText(scene, debugObject).then((result) => {
			textMeshes = result.textMeshes;
			textUniforms = result.uniforms;

			// Add text speed control to GUI
			const textFolder = gui.addFolder('Text');
			textFolder.add(textUniforms.uSpeed, 'value', 0, 5, 0.1).name('Speed');
		});

		// Lights
		const directionalLight1 = new THREE.DirectionalLight('#e1fc06', 1.5);
		directionalLight1.position.set(1.6, -8.6, -5.2);
		scene.add(directionalLight1);

		const directionalLight2 = new THREE.DirectionalLight('#00fac8', 4.3);
		directionalLight2.position.set(-2.1, 2.3, 0.3);
		scene.add(directionalLight2);

		const ambientLight = new THREE.AmbientLight('#ffffff', 10.5);
		scene.add(ambientLight);

		// Setup light GUI
		setupLightGUI(directionalLight1, gui, 'Directional Light');
		setupLightGUI(directionalLight2, gui, 'Directional Light');

		// // Add rotation controls
		// const rotationFolder = gui.addFolder('Rotation Animation');
		// rotationFolder.add(debugObject, 'rotationSpeed').min(0).max(2).step(0.1).name('Speed');

		// Camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 2000);
		camera.position.set(0, 0, 15);
		setupCameraGUI(camera, gui);
		scene.add(camera);

		// Camera animation function
		const animateCamera = () => {
			const startPosition = { x: -0, y: 20, z: 0 };
			const targetPosition = { x: 0.5, y: 2.75, z: 12 };

			const fromPosition = isAnimatedIn ? targetPosition : startPosition;
			const toPosition = isAnimatedIn ? startPosition : targetPosition;

			// Animate metalness strength
			gsap.to(rectangleUniforms.uMetalnessStrength, {
				value: isAnimatedIn ? 0.0 : 1.0,
				duration: 2,
				ease: 'power2.inOut'
			});

			// Animate camera position
			gsap.fromTo(
				camera.position,
				{
					x: fromPosition.x,
					y: fromPosition.y,
					z: fromPosition.z
				},
				{
					duration: 2,
					x: toPosition.x,
					y: toPosition.y,
					z: toPosition.z,
					ease: 'power2.inOut',
					onComplete: () => {
						// Re-enable controls after animation
						isAnimatedIn = !isAnimatedIn;
					}
				}
			);
		};

		// const axesHelper = new THREE.AxesHelper(5);
		// scene.add(axesHelper);

		const button = document.getElementById('animate')!;
		button.addEventListener('click', animateCamera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		const mouse = {
			x: 0,
			y: 0,
			target: { x: 0, y: 0 }
		};

		const raycaster = new THREE.Raycaster();
		raycaster.params.Line.threshold = 0.1;
		const pointer = new THREE.Vector2();
		let isHovered = false;

		window.addEventListener('mousemove', (event) => {
			// Update mouse target for camera movement
			mouse.target.x = (event.clientX / sizes.width - 0.5) * 2;
			mouse.target.y = -(event.clientY / sizes.height - 0.5) * 2;

			// Update pointer for raycasting
			pointer.x = (event.clientX / sizes.width) * 2 - 1;
			pointer.y = -((event.clientY - 56) / sizes.height) * 2 + 1;
		});

		// Create hover animation with adjusted values
		const hoverAnimation = {
			startHover: () => {
				if (!isHovered) {
					isHovered = true;
					gsap.to(rectangleMaterial, {
						thickness: 2.5,
						duration: 0.3,
						ease: 'power2.inOut'
					});
				}
			},
			endHover: () => {
				if (isHovered) {
					isHovered = false;
					gsap.to(rectangleMaterial, {
						thickness: 0.6,
						duration: 0.3,
						ease: 'power2.inOut'
					});
				}
			}
		};

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		handleResize(camera, renderer, sizes, window);

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Smooth mouse movement
			mouse.x += (mouse.target.x - mouse.x) * 0.1;
			mouse.y += (mouse.target.y - mouse.y) * 0.1;

			if (rectangle) {
				rectangle.rotation.x += debugObject.rotationSpeed * 0.01;
			}

			if (rectangleUniforms) {
				rectangleUniforms.uTime.value = elapsedTime;
			}

			if (textUniforms) {
				textUniforms.uTime.value = elapsedTime;
			}

			// Update raycaster with adjusted logic
			raycaster.setFromCamera(pointer, camera);
			const intersects = raycaster.intersectObject(rectangle);

			// Check for more precise intersection
			if (intersects.length > 0 && intersects[0].distance < 20) {
				hoverAnimation.startHover();
			} else {
				hoverAnimation.endHover();
			}

			controls.update();
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
	<button
		id="animate"
		class="absolute left-1/2 cursor-pointer -translate-x-1/2 top-[10%] border rounded-md px-3 py-1"
		>{isAnimatedIn ? 'Animate Out' : 'Animate In'}</button
	>
	<canvas class="webgl"></canvas>
</div>

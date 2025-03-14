<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { addTorus, setupTorusGUI, addText } from './utils';
	import { setupCameraGUI } from '$lib/utils/cameraGUI';
	import gsap from 'gsap';

	$effect(() => {
		const gui = new GUI({ width: 325 });
		const debugObject: any = {
			torusColor: '#aaaaaa',
			textColor: '#e1fc06',
			rotationSpeed: 0.5,
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
			iridescence: 1.0
		};

		gui.hide();

		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();

		// Add environment map
		const textureLoader = new THREE.TextureLoader();
		const environmentMap = textureLoader.load(
			'/environmentMaps/blockadesLabsSkybox/digital_painting_neon_city_night_orange_lights_.jpg'
		);
		environmentMap.mapping = THREE.EquirectangularReflectionMapping;
		environmentMap.colorSpace = THREE.SRGBColorSpace;
		// scene.background = environmentMap;
		scene.environment = environmentMap;
		scene.environmentIntensity = 1;

		// Add environment controls to GUI
		// const envFolder = gui.addFolder('Environment');
		// envFolder.add(scene, 'environmentIntensity').min(0).max(10).step(0.001);

		const { torus, torusMaterial, uniforms: torusUniforms } = addTorus(scene, debugObject);
		// setupTorusGUI(gui, torusMaterial, debugObject);

		let textMesh: THREE.Mesh;
		let uniforms: { uTime: { value: number } };

		addText(scene, debugObject).then((result) => {
			textMesh = result.textMesh;
			uniforms = result.uniforms;

			// Add GUI for text
			const textFolder = gui.addFolder('Text');
		});

		// Lights
		const directionalLight1 = new THREE.DirectionalLight('#e1fc06', 2.5);
		directionalLight1.position.set(1.6, -8.6, -5.2);
		scene.add(directionalLight1);

		const directionalLight2 = new THREE.DirectionalLight('#00fac8', 9.3);
		directionalLight2.position.set(-2.1, 2.3, 0.3);
		scene.add(directionalLight2);

		const ambientLight = new THREE.AmbientLight('#ffffff', 10.5);
		scene.add(ambientLight);

		// Setup light GUI
		// setupLightGUI(directionalLight1, gui, 'Directional Light');
		// setupLightGUI(directionalLight2, gui, 'Directional Light');

		// // Add rotation controls
		// const rotationFolder = gui.addFolder('Rotation Animation');
		// rotationFolder.add(debugObject, 'rotationSpeed').min(0).max(2).step(0.1).name('Speed');

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
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		// Camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(-0, 20, 0);
		// setupCameraGUI(camera, gui);
		scene.add(camera);

		// Camera animation function
		const animateCamera = () => {
			// Disable controls during animation
			controls.enabled = false;

			// Target camera values
			const targetPosition = { x: 0.64, y: 2.75, z: 12 };
			const targetRotation = { x: -0.25, y: 0.06, z: 0.02 };

			// Animate metalness strength
			gsap.to(torusUniforms.uMetalnessStrength, {
				value: 1.0,
				duration: 2,
				ease: 'power2.inOut'
			});

			// Animate camera position
			gsap.to(camera.position, {
				duration: 2,
				x: targetPosition.x,
				y: targetPosition.y,
				z: targetPosition.z,
				ease: 'power2.inOut'
			});

			// Animate camera rotation
			gsap.to(camera.rotation, {
				duration: 2,
				x: targetRotation.x,
				y: targetRotation.y,
				z: targetRotation.z,
				ease: 'power2.inOut',
				onComplete: () => {
					// Re-enable controls after animation
					controls.enabled = true;
				}
			});
		};

		// Add camera animation button to GUI
		// gui.add({ animateCamera }, 'animateCamera').name('Animate Camera');

		const button = document.getElementById('animate')!;
		button.addEventListener('click', animateCamera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Add mouse tracking
		const mouse = {
			x: 0,
			y: 0,
			target: { x: 0, y: 0 }
		};

		// Adjust raycaster precision
		const raycaster = new THREE.Raycaster();
		raycaster.params.Line.threshold = 0.1; // Increase precision
		const pointer = new THREE.Vector2();
		let isHovered = false;

		window.addEventListener('mousemove', (event) => {
			// Update mouse target for camera movement
			mouse.target.x = (event.clientX / sizes.width - 0.5) * 2;
			mouse.target.y = -(event.clientY / sizes.height - 0.5) * 2;

			// Update pointer for raycasting
			pointer.x = (event.clientX / sizes.width) * 2 - 1;
			pointer.y = -(event.clientY / sizes.height) * 2 + 1;
		});

		// Create hover animation with adjusted values
		const hoverAnimation = {
			startHover: () => {
				if (!isHovered) {
					isHovered = true;
					gsap.to(torusMaterial, {
						thickness: 2.5,
						duration: 0.3,
						ease: 'power2.inOut'
					});
				}
			},
			endHover: () => {
				if (isHovered) {
					isHovered = false;
					gsap.to(torusMaterial, {
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

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Smooth mouse movement
			mouse.x += (mouse.target.x - mouse.x) * 0.1;
			mouse.y += (mouse.target.y - mouse.y) * 0.1;

			if (textMesh) {
				textMesh.rotation.y -= debugObject.rotationSpeed * 0.01;
				// Add subtle tilt based on mouse position
				textMesh.rotation.x = mouse.y * 0.075;
				// textMesh.rotation.z = mouse.x * 0.1;
			}

			if (torus) {
				// Add subtle movement to torus
				torus.rotation.x = Math.PI * 0.5 + mouse.y * 0.075;
				torus.rotation.z = mouse.x * 0.075;
			}

			if (uniforms) {
				uniforms.uTime.value = elapsedTime;
			}

			// Update torus uniforms
			if (torusUniforms) {
				torusUniforms.uTime.value = elapsedTime;
			}

			// Update raycaster with adjusted logic
			raycaster.setFromCamera(pointer, camera);
			const intersects = raycaster.intersectObject(torus);

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
		>Animate</button
	>
	<canvas class="webgl"></canvas>
</div>

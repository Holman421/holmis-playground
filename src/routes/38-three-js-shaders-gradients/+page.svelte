<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import VertexShader from './shaders/vertex.glsl';
	import FragmentShader from './shaders/fragment.glsl';
	import { onDestroy } from 'svelte';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {};

		// Initialize color properties
		for (let i = 0; i < 5; i++) {
			debugObject[`color${i + 1}`] =
				'#' + new THREE.Color(Math.random(), Math.random(), Math.random()).getHexString();
		}

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Plane
		const plane = new THREE.Mesh(
			new THREE.PlaneGeometry(2, 2, 300, 300),
			new THREE.ShaderMaterial({
				vertexShader: VertexShader,
				fragmentShader: FragmentShader,
				side: THREE.DoubleSide,
				uniforms: {
					uTime: { value: 0 },
					uResolution: { value: new THREE.Vector2() },
					uColors: {
						value: [
							new THREE.Color(debugObject.color1),
							new THREE.Color(debugObject.color2),
							new THREE.Color(debugObject.color3),
							new THREE.Color(debugObject.color4),
							new THREE.Color(debugObject.color5)
						]
					}
				}
			})
		);

		// Initial Plane State
		plane.position.set(0.0, 0.2, 0.0);
		plane.rotation.set(-0.5, 0.0, 0.0);
		plane.updateMatrix();
		plane.updateMatrixWorld();
		scene.add(plane);

		// Add plane controls to GUI
		const planeFolder = gui.addFolder('Plane Transform');
		planeFolder.add(plane.position, 'x').min(-5).max(5).step(0.1).name('Plane X');
		planeFolder.add(plane.position, 'y').min(-5).max(5).step(0.1).name('Plane Y');
		planeFolder.add(plane.position, 'z').min(-5).max(5).step(0.1).name('Plane Z');
		planeFolder
			.add(plane.rotation, 'x')
			.min(-Math.PI)
			.max(Math.PI)
			.step(0.1)
			.name('Plane Rotation X');
		planeFolder
			.add(plane.rotation, 'y')
			.min(-Math.PI)
			.max(Math.PI)
			.step(0.1)
			.name('Plane Rotation Y');
		planeFolder
			.add(plane.rotation, 'z')
			.min(-Math.PI)
			.max(Math.PI)
			.step(0.1)
			.name('Plane Rotation Z');

		// Add randomize function after plane is created
		debugObject.randomizeColors = () => {
			for (let i = 0; i < 5; i++) {
				const color = new THREE.Color(Math.random(), Math.random(), Math.random());
				debugObject[`color${i + 1}`] = '#' + color.getHexString();
				plane.material.uniforms.uColors.value[i].set(color);
				// Update the corresponding GUI controller
				colorFolder.controllers[i].updateDisplay();
			}
		};

		// Add color controls to GUI
		const colorFolder = gui.addFolder('Colors');
		for (let i = 0; i < 5; i++) {
			colorFolder
				.addColor(debugObject, `color${i + 1}`)
				.name(`Color ${i + 1}`)
				.onChange(() => {
					plane.material.uniforms.uColors.value[i].set(debugObject[`color${i + 1}`]);
				});
		}
		colorFolder.add(debugObject, 'randomizeColors').name('Randomize Colors');

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		scene.add(directionalLight);

		// Sizes
		const sizes = {
			width: 450,
			height: 350,
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
		// Camera State
		camera.position.set(-0.846, -0.169, 1.379);
		// camera.quaternion.set(0.05, -0.271, 0.014, 0.961);
		camera.updateMatrix();
		camera.updateMatrixWorld();
		scene.add(camera);

		// Add this helper function before creating the camera controls
		const updateCameraTransform = () => {
			if (!debugObject.useOrbitControls) {
				camera.updateMatrix();
				camera.updateMatrixWorld();
				// Update quaternion display
				cameraFolder.controllers.slice(-4).forEach((controller) => {
					controller.updateDisplay();
				});
			}
		};

		// Add GUI controls for camera
		const cameraFolder = gui.addFolder('Camera Position');

		// Add OrbitControls toggle
		debugObject.useOrbitControls = true;
		cameraFolder
			.add(debugObject, 'useOrbitControls')
			.name('Use Orbit Controls')
			.onChange((value: any) => {
				controls.enabled = value;
				if (!value) {
					// Ensure camera matrix is in sync when switching to manual
					camera.updateMatrix();
					camera.updateMatrixWorld();
				}
			});

		cameraFolder
			.add(camera.position, 'x')
			.min(-5)
			.max(5)
			.step(0.1)
			.decimals(3)
			.name('Camera X')
			.onChange(updateCameraTransform);
		cameraFolder
			.add(camera.position, 'y')
			.min(-5)
			.max(5)
			.step(0.1)
			.decimals(3)
			.name('Camera Y')
			.onChange(updateCameraTransform);
		cameraFolder
			.add(camera.position, 'z')
			.min(-5)
			.max(5)
			.step(0.1)
			.decimals(3)
			.name('Camera Z')
			.onChange(updateCameraTransform);
		// Add quaternion controls after rotation controls
		cameraFolder
			.add(camera.quaternion, 'x')
			.min(-1)
			.max(1)
			.step(0.001)
			.decimals(3)
			.listen()
			.name('Quaternion X')
			.onChange(() => {
				if (!debugObject.useOrbitControls) {
					camera.setRotationFromQuaternion(camera.quaternion);
					updateCameraTransform();
				}
			});
		cameraFolder
			.add(camera.quaternion, 'y')
			.min(-1)
			.max(1)
			.step(0.001)
			.decimals(3)
			.listen()
			.name('Quaternion Y')
			.onChange(() => {
				if (!debugObject.useOrbitControls) {
					camera.setRotationFromQuaternion(camera.quaternion);
					updateCameraTransform();
				}
			});
		cameraFolder
			.add(camera.quaternion, 'z')
			.min(-1)
			.max(1)
			.step(0.001)
			.decimals(3)
			.listen()
			.name('Quaternion Z')
			.onChange(() => {
				if (!debugObject.useOrbitControls) {
					camera.setRotationFromQuaternion(camera.quaternion);
					updateCameraTransform();
				}
			});
		cameraFolder
			.add(camera.quaternion, 'w')
			.min(-1)
			.max(1)
			.step(0.001)
			.decimals(3)
			.listen()
			.name('Quaternion W')
			.onChange(() => {
				if (!debugObject.useOrbitControls) {
					camera.setRotationFromQuaternion(camera.quaternion);
					updateCameraTransform();
				}
			});

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Add change event listener to update GUI when camera moves
		controls.addEventListener('change', () => {
			if (debugObject.useOrbitControls) {
				// Force GUI to update to match camera position and rotation
				cameraFolder.controllers.forEach((controller) => {
					controller.updateDisplay();
				});

				// Log both camera and plane state
				const state = [
					`// Camera State:`,
					`camera.position.set(${camera.position.x.toFixed(3)}, ${camera.position.y.toFixed(3)}, ${camera.position.z.toFixed(3)});`,
					`camera.rotation.set(${camera.rotation.x.toFixed(3)}, ${camera.rotation.y.toFixed(3)}, ${camera.rotation.z.toFixed(3)});`,
					`camera.quaternion.set(${camera.quaternion.x.toFixed(3)}, ${camera.quaternion.y.toFixed(3)}, ${camera.quaternion.z.toFixed(3)}, ${camera.quaternion.w.toFixed(3)});`,
					``,
					`// Plane State:`,
					`plane.position.set(${plane.position.x.toFixed(3)}, ${plane.position.y.toFixed(3)}, ${plane.position.z.toFixed(3)});`,
					`plane.rotation.set(${plane.rotation.x.toFixed(3)}, ${plane.rotation.y.toFixed(3)}, ${plane.rotation.z.toFixed(3)});`
				].join('\n');

				console.log(state);
			}
		});

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		// renderer.setClearColor('#ffffff', 1);
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Animate
		const clock = new THREE.Clock();

		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update uniforms
			plane.material.uniforms.uTime.value = elapsedTime;

			// Update controls
			controls.update();

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		onDestroy(() => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		});
	});
</script>

<div>
	<div class="w-fit overflow-hidden rounded-lg mx-auto mt-20 relative">
		<canvas class="webgl"></canvas>
	</div>
</div>

<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
	import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
	import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';

	$effect(() => {
		/**
		 * Base
		 */
		// Debug
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const gltfLoader = new GLTFLoader();
		const cubeTextureLoader = new THREE.CubeTextureLoader();
		let flightHelmetModel: any = null;
		gltfLoader.load('/FlightHelmet/glTF/FlightHelmet.gltf', (gltf) => {
			gltf.scene.scale.set(10, 10, 10);
			gltf.scene.position.set(4, 0, 0);
			scene.add(gltf.scene);
			flightHelmetModel = gltf.scene;
		});
		const rgbeLoader = new RGBELoader();
		const textureLoader = new THREE.TextureLoader();

		// const enviromentMap = cubeTextureLoader.load([
		// 	'/environmentMaps/0/px.png',
		// 	'/environmentMaps/0/nx.png',
		// 	'/environmentMaps/0/py.png',
		// 	'/environmentMaps/0/ny.png',
		// 	'/environmentMaps/0/pz.png',
		// 	'/environmentMaps/0/nz.png'
		// ]);

		// scene.environment = enviromentMap;
		// scene.background = enviromentMap;

		//HDR (RGBE) equirectangular
		// rgbeLoader.load('/environmentMaps/2/2k.hdr', (environmentMap) => {
		// 	environmentMap.mapping = THREE.EquirectangularReflectionMapping;
		// 	scene.background = environmentMap;
		// 	scene.environment = environmentMap;
		// });

		const enviromentMap = textureLoader.load(
			'/environmentMaps/blockadesLabsSkybox/interior_views_cozy_wood_cabin_with_cauldron_and_p.jpg'
		);
		enviromentMap.mapping = THREE.EquirectangularReflectionMapping;
		enviromentMap.colorSpace = THREE.SRGBColorSpace;
		scene.background = enviromentMap;
		// scene.environment = enviromentMap;

		//Ground Projected skybox
		// rgbeLoader.load('/environmentMaps/2/2k.hdr', (environmentMap) => {
		// 	environmentMap.mapping = THREE.EquirectangularReflectionMapping;
		// 	scene.environment = environmentMap;

		// 	const skybox = new GroundedSkybox(environmentMap, 15, 70);
		// 	scene.add(skybox);
		// 	skybox.position.y = 15;
		// });

		scene.environmentIntensity = 4;

		// Real time environment map

		const holyDonut = new THREE.Mesh(
			new THREE.TorusGeometry(9, 0.5, 32, 100),
			new THREE.MeshBasicMaterial({ color: new THREE.Color(10, 4, 2) })
		);
		holyDonut.position.y = 4;
		holyDonut.layers.enable(1);
		scene.add(holyDonut);

		const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });

		scene.environment = cubeRenderTarget.texture;

		//Cube camera
		const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
		cubeCamera.layers.set(1);

		gui.add(scene, 'environmentIntensity').min(0).max(10).step(0.001);

		/**
		 * Torus Knot
		 */
		const torusKnot = new THREE.Mesh(
			new THREE.TorusKnotGeometry(1, 0.4, 100, 16),
			new THREE.MeshStandardMaterial({ roughness: 0.0, metalness: 1, color: 0xaaaaaa })
		);
		torusKnot.position.y = 4;
		torusKnot.position.x = -4;
		torusKnot.name = 'Torus object';
		scene.add(torusKnot);

		/**
		 * Sizes
		 */
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56
		};

		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;

			// Update camera
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		});

		/**
		 * Camera
		 */
		// Base camera
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(4, 5, 4);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.target.y = 3.5;
		controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Raycasting
		const raycaster = new THREE.Raycaster();
		const rayOrigin = new THREE.Vector3(-3, 0, 0);
		const rayDirection = new THREE.Vector3(10, 0, 0);
		rayDirection.normalize();

		raycaster.set(rayOrigin, rayDirection);

		const mouse = new THREE.Vector2();

		window.addEventListener('mousemove', (event) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);
		});

		let currentIntersect: any = null;

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();
		let targetBackgroundBlurriness = 0;
		const blurTransitionSpeed = 0.2; // Adjust this value to control transition speed

		let targetTorusScale = 1; // Initial scale
		const scaleTransitionSpeed = 0.2; // Adjust this value to control transition speed

		let targetModelScale = 10;
		const modelScaleTransitionSpeed = 0.2;

		const tick = () => {
			// Time
			const elapsedTime = clock.getElapsedTime();

			if (holyDonut) {
				holyDonut.rotation.x = Math.sin(elapsedTime) * 2;

				cubeCamera.update(renderer, scene);
			}

			// Smoothly interpolate background blurriness
			scene.backgroundBlurriness =
				scene.backgroundBlurriness +
				(targetBackgroundBlurriness - scene.backgroundBlurriness) * blurTransitionSpeed;

			// Smoothly interpolate torus scale
			torusKnot.scale.x += (targetTorusScale - torusKnot.scale.x) * scaleTransitionSpeed;
			torusKnot.scale.y += (targetTorusScale - torusKnot.scale.y) * scaleTransitionSpeed;
			torusKnot.scale.z += (targetTorusScale - torusKnot.scale.z) * scaleTransitionSpeed;

			if (flightHelmetModel) {
				flightHelmetModel.scale.x +=
					(targetModelScale - flightHelmetModel.scale.x) * modelScaleTransitionSpeed;
				flightHelmetModel.scale.y +=
					(targetModelScale - flightHelmetModel.scale.y) * modelScaleTransitionSpeed;
				flightHelmetModel.scale.z +=
					(targetModelScale - flightHelmetModel.scale.z) * modelScaleTransitionSpeed;
			}
			// Raycasting
			raycaster.setFromCamera(mouse, camera);
			if (flightHelmetModel) {
				const intersects: any = raycaster.intersectObjects([torusKnot, flightHelmetModel]);

				let objectName;

				if (intersects.length) {
					if (!currentIntersect) {
						objectName = intersects[0]?.object?.name;
						console.log('Mouse enter to ' + objectName);
						targetBackgroundBlurriness = 0.2;
						if (objectName === 'Torus object') {
							targetTorusScale = 1.5; // Set target scale instead of direct scaling
						} else {
							targetModelScale = 13;
						}
					}
					currentIntersect = intersects[0];
				} else {
					if (currentIntersect) {
						objectName = currentIntersect?.object?.name;
						console.log('Mouse leave from ' + objectName);
						targetBackgroundBlurriness = 0;
						if (objectName === 'Torus object') {
							targetTorusScale = 1; // Reset target scale
						} else {
							targetModelScale = 10;
						}
					}
					currentIntersect = null;
				}
			}

			// Update controls
			controls.update();

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

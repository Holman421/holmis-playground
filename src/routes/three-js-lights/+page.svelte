<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { GUI } from 'lil-gui';
	import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
	import { onDestroy } from 'svelte';

	$effect(() => {
		const gui = new GUI();

		const canvas = document.querySelector('canvas.webgl')! as HTMLCanvasElement;

		const scene = new THREE.Scene();

		// Lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
		scene.add(ambientLight);
		const ambientLightFolder = gui.addFolder('Ambient Light');
		ambientLightFolder.add(ambientLight, 'visible');
		ambientLightFolder.add(ambientLight, 'intensity', 0, 1, 0.01);

		const directionalLight = new THREE.DirectionalLight('red', 2);
		directionalLight.position.set(2, 2, 2);
		scene.add(directionalLight);
		const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.2);
		scene.add(directionalLightHelper);
		const directionalLightFolder = gui.addFolder('Directional Light');
		directionalLightFolder.add(directionalLight, 'visible').onChange((value: any) => {
			directionalLightHelper.visible = value;
		});
		directionalLightFolder.add(directionalLight, 'intensity', 0, 10, 0.01);

		const hemisphereLight = new THREE.HemisphereLight(0xff0000, 0x0000ff, 0.5);
		scene.add(hemisphereLight);
		const hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight, 0.2);
		scene.add(hemisphereLightHelper);
		const hemisphereLightFolder = gui.addFolder('Hemisphere Light');
		hemisphereLightFolder.add(hemisphereLight, 'visible').onChange((value: any) => {
			hemisphereLightHelper.visible = value;
		});
		hemisphereLightFolder.add(hemisphereLight, 'intensity', 0, 1, 0.01);

		const pointLight = new THREE.PointLight('green', 2);
		pointLight.position.set(-1, 1, -1);
		scene.add(pointLight);
		const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.2);
		scene.add(pointLightHelper);
		const pointLightFolder = gui.addFolder('Point Light');
		pointLightFolder.add(pointLight, 'visible').onChange((value: any) => {
			pointLightHelper.visible = value;
		});
		pointLightFolder.add(pointLight, 'intensity', 0, 10, 0.01);

		const rectAreaLight = new THREE.RectAreaLight(0x4e00ff, 6, 1, 1);
		rectAreaLight.position.set(-2, 1, 1);
		rectAreaLight.lookAt(0, 0, 0);
		const rectAreaLightHelper = new RectAreaLightHelper(rectAreaLight);
		scene.add(rectAreaLight, rectAreaLightHelper);
		const rectAreaLightFolder = gui.addFolder('Rect Area Light');
		rectAreaLightFolder.add(rectAreaLight, 'visible').onChange((value: any) => {
			rectAreaLightHelper.visible = value;
		});
		rectAreaLightFolder.add(rectAreaLight, 'intensity', 0, 20, 0.01);

		const spotLight = new THREE.SpotLight('yellow', 2, 10, Math.PI * 0.1, 0.25, 1);
		spotLight.position.set(0, 2, 2);
		scene.add(spotLight);

		const spotLightHelper = new THREE.SpotLightHelper(spotLight);
		scene.add(spotLightHelper);

		const spotLightFolder = gui.addFolder('Spot Light');
		spotLightFolder.add(spotLight, 'visible').onChange((value: any) => {
			spotLightHelper.visible = value;
		});
		spotLightFolder.add(spotLight, 'intensity', 0, 10, 0.01);
		spotLightFolder.add(spotLight, 'penumbra', 0, 1, 0.01);

		// Materials
		const material = new THREE.MeshStandardMaterial();
		material.roughness = 0.4;
		material.metalness = 0.7;

		// Objects
		const plane = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), material);
		plane.material.side = THREE.DoubleSide;
		// plane.receiveShadow = true;
		plane.rotation.x = -Math.PI * 0.5;
		plane.position.y = -0.5;

		const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), material);
		const cube = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), material);
		cube.position.x = -1.5;
		const torus = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.2, 16, 32), material);
		torus.position.x = 1.5;

		scene.add(sphere, plane, cube, torus);

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
		camera.position.x = 1;
		camera.position.y = 1;
		camera.position.z = 2;
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = false;

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();
		let animationFrameId: number;

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update controls
			controls.update();

			// Update objects
			sphere.rotation.y = elapsedTime * 0.3;
			cube.rotation.y = elapsedTime * 0.3;
			torus.rotation.y = elapsedTime * 0.3;

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
	<canvas class="webgl"></canvas>
</div>

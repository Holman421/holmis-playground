<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import gsap from 'gsap';
	import CANNON, { Body } from 'cannon';
	import { smootherstep } from 'three/src/math/MathUtils.js';
	import { onDestroy } from 'svelte';

	$effect(() => {
		const gui = new GUI();
		const debugObj: any = {};

		debugObj.createSphere = () => {
			const radius = Math.random() * 0.5 + 0.3;
			const position = {
				x: (Math.random() - 0.5) * 2,
				y: Math.random() * 5 + 1,
				z: (Math.random() - 0.5) * 2
			};
			createSphere(radius, position);
		};

		debugObj.createBox = () => {
			const width = Math.random() * 0.5 + 0.3;
			const height = Math.random() * 0.5 + 0.3;
			const depth = Math.random() * 0.5 + 0.3;
			const position = {
				x: (Math.random() - 0.5) * 2,
				y: Math.random() * 5 + 1,
				z: (Math.random() - 0.5) * 2
			};
			createBox(width, height, depth, position);
		};

		debugObj.reset = () => {
			objectsToUpdate.forEach((object) => {
				scene.remove(object.mesh);
				world.remove(object.body);
			});
			objectsToUpdate.splice(0, objectsToUpdate.length);
		};

		gui.add(debugObj, 'reset');

		gui.add(debugObj, 'createSphere');

		gui.add(debugObj, 'createBox');
		/**
		 * Base
		 */
		// Canvas
		const canvas = document.querySelector('canvas.webgl')! as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		/**
		 * Textures
		 */
		const textureLoader = new THREE.TextureLoader();
		const cubeTextureLoader = new THREE.CubeTextureLoader();

		const environmentMapTexture = cubeTextureLoader.load([
			'/textures/environmentMaps/0/px.png',
			'/textures/environmentMaps/0/nx.png',
			'/textures/environmentMaps/0/py.png',
			'/textures/environmentMaps/0/ny.png',
			'/textures/environmentMaps/0/pz.png',
			'/textures/environmentMaps/0/nz.png'
		]);

		const defaultMaterial = new CANNON.Material('default');

		const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
			friction: 1,
			restitution: 0.7
		});

		const world = new CANNON.World();
		world.addContactMaterial(defaultContactMaterial);
		world.gravity.set(0, -9.82, 0);
		world.defaultContactMaterial = defaultContactMaterial;
		world.broadphase = new CANNON.SAPBroadphase(world);
		world.allowSleep = true;

		const floorShape = new CANNON.Plane();
		const floorBody = new CANNON.Body();
		floorBody.mass = 0;
		floorBody.addShape(floorShape);
		floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
		world.addBody(floorBody);

		// Sound
		const hitSound = new Audio('/sounds/hit.mp3');
		const playHitSound = () => {
			hitSound.volume = Math.random();
			hitSound.currentTime = 0;
			hitSound.play();
		};

		/**
		 * Floor
		 */
		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(10, 10),
			new THREE.MeshStandardMaterial({
				color: '#777777',
				metalness: 0.3,
				roughness: 0.4,
				envMap: environmentMapTexture,
				envMapIntensity: 0.5
			})
		);
		floor.receiveShadow = true;
		floor.rotation.x = -Math.PI * 0.5;
		scene.add(floor);

		/**
		 * Lights
		 */
		const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.set(1024, 1024);
		directionalLight.shadow.camera.far = 15;
		directionalLight.shadow.camera.left = -7;
		directionalLight.shadow.camera.top = 7;
		directionalLight.shadow.camera.right = 7;
		directionalLight.shadow.camera.bottom = -7;
		directionalLight.position.set(5, 5, 5);
		scene.add(directionalLight);

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
		camera.position.set(-3, 3, 3);
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
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		const objectsToUpdate: any[] = [];

		const SphereGeometry = new THREE.SphereGeometry(1, 20, 20);
		const SphereMaterial = new THREE.MeshStandardMaterial({
			metalness: 0.3,
			roughness: 0.4,
			envMap: environmentMapTexture
		});

		const createSphere = (radius: number, position: any) => {
			const mesh = new THREE.Mesh(SphereGeometry, SphereMaterial);
			mesh.scale.set(radius, radius, radius);

			mesh.castShadow = true;
			mesh.position.copy(position);
			scene.add(mesh);

			// Cannon.js body
			const shape = new CANNON.Sphere(radius);
			const body = new CANNON.Body({
				mass: 1,
				position: new CANNON.Vec3(position.x, position.y, position.z),
				shape,
				material: defaultMaterial
			});
			body.addEventListener('collide', (e: any) => {
				const { body, contact } = e;
				const impact = contact.getImpactVelocityAlongNormal();
				if (impact > 1.5) {
					playHitSound();
				}
			});
			body.position.copy(position);
			world.addBody(body);

			objectsToUpdate.push({ mesh, body });
		};

		const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

		// a function to create a box
		const createBox = (width: number, height: number, depth: number, position: any) => {
			const mesh = new THREE.Mesh(boxGeometry, SphereMaterial);
			mesh.scale.set(width, height, depth);
			mesh.castShadow = true;
			mesh.position.copy(position);
			scene.add(mesh);

			// Cannon.js body
			const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5));
			const body = new CANNON.Body({
				mass: 1,
				position: new CANNON.Vec3(position.x, position.y, position.z),
				shape,
				material: defaultMaterial
			});
			body.addEventListener('collide', (e: any) => {
				const { body, contact } = e;
				const impact = contact.getImpactVelocityAlongNormal();
				if (impact > 1.5) {
					playHitSound();
				}
			});
			body.position.copy(position);
			world.addBody(body);

			objectsToUpdate.push({ mesh, body });
		};

		createSphere(0.5, { x: 0, y: 3, z: 0 });

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();
		let oldElapsedTime = 0;

		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			const deltaTime = elapsedTime - oldElapsedTime;

			world.step(1 / 60, deltaTime, 3);

			objectsToUpdate.forEach((object) => {
				object.mesh.position.copy(object.body.position);
				object.mesh.quaternion.copy(object.body.quaternion);
			});

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
	<canvas class="webgl"></canvas>
</div>

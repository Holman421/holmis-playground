<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

	$effect(() => {
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		/**
		 * Objects
		 */
		const object1 = new THREE.Mesh(
			new THREE.SphereGeometry(0.5, 16, 16),
			new THREE.MeshBasicMaterial({ color: '#ff0000' })
		);
		object1.position.x = -2;
		object1.name = 'left-sphere';

		const object2 = new THREE.Mesh(
			new THREE.SphereGeometry(0.5, 16, 16),
			new THREE.MeshBasicMaterial({ color: '#ff0000' })
		);
		object2.name = 'center-sphere';

		const object3 = new THREE.Mesh(
			new THREE.SphereGeometry(0.5, 16, 16),
			new THREE.MeshBasicMaterial({ color: '#ff0000' })
		);
		object3.position.x = 2;

		scene.add(object1, object2, object3);
		object3.name = 'right-sphere';
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
		camera.position.z = 3;
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Raycaster
		const raycaster = new THREE.Raycaster();
		const rayOrigin = new THREE.Vector3(-3, 0, 0);
		const rayDirection = new THREE.Vector3(10, 0, 0);
		rayDirection.normalize();

		raycaster.set(rayOrigin, rayDirection);

		object1.updateMatrixWorld();
		object2.updateMatrixWorld();
		object3.updateMatrixWorld();

		const intersect = raycaster.intersectObject(object2);
		console.log(intersect);

		const intersects = raycaster.intersectObjects([object1, object2, object3]);
		console.log(intersects);

		// Mouse coordinates

		const mouse = new THREE.Vector2();

		window.addEventListener('mousemove', (event) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);
		});

		let currentIntersect: any = null;

		window.addEventListener('click', () => {
			if (currentIntersect) {
				console.log('Clicked on ' + currentIntersect.object.name);
			}
		});

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Animate objects
			object1.position.y = Math.sin(elapsedTime * 0.3) * 1.5;
			object2.position.y = Math.sin(elapsedTime * 0.9) * 1.5;
			object3.position.y = Math.sin(elapsedTime * 1.5) * 1.5;

			// Cast a ray

			// const rayOrigin = new THREE.Vector3(-3, 0, 0);
			// const rayDirection = new THREE.Vector3(1, 0, 0);
			// rayDirection.normalize();

			// raycaster.set(rayOrigin, rayDirection);

			raycaster.setFromCamera(mouse, camera);
			const intersects: any = raycaster.intersectObjects([object1, object2, object3]);

			for (const object of [object1, object2, object3]) {
				object.material.color.set('red');
			}

			for (const intersect of intersects) {
				intersect.object.material.color.set('green');
			}

			const objectName = intersects[0]?.object?.name || 'no object';

			if (intersects.length) {
				if (!currentIntersect) {
					console.log('Mouse enter to ' + objectName);
				}
				currentIntersect = intersects[0];
			} else {
				if (currentIntersect) {
					console.log('Mouse leave from ' + objectName);
				}
				currentIntersect = null;
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

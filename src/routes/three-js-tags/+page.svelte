<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI, { Controller } from 'lil-gui';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { gsap } from 'gsap';

	type Sword = 'sword1' | 'sword2' | 'sword3' | 'sword4';

	type Point = {
		id: number;
		tagNumber: number;
		positions: THREE.Vector3;
		element: HTMLElement;
		group: Sword;
		camera: {
			position: THREE.Vector3;
			target: THREE.Vector3;
		};
	};

	let activePointText: number | null = null;
	let activeGroup: Sword = 'sword1';

	$effect(() => {
		const gui = new GUI();
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const loadingBarElement = document.querySelector('.loading-bar') as HTMLDivElement;

		// Add loading manager
		const loadingManager = new THREE.LoadingManager(
			() => {
				gsap.to(loadingBarElement, {
					scaleX: 1,
					duration: 0.5,
					onComplete: () => {
						gsap.delayedCall(0.5, () => {
							gsap.to(overlayMaterial.uniforms.uAplha, { duration: 3, value: 0 });
							loadingBarElement.classList.add('ended');
							loadingBarElement.style.transform = '';

							points.forEach((point) => {
								point.element.classList.remove('loading');
							});

							points
								.filter((p) => p.group === 'sword1')
								.forEach((p) => {
									p.element.classList.add('visible');
								});
						});
					}
				});
			},
			(itemUrl, itemsLoaded, itemsTotal) => {
				const progressRatio = itemsLoaded / itemsTotal;
				gsap.to(loadingBarElement, { scaleX: progressRatio, duration: 0.5 });
			}
		);

		const scene = new THREE.Scene();

		// Update loaders to use loading manager
		const gltfLoader = new GLTFLoader(loadingManager);
		const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);

		// Add overlay
		const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
		const overlayMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uAplha: { value: 1 }
			},
			vertexShader: `
				void main() {
					gl_Position = vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uAplha;
				void main() {
					gl_FragColor = vec4(0.0, 0.0, 0.0, uAplha);
				}
			`,
			transparent: true
		});
		const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
		scene.add(overlay);

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.set(1024, 1024);
		directionalLight.shadow.camera.far = 15;
		directionalLight.shadow.normalBias = 0.05;
		directionalLight.position.set(0.25, 3, -2.25);
		scene.add(directionalLight);

		// Sizes
		const sizes = {
			width: 400,
			height: 400
		};

		// window.addEventListener('resize', () => {
		// 	sizes.width = window.innerWidth;
		// 	sizes.height = window.innerHeight - 56;
		// 	camera.aspect = sizes.width / sizes.height;
		// 	camera.updateProjectionMatrix();
		// 	renderer.setSize(sizes.width, sizes.height);
		// 	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		// });

		// Base camera
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(1, 0, -6);
		scene.add(camera);

		// Store initial camera state
		const initialCameraState = {
			position: new THREE.Vector3(1, 0, -6),
			target: new THREE.Vector3(0, 0, 0)
		};

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		const guiObject = {
			enabled: true,
			showSword1: true,
			showSword2: false,
			showSword3: false,
			showSword4: false,
			// rotationSpeed: 0.2,
			enableRotation: false,
			envVisible: false
		};

		gui
			.add(guiObject, 'enabled')
			.name('Enable Controls')
			.onChange((value: boolean) => {
				controls.enabled = value;
			});

		// Add reset camera function
		const resetCamera = () => {
			const wasEnabled = controls.enabled;
			controls.enabled = false;

			gsap.to([camera.position, controls.target], {
				duration: 1.5,
				x: (i) => [initialCameraState.position.x, initialCameraState.target.x][i],
				y: (i) => [initialCameraState.position.y, initialCameraState.target.y][i],
				z: (i) => [initialCameraState.position.z, initialCameraState.target.z][i],
				ease: 'power2.inOut',
				onUpdate: () => camera.lookAt(controls.target),
				onComplete: () => {
					controls.enabled = wasEnabled && guiObject.enabled;
				}
			});
		};

		// Add click listener to the back button
		document.querySelector('#resetCameraButton')!.addEventListener('click', () => {
			if (activePointText !== null) {
				points[activePointText].element.querySelector('.text')?.classList.remove('visible');
				activePointText = null;
			}
			resetCamera();
		})! as HTMLElement;

		// Get all model switch buttons
		const [sword1Btn, sword2Btn, sword3Btn, sword4Btn] =
			document.querySelectorAll('.model-switch-btn');

		// Add click handlers to buttons
		sword1Btn.addEventListener('click', () => switchToModel('sword1'));
		sword2Btn.addEventListener('click', () => switchToModel('sword2'));
		sword3Btn.addEventListener('click', () => switchToModel('sword3'));
		sword4Btn.addEventListener('click', () => switchToModel('sword4'));

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;
		renderer.toneMapping = THREE.ReinhardToneMapping;
		renderer.toneMappingExposure = 1.5;
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Update all materials
		const updateAllMaterials = () => {
			scene.traverse((child) => {
				if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
					child.material.envMapIntensity = 2.5;
					child.material.needsUpdate = true;
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});
		};

		const raycaster = new THREE.Raycaster();

		//Environment map
		const environmentMap = cubeTextureLoader.load([
			'/environmentMaps/0/px.png',
			'/environmentMaps/0/nx.png',
			'/environmentMaps/0/py.png',
			'/environmentMaps/0/ny.png',
			'/environmentMaps/0/pz.png',
			'/environmentMaps/0/nz.png'
		]);
		scene.environment = environmentMap;

		gui
			.add(guiObject, 'envVisible')
			.name('Show Environment Map')
			.onChange((visible: boolean) => {
				scene.background = visible ? environmentMap : null;
				scene.environment = environmentMap;
			});

		// Model references and parameters
		let swordModel1: THREE.Group | null = null;
		let swordModel2: THREE.Group | null = null;
		let swordModel3: THREE.Group | null = null;
		let swordModel4: THREE.Group | null = null;

		const modelsFolder = gui.addFolder('Models');

		const togglePointVisibility = (group: Sword) => {
			points.forEach((point) => {
				point.group === group
					? point.element.classList.add('visible')
					: point.element.classList.remove('visible');
			});
		};

		// LOAD MODELS
		const loadModels = () => {
			gltfLoader.load('/models/sword1/fantasy_longsword.glb', (gltf) => {
				swordModel1 = gltf.scene;
				const scale = 6;
				swordModel1.scale.set(scale, scale, scale);

				const boundingBox = new THREE.Box3().setFromObject(swordModel1);
				const center = boundingBox.getCenter(new THREE.Vector3());

				swordModel1.position.x = -center.x;
				swordModel1.position.y = -center.y;
				swordModel1.position.z = -center.z;

				swordModel1.visible = guiObject.showSword1;
				scene.add(swordModel1);

				updateAllMaterials();
			});

			gltfLoader.load('/models/sword2/scene.gltf', (gltf) => {
				swordModel2 = gltf.scene;
				const scale = 2;
				swordModel2.scale.set(scale, scale, scale);

				const boundingBox = new THREE.Box3().setFromObject(swordModel2);
				const center = boundingBox.getCenter(new THREE.Vector3());

				swordModel2.position.x = -center.x;
				swordModel2.position.y = -center.y;
				swordModel2.position.z = -center.z;

				swordModel2.visible = guiObject.showSword2;
				scene.add(swordModel2);

				updateAllMaterials();
			});

			gltfLoader.load('/models/sword3/ice_sword.glb', (gltf) => {
				swordModel3 = gltf.scene;
				const scale = 0.02;
				swordModel3.scale.set(scale, scale, scale);

				const boundingBox = new THREE.Box3().setFromObject(swordModel3);
				const center = boundingBox.getCenter(new THREE.Vector3());

				swordModel3.position.x = -center.x;
				swordModel3.position.y = -center.y;
				swordModel3.position.z = -center.z;

				swordModel3.rotation.z = Math.PI * 1.75;

				swordModel3.visible = guiObject.showSword3;
				scene.add(swordModel3);

				updateAllMaterials();
			});

			gltfLoader.load('/models/sword4/scifi_red_sword.glb', (gltf) => {
				swordModel4 = gltf.scene;
				const scale = 0.15;
				swordModel4.scale.set(scale, scale, scale);

				const boundingBox = new THREE.Box3().setFromObject(swordModel4);
				const center = boundingBox.getCenter(new THREE.Vector3());

				swordModel4.position.x = -center.x - 2.5;
				swordModel4.position.y = -center.y + 1.0;
				swordModel4.position.z = -center.z;

				swordModel4.rotation.y = Math.PI / 3.85;
				swordModel4.rotation.x = Math.PI / 2.6;
				swordModel4.rotation.z = -Math.PI / 2.9;

				swordModel4.visible = guiObject.showSword4;
				scene.add(swordModel4);

				updateAllMaterials();
			});
		};

		loadModels();

		// CREATE DOM TAG ELEMENT
		const createTagElement = (point: number, text: string) => {
			const pointElement = document.createElement('div');
			pointElement.className = `point point-${point}`;

			const labelElement = document.createElement('div');
			labelElement.className = 'label';
			labelElement.textContent = point.toString();
			pointElement.appendChild(labelElement);

			const textElement = document.createElement('div');
			textElement.className = 'text';
			textElement.textContent = text;
			pointElement.appendChild(textElement);

			return pointElement;
		};

		// POINTS DATA ARRAY
		const points: Point[] = [
			{
				id: 0,
				tagNumber: 1,
				positions: new THREE.Vector3(3.6, 3.2, -0.2),
				element: createTagElement(1, 'The point is pretty sharp'),
				group: 'sword1',
				camera: {
					position: new THREE.Vector3(2.76, 2.3, -2.33),
					target: new THREE.Vector3(3.3, 2.65, -0.2)
				}
			},
			{
				id: 1,
				tagNumber: 2,
				positions: new THREE.Vector3(1.2, 0.85, -0.2),
				element: createTagElement(2, 'Imagine cool a fact about the blade'),
				group: 'sword1',
				camera: {
					position: new THREE.Vector3(1.24, 0.89, -1.42),
					target: new THREE.Vector3(1.2, 0.85, -0.2)
				}
			},
			{
				id: 2,
				tagNumber: 3,
				positions: new THREE.Vector3(-1.0, -1.4, -0.2),
				element: createTagElement(3, 'Expensive af gem'),
				group: 'sword1',
				camera: {
					position: new THREE.Vector3(-1.04, -1.0, -1.15),
					target: new THREE.Vector3(-1.2, -1.2, -0.2)
				}
			},
			{
				id: 3,
				tagNumber: 4,
				positions: new THREE.Vector3(-2.4, -2.4, -0.1),
				element: createTagElement(4, 'This is a really cool handle'),
				group: 'sword1',
				camera: {
					position: new THREE.Vector3(-2.35, -2.3, -1.04),
					target: new THREE.Vector3(-2.4, -2.2, -0.1)
				}
			},
			{
				id: 4,
				tagNumber: 1,
				positions: new THREE.Vector3(3.1, 2.6, -0.2),
				element: createTagElement(1, 'Extra sharp venomous point'),
				group: 'sword2',
				camera: {
					position: new THREE.Vector3(2.76, 2.3, -2.33),
					target: new THREE.Vector3(3.3, 2.65, -0.2)
				}
			},
			{
				id: 5,
				tagNumber: 2,
				positions: new THREE.Vector3(1.0, 0.5, -0.2),
				element: createTagElement(2, 'Powerful claw-like grip'),
				group: 'sword2',
				camera: {
					position: new THREE.Vector3(0.84, 0.84, -1.42),
					target: new THREE.Vector3(0.58, 0.84, -0.2)
				}
			},
			{
				id: 6,
				tagNumber: 3,
				positions: new THREE.Vector3(-1.5, -1.6, -0.2),
				element: createTagElement(3, 'Organically automated adjustable handle'),
				group: 'sword2',
				camera: {
					position: new THREE.Vector3(-0.5, -2.0, -1.8),
					target: new THREE.Vector3(-1.8, -1.6, -0.2)
				}
			},
			{
				id: 7,
				tagNumber: 1,
				positions: new THREE.Vector3(3.1, 3.3, -0.2),
				element: createTagElement(1, 'Point that freezes on contact'),
				group: 'sword3',
				camera: {
					position: new THREE.Vector3(1.01, 2.3, -2.33),
					target: new THREE.Vector3(2.6, 2.65, -0.2)
				}
			},
			{
				id: 8,
				tagNumber: 2,
				positions: new THREE.Vector3(1.2, 0.85, -0.2),
				element: createTagElement(2, 'Anti-gravity blades'),
				group: 'sword3',
				camera: {
					position: new THREE.Vector3(1.24, 0.89, -1.42),
					target: new THREE.Vector3(1.2, 0.85, -0.2)
				}
			},
			{
				id: 9,
				tagNumber: 3,
				positions: new THREE.Vector3(-2.0, -1.9, -0.2),
				element: createTagElement(3, 'Comfortable handle'),
				group: 'sword3',
				camera: {
					position: new THREE.Vector3(-2.56, -1.52, -1.52),
					target: new THREE.Vector3(-2.3, -1.78, -0.2)
				}
			},
			{
				id: 10,
				tagNumber: 1,
				positions: new THREE.Vector3(0.7, 0.2, 0.8),
				element: createTagElement(1, 'Heated blade'),
				group: 'sword4',
				camera: {
					position: new THREE.Vector3(0.58, 0.31, -1.42),
					target: new THREE.Vector3(0.58, 0.05, -0.2)
				}
			},
			{
				id: 11,
				tagNumber: 2,
				positions: new THREE.Vector3(-1.6, -1.6, -0.2),
				element: createTagElement(2, 'Comfortable handle'),
				group: 'sword4',
				camera: {
					position: new THREE.Vector3(-2.04, -1.26, -1.52),
					target: new THREE.Vector3(-1.78, -1.78, -0.2)
				}
			}
		];

		const addTagsToDom = () => {
			const canvasContainer = document.querySelector('.canvasContainer') as HTMLElement;
			points.forEach((point) => {
				point.element.classList.add('loading');
				canvasContainer.appendChild(point.element);
			});
		};

		addTagsToDom();

		// GUI CONTROLLERS FOR MODELS
		let sword1Controller: Controller;
		let sword2Controller: Controller;
		let sword3Controller: Controller;
		let sword4Controller: Controller;

		const switchToModel = (group: Sword) => {
			// Reset camera first
			if (activePointText !== null) {
				points[activePointText].element.querySelector('.text')?.classList.remove('visible');
				activePointText = null;
			}
			resetCamera();

			// Then switch the model
			guiObject.showSword1 = false;
			guiObject.showSword2 = false;
			guiObject.showSword3 = false;
			guiObject.showSword4 = false;

			const propertyName =
				`show${group.charAt(0).toUpperCase() + group.slice(1)}` as keyof typeof guiObject;
			guiObject[propertyName] = true;

			if (swordModel1) swordModel1.visible = group === 'sword1';
			if (swordModel2) swordModel2.visible = group === 'sword2';
			if (swordModel3) swordModel3.visible = group === 'sword3';
			if (swordModel4) swordModel4.visible = group === 'sword4';

			[sword1Controller, sword2Controller, sword3Controller, sword4Controller].forEach((ctrl) => {
				if (ctrl) ctrl.updateDisplay();
			});

			activeGroup = group;
			togglePointVisibility(group);
		};

		const addPointVisibilityController = (group: Sword) => {
			const controller = modelsFolder
				.add(guiObject, `show${group.charAt(0).toUpperCase() + group.slice(1)}`)
				.onChange((visible: boolean) => {
					if (visible) {
						switchToModel(group);
					} else {
						const propertyName = `show${group.charAt(0).toUpperCase() + group.slice(1)}` as
							| 'showSword1'
							| 'showSword2'
							| 'showSword3'
							| 'showSword4';
						guiObject[propertyName] = true;
						controller.updateDisplay();
					}
				});
			return controller;
		};

		sword1Controller = addPointVisibilityController('sword1');
		sword2Controller = addPointVisibilityController('sword2');
		sword3Controller = addPointVisibilityController('sword3');
		sword4Controller = addPointVisibilityController('sword4');

		// Add camera controls folder
		const cameraFolder = gui.addFolder('Camera');
		const cameraPosition = {
			x: camera.position.x,
			y: camera.position.y,
			z: camera.position.z
		};

		const targetPosition = {
			x: controls.target.x,
			y: controls.target.y,
			z: controls.target.z
		};

		// Position controls
		const posFolder = cameraFolder.addFolder('Position');
		posFolder.add(cameraPosition, 'x', -10, 10, 0.01).onChange((value: number) => {
			camera.position.x = value;
		});
		posFolder.add(cameraPosition, 'y', -10, 10, 0.01).onChange((value: number) => {
			camera.position.y = value;
		});
		posFolder.add(cameraPosition, 'z', -10, 10, 0.01).onChange((value: number) => {
			camera.position.z = value;
		});

		// Target controls
		const targetFolder = cameraFolder.addFolder('Look At Target');
		targetFolder.add(targetPosition, 'x', -10, 10, 0.01).onChange((value: number) => {
			controls.target.x = value;
		});
		targetFolder.add(targetPosition, 'y', -10, 10, 0.01).onChange((value: number) => {
			controls.target.y = value;
		});
		targetFolder.add(targetPosition, 'z', -10, 10, 0.01).onChange((value: number) => {
			controls.target.z = value;
		});

		// Update GUI values when camera moves
		controls.addEventListener('change', () => {
			// Update position controls
			posFolder.controllers[0].setValue(camera.position.x);
			posFolder.controllers[1].setValue(camera.position.y);
			posFolder.controllers[2].setValue(camera.position.z);

			// Update target controls
			targetFolder.controllers[0].setValue(controls.target.x);
			targetFolder.controllers[1].setValue(controls.target.y);
			targetFolder.controllers[2].setValue(controls.target.z);
		});

		// Update camera transition function
		const moveCamera = (pointIndex: number) => {
			if (pointIndex >= points.length) return;

			const { position, target } = points[pointIndex].camera;
			const wasEnabled = controls.enabled;
			controls.enabled = false;

			gsap.to(camera.position, {
				duration: 1.5,
				...position,
				ease: 'power2.inOut'
			});

			gsap.to(controls.target, {
				duration: 1.5,
				...target,
				ease: 'power2.inOut',
				onUpdate: () => camera.lookAt(controls.target),
				onComplete: () => {
					controls.enabled = wasEnabled && guiObject.enabled;
				}
			});
		};

		// After points are defined, add click handlers
		points.forEach((point, index) => {
			point.element.addEventListener('click', () => {
				if (activePointText === index) {
					point.element.querySelector('.text')?.classList.remove('visible');
					activePointText = null;
				} else {
					if (activePointText !== null) {
						points[activePointText].element.querySelector('.text')?.classList.remove('visible');
					}
					point.element.querySelector('.text')?.classList.add('visible');
					activePointText = index;
				}
				moveCamera(index);
			});
		});

		// Hide all points that are not in the sword group
		points
			.filter((p) => p.group !== 'sword1')
			.forEach((p) => {
				p.element.classList.remove('visible');
			});

		const rotationFolder = gui.addFolder('Rotation');
		// rotationFolder.add(guiObject, 'rotationSpeed').min(0).max(1).step(0.01).name('Rotation Speed');
		rotationFolder.add(guiObject, 'enableRotation').name('Enable Camera Rotation');

		// Add these variables after the points array
		const pointsScreenPositions = points.map(() => ({
			x: 0,
			y: 0,
			visible: false,
			lerpFactor: 1
		}));

		const clock = new THREE.Clock();
		const radius = 6;

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update controls
			controls.update();

			// Only rotate if enabled
			// if (guiObject.enableRotation) {
			// 	const angle = elapsedTime * guiObject.rotationSpeed;
			// 	camera.position.x = Math.cos(angle) * radius;
			// 	camera.position.z = Math.sin(angle) * radius;
			// 	camera.lookAt(0, 0, 0);
			// }

			// Update points
			points
				.filter((p) => p.group === activeGroup)
				.forEach((point, index) => {
					const screenPosition = point.positions.clone();
					screenPosition.project(camera);

					// raycaster.setFromCamera(new THREE.Vector2(screenPosition.x, screenPosition.y), camera);
					// const intersects = raycaster.intersectObjects(scene.children, true);

					// let isVisible =
					// 	intersects.length === 0 ||
					// 	intersects[0].distance > point.positions.distanceTo(camera.position);

					// if (point.group === 'sword1') {
					// 	isVisible = true;
					// }

					// // Update visibility
					// if (isVisible) {
					// 	point.element.classList.add('visible');
					// } else {
					// 	point.element.classList.remove('visible');
					// }

					// Calculate target position
					const targetX = screenPosition.x * sizes.width * 0.5;
					const targetY = -screenPosition.y * sizes.height * 0.5;

					// Lerp current position to target
					pointsScreenPositions[index].x +=
						(targetX - pointsScreenPositions[index].x) * pointsScreenPositions[index].lerpFactor;
					pointsScreenPositions[index].y +=
						(targetY - pointsScreenPositions[index].y) * pointsScreenPositions[index].lerpFactor;

					// Apply smoothed position
					point.element.style.transform = `translate(${pointsScreenPositions[index].x}px, 
						${pointsScreenPositions[index].y}px)`;
				});

			// Render
			renderer.render(scene, camera);

			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div class="fixed inset-0 mt-[56px]">
	<div class="loading-bar"></div>
	<div class="border-2 relative w-fit m-auto rounded-md flex mt-6">
		<div class="flex flex-col gap-4 p-8 border-r">
			<button
				class="model-switch-btn border py-2 px-4 rounded-md hover:bg-white hover:text-black transition-all"
				>Fantasy sword</button
			>
			<button
				class="model-switch-btn border py-2 px-4 rounded-md hover:bg-white hover:text-black transition-all"
				>Plant sword</button
			>
			<button
				class="model-switch-btn border py-2 px-4 rounded-md hover:bg-white hover:text-black transition-all"
				>Ice sword</button
			>
			<button
				class="model-switch-btn border py-2 px-4 rounded-md hover:bg-white hover:text-black transition-all"
				>Futuristic sword</button
			>
		</div>
		<div class="canvasContainer">
			<canvas class="webgl"></canvas>
			<button id="resetCameraButton" class="absolute top-[15px] right-[20px]">Reset camera</button>
		</div>
	</div>
</div>

<style>
	:global(.point) {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 0;
	}

	:global(.canvasContainer) {
		position: relative;
		width: 400px;
		height: 400px;
		overflow: hidden;
	}

	:global(.point .label) {
		position: absolute;
		border-radius: 20px;
		width: 30px;
		height: 30px;
		display: flex;
		justify-content: center;
		align-items: center;
		background: #00000077;
		border: 1px solid #ffffff77;
		font-family: Helvetica, Arial, sans-serif;
		text-align: center;
		font-size: 14px;
		cursor: pointer;
		transform: scale(0, 0);
		transition: transform 0.3s ease-in-out;
	}

	:global(.point.visible .label) {
		transform: scale(1, 1);
	}

	:global(.point .text) {
		position: absolute;
		top: 50px;
		left: 50%;
		transform: translateX(-50%);
		max-width: 200px;
		width: max-content;
		padding: 10px;
		border-radius: 4px;
		background: #00000077;
		border: 1px solid #ffffff77;
		color: #ffffff;
		line-height: 1.3em;
		font-family: Helvetica, Arial, sans-serif;
		font-size: 14px;
		opacity: 0;
		transition: opacity 1s ease-in-out;
		pointer-events: none;
	}

	:global(.point .text.visible) {
		opacity: 1;
		transition: opacity 1s ease-in-out 0.5s;
	}
	/* 
	:global(.point:has(.text.visible) .label) {
		width: 200px;
		height: 80px;
		transition: all 1s ease-in-out 0.5s;
	} */

	:global(.point.loading) {
		display: none;
	}

	.loading-bar {
		position: absolute;
		top: 50%;
		width: 100%;
		height: 2px;
		z-index: 100;
		background: #ffffff;
		transform: scaleX(0);
		transform-origin: top left;
		transition: transform 0.5s;
		will-change: transform;
	}

	.loading-bar.ended {
		transform-origin: top right;
		transition: transform 1.5s ease-in-out;
	}
</style>

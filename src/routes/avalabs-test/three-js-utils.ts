import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import gsap from 'gsap';
import GUI from 'lil-gui';

type SizesType = {
	width: number;
	height: number;
	pixelRatio: number;
};

export const addRenderer = (canvas: HTMLCanvasElement, sizes: SizesType) => {
	const renderer = new THREE.WebGLRenderer({
		canvas: canvas,
		antialias: true,
		alpha: true
	});
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(sizes.pixelRatio);
	return renderer;
};

export const addCamera = (sizes: SizesType, scene: THREE.Scene) => {
	const camera = new THREE.PerspectiveCamera(70, sizes.width / sizes.height, 0.1, 100);
	camera.position.set(-0, 0, 6.5);
	scene.add(camera);
	return camera;
};

export const addLight = (scene: THREE.Scene) => {
	const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
	directionalLight.position.set(6.25, 3, 4);
	scene.add(directionalLight);
};

export const addControls = (camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) => {
	const controls = new OrbitControls(camera, canvas);
	controls.enableDamping = true;
	return controls;
};

export const getSizes = (window: Window) => {
	const sizes = {
		width: 400,
		height: 400,
		pixelRatio: Math.min(window.devicePixelRatio, 2)
	};
	return sizes;
};

export const resizeRenderer = (
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer,
	sizes: SizesType
) => {
	const handleResize = () => {
		sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);
		camera.updateProjectionMatrix();
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
	};

	window.addEventListener('resize', handleResize);
	return () => {
		window.removeEventListener('resize', handleResize);
	};
};

export const handleScene1 = (
	scene: THREE.Scene,
	isActive: boolean,
	doc: Document = document,
	camera: THREE.PerspectiveCamera
) => {
	if (!isActive) return () => {};

	const debugObject = {
		targetPoint: -50,
		startOpacity: 0.5,
		rayLength: 3,
		spawnDistance: 10,
		baseSpeed: 0.6, // New speed parameter
		speedVariation: 0.1, // New speed variation parameter
		targetX: 0, // New target X coordinate
		targetY: 0, // New target Y coordinate
		startSpread: 6, // New parameter for initial spread
		convergenceStrength: 0.3, // New parameter to control how strongly rays converge
		mouseInfluence: 1.5 // Changed from 0.5 to 1.5 for stronger effect
	};
	camera.position.set(-0, 0, 6.5);
	const gui = new GUI({ width: 325 });
	const raysFolder = gui.addFolder('Rays Settings');
	raysFolder
		.add(debugObject, 'targetPoint', -50, -1, 0.1)
		.name('Target Distance')
		.onChange(updateRayLengths);
	raysFolder.add(debugObject, 'startOpacity', 0, 1, 0.01).name('Initial Opacity');
	raysFolder
		.add(debugObject, 'rayLength', 0.1, 10, 0.1)
		.name('Ray Length')
		.onChange(updateRayLengths);
	raysFolder
		.add(debugObject, 'spawnDistance', 5, 20, 0.1)
		.name('Spawn Distance')
		.onChange(updateRayLengths);
	raysFolder.add(debugObject, 'baseSpeed', 0.05, 1, 0.01).name('Base Speed');
	raysFolder.add(debugObject, 'speedVariation', 0, 0.5, 0.01).name('Speed Variation');
	const controllers = {
		targetX: raysFolder
			.add(debugObject, 'targetX', -20, 20, 0.1)
			.name('Target X')
			.onChange(updateRayLengths),
		targetY: raysFolder
			.add(debugObject, 'targetY', -20, 20, 0.1)
			.name('Target Y')
			.onChange(updateRayLengths)
	};
	raysFolder
		.add(debugObject, 'startSpread', 1, 10, 0.1)
		.name('Start Spread')
		.onChange(updateRayLengths);
	raysFolder
		.add(debugObject, 'convergenceStrength', 0, 1, 0.01)
		.name('Convergence Strength')
		.onChange(updateRayLengths);
	raysFolder.add(debugObject, 'mouseInfluence', 0, 3, 0.01).name('Mouse Influence'); // Increased range to 0-3

	// Add mouse tracking
	const mouse = {
		x: 0,
		y: 0,
		targetX: 0,
		targetY: 0
	};

	const handleMouseMove = (event: MouseEvent) => {
		// Convert mouse position to normalized device coordinates (-1 to +1)
		const canvas = doc.querySelector('canvas.webgl');
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		// Scale mouse influence and update debug target
		const newX = mouse.x * 15 * debugObject.mouseInfluence; // Increased base multiplier from 10 to 15 for stronger effect
		const newY = mouse.y * 15 * debugObject.mouseInfluence;

		debugObject.targetX = newX;
		debugObject.targetY = newY;

		// Update GUI display
		controllers.targetX.setValue(newX);
		controllers.targetY.setValue(newY);

		// Force update all rays when mouse moves
		updateRayLengths();
	};

	// Add event listener to document
	doc.addEventListener('mousemove', handleMouseMove);

	const raysCount = 75;
	const rays: THREE.Line[] = [];

	const getRandomColor = () => {
		const colors = [
			new THREE.Color('#ff0066'), // pink-red
			new THREE.Color('#ff3366'), // hot pink
			new THREE.Color('#6600ff'), // purple-blue
			new THREE.Color('#3366ff'), // bright blue
			new THREE.Color('#9933ff'), // bright purple
			new THREE.Color('#cc33ff') // magenta-purple
		];
		return colors[Math.floor(Math.random() * colors.length)];
	};

	function calculateEndPoint(startX: number, startY: number, startZ: number) {
		// Calculate how far along the path we are (0 at spawn, 1 at target)
		const totalDistance = debugObject.spawnDistance - debugObject.targetPoint;
		const progress = (debugObject.spawnDistance - startZ) / totalDistance;

		// Subtle shift towards target point, maintaining mostly straight lines
		const endX =
			startX + (debugObject.targetX - startX) * progress * debugObject.convergenceStrength * 0.3;
		const endY =
			startY + (debugObject.targetY - startY) * progress * debugObject.convergenceStrength * 0.3;

		// Keep rays straight relative to camera view
		const endZ = startZ - debugObject.rayLength;

		return { x: endX, y: endY, z: endZ };
	}

	function updateRayLengths() {
		rayData.forEach(({ ray }) => {
			const positions = ray.geometry.attributes.position.array as Float32Array;
			const startX = positions[0];
			const startY = positions[1];
			const startZ = positions[2];

			const endPoint = calculateEndPoint(startX, startY, startZ);

			positions[3] = endPoint.x;
			positions[4] = endPoint.y;
			positions[5] = endPoint.z;

			ray.geometry.attributes.position.needsUpdate = true;
		});
	}

	const createRay = (initialProgress = 0) => {
		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(6);

		const angle = Math.random() * Math.PI * 2;
		const radiusStart = Math.random() * debugObject.startSpread + 2;

		// Initial position more spread out
		const startZ = debugObject.spawnDistance - 25 * initialProgress;
		positions[0] = Math.cos(angle) * radiusStart;
		positions[1] = Math.sin(angle) * radiusStart;
		positions[2] = startZ;

		// Calculate end position with subtle convergence
		const endPoint = calculateEndPoint(positions[0], positions[1], positions[2]);
		positions[3] = endPoint.x;
		positions[4] = endPoint.y;
		positions[5] = endPoint.z;

		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		const material = new THREE.LineBasicMaterial({
			color: getRandomColor(),
			transparent: true,
			opacity: 0
		});

		const ray = new THREE.Line(geometry, material);
		rays.push(ray);
		scene.add(ray);

		return {
			ray,
			speed: debugObject.baseSpeed + (Math.random() * 2 - 1) * debugObject.speedVariation,
			material,
			isNew: true
		};
	};

	// Create initial rays with staggered positions
	const rayData = Array(raysCount)
		.fill(0)
		.map((_, index) => createRay(index / raysCount));

	let animationFrameId: number;

	const animate = () => {
		rayData.forEach((data) => {
			const { ray, material, isNew } = data;
			const positions = ray.geometry.attributes.position.array as Float32Array;

			// Update speed based on current settings
			data.speed = debugObject.baseSpeed + (Math.random() * 2 - 1) * debugObject.speedVariation;

			// Move start point
			positions[2] -= data.speed;

			// Calculate new end point based on new start position
			const endPoint = calculateEndPoint(positions[0], positions[1], positions[2]);
			positions[3] = endPoint.x;
			positions[4] = endPoint.y;
			positions[5] = endPoint.z;

			// Calculate opacity based on entry into view
			if (isNew && positions[2] > 5) {
				(material as THREE.LineBasicMaterial).opacity = 0;
			} else {
				data.isNew = false;
				const progress = (positions[2] - debugObject.targetPoint) / (5 - debugObject.targetPoint);
				const opacity = Math.max(0, progress * debugObject.startOpacity);
				(material as THREE.LineBasicMaterial).opacity = opacity;
			}

			// Reset ray when it goes too far
			if (positions[2] < -20) {
				const angle = Math.random() * Math.PI * 2;
				const radiusStart = Math.random() * debugObject.startSpread + 2;

				// Reset start point
				positions[0] = Math.cos(angle) * radiusStart;
				positions[1] = Math.sin(angle) * radiusStart;
				positions[2] = debugObject.spawnDistance;

				// Calculate new end point
				const endPoint = calculateEndPoint(positions[0], positions[1], positions[2]);
				positions[3] = endPoint.x;
				positions[4] = endPoint.y;
				positions[5] = endPoint.z;

				data.isNew = true;
				(material as THREE.LineBasicMaterial).opacity = 0;
			}

			ray.geometry.attributes.position.needsUpdate = true;
		});

		animationFrameId = requestAnimationFrame(animate);
	};

	animate();

	return () => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		doc.removeEventListener('mousemove', handleMouseMove);
		gui.destroy();
		rays.forEach((ray) => {
			ray.geometry.dispose();
			if (ray.material instanceof THREE.Material) {
				ray.material.dispose();
			}
			scene.remove(ray);
		});
	};
};

export const handleScene4 = (
	scene: THREE.Scene,
	isActive: boolean,
	doc: Document = document,
	camera: THREE.PerspectiveCamera
) => {
	if (!isActive) return () => {};

	const meshes: THREE.Mesh[] = [];
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();
	const animatingMeshes = new Set();
	camera.position.set(-0, 0, 6.5);

	const handleMouseMove = (event: MouseEvent) => {
		const canvas = doc.querySelector('canvas.webgl');
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(meshes, true); // Changed to true to include children

		if (intersects.length > 0) {
			// Get the root mesh (parent) if we hit a child
			const mesh =
				intersects[0].object.parent instanceof THREE.Mesh
					? intersects[0].object.parent
					: (intersects[0].object as THREE.Mesh);

			if (!animatingMeshes.has(mesh.uuid)) {
				animatingMeshes.add(mesh.uuid);

				gsap.to(mesh.rotation, {
					x: mesh.rotation.x + Math.PI,
					duration: 0.5,
					ease: 'power1.inOut',
					onComplete: () => {
						animatingMeshes.delete(mesh.uuid);
					}
				});
			}
		}
	};

	doc.addEventListener('mousemove', handleMouseMove);

	const addCube = (position: THREE.Vector3) => {
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.copy(position);

		// Create wireframe as a child object
		const edges = new THREE.EdgesGeometry(geometry);
		const wireframe = new THREE.LineSegments(
			edges,
			new THREE.LineBasicMaterial({
				color: 0xffffff,
				linewidth: 1.0,
				opacity: 0.25,
				transparent: true
			})
		);

		// Add wireframe directly to mesh to maintain transformation hierarchy
		mesh.add(wireframe);
		meshes.push(mesh);
		scene.add(mesh);

		const duration = 0.75 + Math.random() * 0.5;
		const delay = Math.random() * 0.5;

		gsap.to(mesh.rotation, {
			x: Math.PI * 2,
			duration: duration,
			delay: delay,
			ease: 'power1.inOut',
			repeat: 0
		});

		return mesh;
	};

	const positions = [
		new THREE.Vector3(-2.75, 0, 0),
		new THREE.Vector3(-2.75, -1, 0),
		new THREE.Vector3(-1.75, 0, 0),
		new THREE.Vector3(-1.75, -2, 0),
		new THREE.Vector3(-0.75, 0, 0),
		new THREE.Vector3(-0.75, -2, 0),
		new THREE.Vector3(0.75, 0, 0),
		new THREE.Vector3(0.75, 1, 0),
		new THREE.Vector3(0.75, -2, 0),
		new THREE.Vector3(1.75, 0, 0),
		new THREE.Vector3(1.75, -2, 0),
		new THREE.Vector3(2.75, 0, 0),
		new THREE.Vector3(2.75, -1, 0)
	];
	positions.forEach((position) => addCube(position));

	return () => {
		doc.removeEventListener('mousemove', handleMouseMove);
		meshes.forEach((mesh) => {
			mesh.geometry.dispose();
			if (mesh.material instanceof THREE.Material) {
				mesh.material.dispose();
			}
			scene.remove(mesh);
		});
	};
};

export const handleScene6 = (
	scene: THREE.Scene,
	isActive: boolean,
	doc: Document = document,
	camera: THREE.PerspectiveCamera
) => {
	if (!isActive) return () => {};

	camera.position.set(-0, 0, 15);

	// use gsap to zoom in the camera to 8
	gsap.to(camera.position, {
		z: 8,
		duration: 1,
		ease: 'power2.inOut'
	});

	const meshes: THREE.Mesh[] = [];
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();
	const animatingMeshes = new Set();

	const handleMouseMove = (event: MouseEvent) => {
		const canvas = doc.querySelector('canvas.webgl');
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(meshes);

		if (intersects.length > 0) {
			const mesh = intersects[0].object as THREE.Mesh;
			if (!animatingMeshes.has(mesh.uuid)) {
				animatingMeshes.add(mesh.uuid);

				gsap.to(mesh.rotation, {
					x: mesh.rotation.x + Math.PI,
					y: mesh.rotation.y + Math.PI,
					duration: 0.5,
					ease: 'power1.inOut',
					onComplete: () => {
						animatingMeshes.delete(mesh.uuid);
					}
				});
			}
		}
	};

	doc.addEventListener('mousemove', handleMouseMove);

	const radius = 4; // Radius of the sphere
	const numCubes = 32;
	const cubeSize = 0.5; // Size of each cube

	// Calculate points on sphere using fibonacci distribution
	const goldenRatio = (1 + Math.sqrt(5)) / 2;

	// Store initial positions
	const initialPositions = Array(numCubes)
		.fill(0)
		.map((_, i) => {
			const theta = (2 * Math.PI * i) / goldenRatio;
			const phi = Math.acos(1 - (2 * (i + 0.5)) / numCubes);
			return { theta, phi };
		});

	for (let i = 0; i < numCubes; i++) {
		const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
		const material = new THREE.MeshPhongMaterial({
			color: 0xff0000,
			shininess: 100
		});
		const mesh = new THREE.Mesh(geometry, material);

		// Calculate sphere point position
		const theta = (2 * Math.PI * i) / goldenRatio;
		const phi = Math.acos(1 - (2 * (i + 0.5)) / numCubes);

		// Convert spherical coordinates to Cartesian
		mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
		mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
		mesh.position.z = radius * Math.cos(phi);

		// Make cube face outward from center
		mesh.lookAt(new THREE.Vector3(0, 0, 0));

		// Add initial animation
		const delay = i * 0.05;
		mesh.scale.set(0, 0, 0);
		gsap.to(mesh.scale, {
			x: 1,
			y: 1,
			z: 1,
			duration: 0.5,
			delay: delay,
			ease: 'elastic.out(1, 0.5)'
		});

		meshes.push(mesh);
		scene.add(mesh);
	}

	// Modified rotation animation
	const rotationAnimation = gsap.to(meshes, {
		duration: 10,
		repeat: -1,
		ease: 'none',
		onUpdate: () => {
			const time = Date.now() * 0.001;
			const sphereRotationY = time * 0.2; // Overall sphere rotation speed
			const sphereRotationX = time * 0.15; // Add some tilt rotation

			meshes.forEach((mesh, index) => {
				// Get initial spherical coordinates
				const { theta, phi } = initialPositions[index];

				// Apply rotation transforms
				const rotatedTheta = theta + sphereRotationY;
				const rotatedPhi = phi + Math.sin(sphereRotationX) * 0.2;

				// Update position
				mesh.position.x = radius * Math.sin(rotatedPhi) * Math.cos(rotatedTheta);
				mesh.position.y = radius * Math.sin(rotatedPhi) * Math.sin(rotatedTheta);
				mesh.position.z = radius * Math.cos(rotatedPhi);

				// Make cube face outward from center
				mesh.lookAt(new THREE.Vector3(0, 0, 0));

				// Add individual cube rotation
				mesh.rotation.y += 0.002;
				mesh.rotation.x += 0.001;
			});
		}
	});

	return () => {
		doc.removeEventListener('mousemove', handleMouseMove);
		rotationAnimation.kill();
		meshes.forEach((mesh) => {
			mesh.geometry.dispose();
			if (mesh.material instanceof THREE.Material) {
				mesh.material.dispose();
			}
			scene.remove(mesh);
		});
	};
};

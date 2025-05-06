import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import RAPIER from '@dimforge/rapier3d-compat';

export default class Sketch {
	constructor(options) {
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.scene = new THREE.Scene();

		this.setupRenderer();
		this.setupCamera();
		this.setupControls();
		this.setupLights();
		this.setupPhysics();
		this.setupMouseInteraction();

		// Add timing variables for periodic resets
		this.isPlaying = true;
		this.lastResetTime = 0;
		this.resetInterval = 2000; // Reset some cubes every 5 seconds

		this.resize();
		this.render();
	}

	async setupPhysics() {
		await RAPIER.init();
		const gravity = { x: 0.0, y: 0, z: 0.0 };
		this.world = new RAPIER.World(gravity);

		// Create cube geometry and reflective material once
		const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);

		// Modified material to better handle color changes
		const material = new THREE.MeshPhysicalMaterial({
			metalness: 0.25,
			roughness: 0.75,
			color: 0xeeeeee,
			reflectivity: 0.25,
			clearcoat: 0.1,
			clearcoatRoughness: 0.1
		});

		this.bodies = [];
		this.range = 7.5; // Set range to 12 to properly distribute particles
		const range = this.range;

		const numBodies = 100;

		for (let i = 0; i < numBodies; i++) {
			// Clone the material for each cube so they can have individual colors
			const cubeMaterial = material.clone();
			const mesh = new THREE.Mesh(geometry, cubeMaterial);
			const x = Math.random() * range - range * 0.5;
			const y = Math.random() * range - range * 0.5 + 3;
			const z = Math.random() * range - range * 0.5;

			// Physics body
			let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z);
			let rigid = this.world.createRigidBody(rigidBodyDesc);
			let colliderDesc = RAPIER.ColliderDesc.cuboid(0.1, 0.1, 0.1); // Adjusted collider size to match geometry
			this.world.createCollider(colliderDesc, rigid);

			const body = {
				mesh,
				rigid,
				update: () => {
					rigid.resetForces(true);
					const pos = rigid.translation();

					// Calculate distance from center
					const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

					// Get velocity for color calculation
					const vel = rigid.linvel();
					const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

					// Update color based on velocity instead of distance
					this.updateCubeColor(mesh, speed);

					// Create a gravitational-like force that weakens with distance
					// Improved force calculation with better handling near the center
					let forceMagnitude = 0;
					if (distance > 2.0) {
						// Normal gravitational force when far from center
						forceMagnitude = -3.0 / (distance * distance);
					} else if (distance > 1.0) {
						// Gradual transition zone - linear decrease
						const t = distance - 1.0; // 0->1 as distance goes 1->2
						forceMagnitude = (-1.5 * t) / (distance * distance);
					}
					// Else: No force when very close to center (distance <= 1.0)

					const dir = new THREE.Vector3(pos.x, pos.y, pos.z)
						.normalize()
						.multiplyScalar(forceMagnitude);

					// Add damping to prevent infinite acceleration
					const damping = 0.98;
					rigid.setLinvel({ x: vel.x * damping, y: vel.y * damping, z: vel.z * damping }, true);

					// Apply the force
					rigid.addForce(dir, true);

					const q = rigid.rotation();
					mesh.quaternion.set(q.x, q.y, q.z, q.w);
					mesh.position.set(pos.x, pos.y, pos.z);
				}
			};

			this.bodies.push(body);
			this.scene.add(mesh);
		}

		// Mouse ball
		const mouseGeo = new THREE.IcosahedronGeometry(0.5, 8);
		const mouseMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			emissive: 0xffffff,
			opacity: 0.0,
			transparent: true
		});
		this.mouseMesh = new THREE.Mesh(mouseGeo, mouseMat);
		this.scene.add(this.mouseMesh);

		let mouseBody = RAPIER.RigidBodyDesc.kinematicPositionBased();
		this.mouseRigid = this.world.createRigidBody(mouseBody);
		this.world.createCollider(RAPIER.ColliderDesc.ball(0.75), this.mouseRigid);

		this.mouseBall = {
			update: (pos) => {
				this.mouseRigid.setTranslation(pos);
				this.mouseMesh.position.copy(pos);
			}
		};

		this.resetRandomCubes(1.0, 8, 15);
	}

	// Updated method to color cubes based on velocity instead of distance
	updateCubeColor(mesh, speed) {
		// Define velocity thresholds
		const minSpeed = 0.05; // Darker gray when speed <= minSpeed
		const maxSpeed = 2.0; // Vibrant red when speed >= maxSpeed

		// Calculate color based on speed
		if (speed <= minSpeed) {
			// Slow - darker gray (closer to black but not fully black)
			mesh.material.color.setRGB(0.05, 0.05, 0.05);
		} else if (speed >= maxSpeed) {
			// Fast - more vibrant red
			mesh.material.color.setRGB(1, 0.2, 0.2);
		} else {
			// Transition between dark gray and vibrant red based on speed
			const t = (speed - minSpeed) / (maxSpeed - minSpeed);
			const r = 0.05 + 0.7 * t; // Start from 0.05 (dark gray) and go to 1.0 (red)
			const g = 0.05 * (1 - t) + 0.1 * t; // Start from 0.05 (dark gray) and go to 0.1
			const b = 0.05 * (1 - t) + 0.1 * t; // Start from 0.3 (dark gray) and go to 0.1
			mesh.material.color.setRGB(r, g, b);
		}

		// Adjust metalness based on speed - faster objects are more metallic
		mesh.material.metalness = Math.min(0.95, 0.5 + (speed / maxSpeed) * 0.45);
	}

	resetRandomCubes(percentage = 0.1, minDistance = 20, maxDistance = 30) {
		// Check if bodies array exists and is not empty
		if (!this.bodies || this.bodies.length === 0) return;

		// Calculate how many cubes to reset
		const numToReset = Math.floor(this.bodies.length * percentage);

		// Get random indices
		const indices = [];
		while (indices.length < numToReset) {
			const idx = Math.floor(Math.random() * this.bodies.length);
			if (!indices.includes(idx)) {
				indices.push(idx);
			}
		}

		// Reset each selected cube
		indices.forEach((idx) => {
			const body = this.bodies[idx];
			// Generate a random direction vector (normalized)
			const angle1 = Math.random() * Math.PI * 2;
			const angle2 = Math.random() * Math.PI;
			const x = Math.sin(angle2) * Math.cos(angle1);
			const y = Math.sin(angle2) * Math.sin(angle1);
			const z = Math.cos(angle2);

			// Scale by random distance between min and max
			const distance = minDistance + Math.random() * (maxDistance - minDistance);
			const newPos = new THREE.Vector3(x, y, z).multiplyScalar(distance);

			// Reset the rigid body position and velocity
			body.rigid.setTranslation({ x: newPos.x, y: newPos.y, z: newPos.z });
			body.rigid.setLinvel({ x: 0, y: 0, z: 0 }, true);
			body.rigid.setAngvel({ x: 0, y: 0, z: 0 }, true);

			// Apply a small random impulse toward center with random magnitude
			const impulseMagnitude = 0.1 + Math.random() * 0.3; // Smaller, more controlled impulse
			const impulse = new THREE.Vector3(-x, -y, -z).multiplyScalar(impulseMagnitude);
			body.rigid.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
		});
	}

	setupRenderer() {
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.container.appendChild(this.renderer.domElement);
	}

	setupCamera() {
		this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
		this.camera.position.z = 5;
	}

	setupControls() {
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
	}

	setupLights() {
		// Ambient light
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		this.scene.add(ambientLight);

		// Hemisphere light
		const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
		this.scene.add(hemiLight);

		// Directional light
		const dirLight = new THREE.DirectionalLight(0xffffff, 1);
		dirLight.position.set(5, 5, 5);
		this.scene.add(dirLight);

		// Add a point light
		const pointLight = new THREE.PointLight(0xffffff, 1);
		pointLight.position.set(-5, 3, -5);
		// this.scene.add(pointLight);

		// Debug lights with helpers (comment out if not needed)
		const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 1);
		// this.scene.add(dirLightHelper);
		const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.5);
		// this.scene.add(pointLightHelper);
	}

	setupMouseInteraction() {
		this.raycaster = new THREE.Raycaster();
		this.pointerPos = new THREE.Vector2(0, 0);
		this.mousePos = new THREE.Vector3(0, 0, 0);
		this.isClicking = false;

		const mousePlaneGeo = new THREE.PlaneGeometry(48, 48, 48, 48);
		const mousePlaneMat = new THREE.MeshBasicMaterial({
			wireframe: false,
			color: 0x00ff00,
			transparent: true,
			opacity: 0.0
		});
		this.mousePlane = new THREE.Mesh(mousePlaneGeo, mousePlaneMat);
		this.mousePlane.position.set(0, 0, 0.2);
		this.scene.add(this.mousePlane);

		// No visual pulse effect - completely removed

		window.addEventListener('mousemove', (evt) => {
			this.pointerPos.set(
				(evt.clientX / window.innerWidth) * 2 - 1,
				-(evt.clientY / window.innerHeight) * 2 + 1
			);
		});

		// Add mouse click event
		window.addEventListener('mousedown', () => {
			this.isClicking = true;
			this.applyMouseForceToParticles(0.8); // Much more gentle force (was 2.0)
		});

		window.addEventListener('mouseup', () => {
			this.isClicking = false;
		});
	}

	// Modified force application with much gentler settings
	applyMouseForceToParticles(strength = 1.0) {
		// Check if bodies array exists
		if (!this.bodies || this.bodies.length === 0) return;

		const mousePosition = this.mousePos;
		const maxDistance = 2.0; // Further reduced effect distance (was 2.5)

		this.bodies.forEach((body) => {
			const bodyPos = body.rigid.translation();
			const dx = bodyPos.x - mousePosition.x;
			const dy = bodyPos.y - mousePosition.y;
			const dz = bodyPos.z - mousePosition.z;

			const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

			if (distance < maxDistance) {
				// Apply much gentler force with smoother falloff
				const factor = Math.pow(1 - distance / maxDistance, 1.5) * strength * 0.4; // Added 0.4 multiplier to reduce force
				const dirX = dx / distance;
				const dirY = dy / distance;
				const dirZ = dz / distance;

				// Apply impulse - push particles away from mouse
				body.rigid.applyImpulse({ x: dirX * factor, y: dirY * factor, z: dirZ * factor }, true);
			}
		});
	}

	handleRaycast() {
		let cameraDirection = new THREE.Vector3();
		this.camera.getWorldDirection(cameraDirection);
		cameraDirection.multiplyScalar(-1);
		this.mousePlane.lookAt(cameraDirection);

		this.raycaster.setFromCamera(this.pointerPos, this.camera);
		const intersects = this.raycaster.intersectObjects([this.mousePlane], false);
		if (intersects.length > 0) {
			this.mousePos.copy(intersects[0].point);
		}
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(this.width, this.height);
	}

	render() {
		if (!this.isPlaying) return;

		this.world?.step();
		this.handleRaycast();
		this.mouseBall?.update(this.mousePos);
		this.controls.update();

		// Only loop through bodies if the array exists and is not empty
		if (this.bodies && this.bodies.length > 0) {
			this.bodies.forEach((b) => b.update());
		}

		// No pulse effect update - completely removed

		// Apply continuous mouse force when clicking (much gentler)
		if (this.isClicking) {
			this.applyMouseForceToParticles(0.1); // Significantly reduced continuous force (was 0.3)
		}

		// Check if it's time to reset some cubes
		const now = performance.now();
		if (now - this.lastResetTime > this.resetInterval) {
			this.resetRandomCubes(0.05); // Reset 5% of the cubes
			this.lastResetTime = now;
		}

		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(this.render.bind(this));
	}

	stop() {
		this.isPlaying = false;
	}
}

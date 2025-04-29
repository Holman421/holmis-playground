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

		this.isPlaying = true;
		this.resize();
		this.render();
	}

	async setupPhysics() {
		await RAPIER.init();
		const gravity = { x: 0.0, y: 0, z: 0.0 };
		this.world = new RAPIER.World(gravity);

		// Create cube geometry and reflective material once
		const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
		const material = new THREE.MeshPhysicalMaterial({
			metalness: 0.95, // More metallic (was 0.7)
			roughness: 0.1, // Less rough (was 0.2)
			color: 0xeeeeee, // Slightly brighter gray
			reflectivity: 1,
			clearcoat: 0.1, // Less clearcoat (was 0.5)
			clearcoatRoughness: 0.1 // Smoother clearcoat
		});

		this.bodies = [];
		const numBodies = 100;
		const range = 12;

		for (let i = 0; i < numBodies; i++) {
			const mesh = new THREE.Mesh(geometry, material);
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
					const dir = new THREE.Vector3(pos.x, pos.y, pos.z).normalize().multiplyScalar(-0.1);
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
		const mouseGeo = new THREE.IcosahedronGeometry(0.25, 8);
		const mouseMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			emissive: 0xffffff
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
		const ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(ambientLight);

		// Hemisphere light
		const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
		this.scene.add(hemiLight);

		// Directional light
		const dirLight = new THREE.DirectionalLight(0xffffff, 2);
		dirLight.position.set(5, 5, 5);
		this.scene.add(dirLight);

		// Add a point light
		const pointLight = new THREE.PointLight(0xffffff, 1);
		pointLight.position.set(-5, 3, -5);
		this.scene.add(pointLight);

		// Debug lights with helpers (comment out if not needed)
		const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 1);
		this.scene.add(dirLightHelper);
		const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.5);
		this.scene.add(pointLightHelper);
	}

	setupMouseInteraction() {
		this.raycaster = new THREE.Raycaster();
		this.pointerPos = new THREE.Vector2(0, 0);
		this.mousePos = new THREE.Vector3(0, 0, 0);

		const mousePlaneGeo = new THREE.PlaneGeometry(48, 48, 48, 48);
		const mousePlaneMat = new THREE.MeshBasicMaterial({
			wireframe: true,
			color: 0x00ff00,
			transparent: true,
			opacity: 0.0
		});
		this.mousePlane = new THREE.Mesh(mousePlaneGeo, mousePlaneMat);
		this.mousePlane.position.set(0, 0, 0.2);
		this.scene.add(this.mousePlane);

		window.addEventListener('mousemove', (evt) => {
			this.pointerPos.set(
				(evt.clientX / window.innerWidth) * 2 - 1,
				-(evt.clientY / window.innerHeight) * 2 + 1
			);
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
		this.bodies?.forEach((b) => b.update());

		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(this.render.bind(this));
	}

	stop() {
		this.isPlaying = false;
	}
}

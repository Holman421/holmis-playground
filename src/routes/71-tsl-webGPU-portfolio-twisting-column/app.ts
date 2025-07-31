import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { simplexNoise } from 'tsl-textures';
import gsap from 'gsap';

// Add shader imports
import { setupCameraPane, setupLightPane } from '$lib/utils/Tweakpane/utils';
import { Pane } from 'tweakpane';
import { add, color, Fn, uniform, uv, vec3, mul, sin, cos, float, positionLocal } from 'three/src/nodes/TSL.js';

interface SketchOptions {
	dom: HTMLElement;
}

export default class Sketch {
	scene: THREE.Scene;
	container: HTMLElement;
	width: number;
	height: number;
	renderer: THREE.WebGPURenderer;
	camera: THREE.PerspectiveCamera;
	controls: OrbitControls;
	time: number;
	clock: THREE.Clock;
	isPlaying: boolean;
	resizeListener?: boolean;
	material!: THREE.MeshStandardNodeMaterial;
	geometry!: THREE.BoxGeometry;
	mesh!: THREE.Mesh;
	edges!: THREE.LineSegments;
	boxGroup!: THREE.Group;
	pane!: Pane;
	pointLight1!: THREE.PointLight;
	pointLight2!: THREE.PointLight;
	spotlight1!: THREE.SpotLight;
	spotlight2!: THREE.SpotLight;
	ambientLight!: THREE.AmbientLight;
	textMesh!: THREE.Mesh;
	uniforms!: {
		baseColorUniform: any;
		redShiftAmountUniform: any;
	}

	// Scroll control properties
	scrollControlEnabled: boolean = false;
	targetCameraY: number = 0;
	currentCameraY: number = 0;
	targetControlsTargetY: number = 0;
	currentControlsTargetY: number = 0;
	scrollSensitivity: number = 0.005;
	easingSpeed: number = 0.1;
	infiniteScrollEnabled: boolean = true;
	maxScrollDistance: number = 30;
	scrollResetPosition: number = 0;

	// Twisting effect properties
	rotationStrength: number = 0.0;
	rotationStrengthUniform!: any;
	wireframe: boolean = true;

	// Geometry properties
	columnHeight: number = 100;
	heightSegments: number = 50;
	widthSegments: number = 5;
	columnHeightUniform!: any;

	// Column rotation properties
	columnRotationY: number = 0;

	// Mouse camera movement properties
	mouseCameraEnabled: boolean = false;
	mousePosition: { x: number; y: number } = { x: 0, y: 0 };
	mouseCameraStrength: number = 0.3;
	mouseEasingSpeed: number = 0.05;
	currentMouseOffset: { x: number; y: number } = { x: 0, y: 0 };
	targetMouseOffset: { x: number; y: number } = { x: 0, y: 0 };

	constructor(options: SketchOptions) {
		this.scene = new THREE.Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new THREE.WebGPURenderer();
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(new THREE.Color(0x000000), 1);
		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(
			70,
			this.width / this.height,
			0.01,
			1000
		);
		this.camera.position.set(0, 0, 15);
		this.currentCameraY = this.camera.position.y;
		this.targetCameraY = this.camera.position.y;

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.currentControlsTargetY = this.controls.target.y;
		this.targetControlsTargetY = this.controls.target.y;
		this.scrollResetPosition = 25;
		this.time = 0;

		this.clock = new THREE.Clock();
		this.isPlaying = true;
		this.setupEvents();
		this.setupLights();
		this.addObjects();
		this.resize();
		this.setUpSettings();
		// Initialize WebGPU renderer before starting render loop
		this.init();
	}

	async init() {
		await this.renderer.init();
		this.render();
	}

	setupEvents() {
		// Add scroll event listener
		window.addEventListener('wheel', this.onScroll.bind(this), { passive: false });

		// Add mouse move event listener
		window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
	}

	onScroll(event: WheelEvent) {
		if (!this.scrollControlEnabled) return;

		event.preventDefault();

		// Update target camera Y position and controls target Y position based on scroll
		this.targetCameraY -= event.deltaY * this.scrollSensitivity;
		this.targetControlsTargetY -= event.deltaY * this.scrollSensitivity;

		if (this.infiniteScrollEnabled) {
			// Infinite scroll behavior - wrap around when reaching limits
			if (this.targetCameraY < -this.maxScrollDistance) {
				// Reset to top when reaching bottom
				this.targetCameraY = this.scrollResetPosition;
				this.targetControlsTargetY = this.scrollResetPosition;
				this.currentCameraY = this.scrollResetPosition;
				this.currentControlsTargetY = this.scrollResetPosition;
				this.camera.position.y = this.scrollResetPosition;
				this.controls.target.y = this.scrollResetPosition;
			} else if (this.targetCameraY > this.scrollResetPosition) {
				// Wrap to bottom when scrolling up from top
				this.targetCameraY = -this.maxScrollDistance;
				this.targetControlsTargetY = -this.maxScrollDistance;
				this.currentCameraY = -this.maxScrollDistance;
				this.currentControlsTargetY = -this.maxScrollDistance;
				this.camera.position.y = -this.maxScrollDistance;
				this.controls.target.y = -this.maxScrollDistance;
			}
		} else {
			// Optional: Clamp the Y positions to reasonable bounds (non-infinite mode)
			this.targetCameraY = Math.max(-this.maxScrollDistance, Math.min(this.scrollResetPosition, this.targetCameraY));
			this.targetControlsTargetY = Math.max(-this.maxScrollDistance, Math.min(this.scrollResetPosition, this.targetControlsTargetY));
		}
	}

	onMouseMove(event: MouseEvent) {
		if (!this.mouseCameraEnabled) return;

		// Normalize mouse position to -1 to 1 range
		this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

		// Update target mouse offset
		this.targetMouseOffset.x = this.mousePosition.x * this.mouseCameraStrength;
		this.targetMouseOffset.y = this.mousePosition.y * this.mouseCameraStrength;
	}

	resize() {
		if (!this.resizeListener) {
			window.addEventListener('resize', this.resize.bind(this));
			this.resizeListener = true;
		}

		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
		this.scene.add(this.ambientLight);

		// this.pointLight1 = new THREE.PointLight(0xffffff, 30);
		// this.pointLight1.position.set(1, 0.5, 7);
		// this.scene.add(this.pointLight1);

		// this.pointLight2 = new THREE.PointLight(0xffffff, 20);
		// this.pointLight2.position.set(-6.7, -3, -2.8);
		// this.scene.add(this.pointLight2);

		this.spotlight1 = new THREE.SpotLight(0xffffff, 50.0);
		this.spotlight1.position.set(-8.4, 9.8, 20);
		this.spotlight1.target.position.set(-1, 9, 0);
		this.spotlight1.angle = 0.8
		this.spotlight1.penumbra = 0.7;
		this.spotlight1.decay = 1.0;
		this.spotlight1.distance = 62;
		this.scene.add(this.spotlight1);

		// this.spotlight2 = new THREE.SpotLight(0xffffff, 1.0);
		// this.spotlight2.position.set(-10, 20, -10);
		// this.scene.add(this.spotlight2);
	}

	addObjects() {
		this.createGeometry();
		this.createMaterial();

		const columnTopOffset = 40
		const columnYPosition = columnTopOffset - (this.columnHeight / 2);

		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.mesh.position.set(0, columnYPosition, 0);
		this.mesh.rotation.y = this.columnRotationY;

		this.scene.add(this.mesh);
	}

	createGeometry() {
		const columnWidth = 10.0;
		const columnDepth = 10.0;
		this.geometry = new THREE.BoxGeometry(columnWidth, this.columnHeight, columnDepth, this.widthSegments, this.heightSegments, this.widthSegments);
	}

	createMaterial() {
		// Create uniforms
		this.rotationStrengthUniform = uniform(this.rotationStrength);
		this.columnHeightUniform = uniform(this.columnHeight);

		this.material = new THREE.MeshStandardNodeMaterial({
			color: '#222222', // Dark gray instead of pure black
			side: THREE.DoubleSide,
			wireframe: this.wireframe,
		});

		const rotateGeometry = Fn(() => {
			const transformedPosition = vec3(positionLocal);

			// Use the actual Y position instead of UV coordinates for more predictable results
			// Normalize the Y position based on the geometry height
			const normalizedY = mul(transformedPosition.y, float(2.0).div(this.columnHeightUniform)); // Normalize to -1 to 1 range
			const twist = mul(normalizedY, this.rotationStrengthUniform);

			// Apply rotation around Y axis based on height
			const cosTheta = cos(twist);
			const sinTheta = sin(twist);

			// Rotate X and Z coordinates
			const newX = add(mul(transformedPosition.x, cosTheta), mul(transformedPosition.z, sinTheta));
			const newZ = add(mul(transformedPosition.z, cosTheta), mul(transformedPosition.x, sinTheta.negate()));

			return vec3(newX, transformedPosition.y, newZ);
		})

		this.material.positionNode = rotateGeometry();
	}

	updateGeometry() {
		// Remove old mesh
		this.scene.remove(this.mesh);
		this.geometry.dispose();
		this.material.dispose();

		// Create new geometry and material
		this.createGeometry();
		this.createMaterial();

		// Create new mesh
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.mesh.position.set(0, 0, 0);
		this.mesh.rotation.y = this.columnRotationY;

		this.scene.add(this.mesh);
	}

	setUpSettings() {
		this.pane = new Pane();

		// Add main column controls
		const columnFolder = this.pane.addFolder({ title: 'Main Column', expanded: false });

		columnFolder.addBinding(this, 'wireframe', {
			label: 'Wireframe'
		}).on('change', ({ value }) => {
			this.material.wireframe = value;
		});

		columnFolder.addBinding(this, 'rotationStrength', {
			label: 'Rotation Strength',
			min: 0,
			max: 10,
			step: 0.1
		}).on('change', ({ value }) => {
			this.rotationStrengthUniform.value = value;
		});

		// Add column rotation control
		columnFolder.addBinding(this, 'columnRotationY', {
			label: 'Rotation Y',
			min: -Math.PI / 2,
			max: Math.PI / 2,
			step: 0.01,
		}).on('change', ({ value }) => {
			this.mesh.rotation.y = value;
		});

		// Add scroll control settings
		const scrollFolder = this.pane.addFolder({ title: 'Scroll Controls', expanded: false });

		scrollFolder.addBinding(this, 'scrollControlEnabled', {
			label: 'Enable Scroll Camera'
		}).on('change', ({ value }) => {
			// Disable/enable orbit controls based on scroll control state
			this.controls.enabled = !value;
		});

		scrollFolder.addBinding(this, 'scrollSensitivity', {
			label: 'Scroll Sensitivity',
			min: 0.001,
			max: 0.1,
			step: 0.001
		});

		scrollFolder.addBinding(this, 'easingSpeed', {
			label: 'Easing Speed',
			min: 0.01,
			max: 1.0,
			step: 0.01
		});

		scrollFolder.addBinding(this, 'infiniteScrollEnabled', {
			label: 'Infinite Scroll'
		});

		scrollFolder.addBinding(this, 'maxScrollDistance', {
			label: 'Max Scroll Distance',
			min: 5,
			max: 50,
			step: 1
		});

		scrollFolder.addBinding(this, 'scrollResetPosition', {
			label: 'Reset Position (Top)',
			min: -10,
			max: 20,
			step: 1
		});

		// Add mouse camera movement controls
		const mouseCameraFolder = this.pane.addFolder({ title: 'Mouse Camera Movement', expanded: false });

		mouseCameraFolder.addBinding(this, 'mouseCameraEnabled', {
			label: 'Enable Mouse Camera'
		});

		mouseCameraFolder.addBinding(this, 'mouseCameraStrength', {
			label: 'Wobble Strength',
			min: 0.01,
			max: 0.5,
			step: 0.01
		});

		mouseCameraFolder.addBinding(this, 'mouseEasingSpeed', {
			label: 'Wobble Easing Speed',
			min: 0.01,
			max: 0.5,
			step: 0.01
		});

		setupCameraPane({
			camera: this.camera,
			pane: this.pane,
			controls: this.controls,
			scene: this.scene,
			defaultOpen: false,
		});

		// setupLightPane({
		// 	pane: this.pane,
		// 	light: this.pointLight1,
		// 	name: 'Point Light 1',
		// 	scene: this.scene,
		// 	positionRange: { min: -15, max: 15 },
		// 	targetRange: { min: -15, max: 15 }
		// });

		// setupLightPane({
		// 	pane: this.pane,
		// 	light: this.pointLight2,
		// 	name: 'Point Light 2',
		// 	scene: this.scene,
		// 	positionRange: { min: -15, max: 15 },
		// 	targetRange: { min: -15, max: 15 }
		// });

		setupLightPane({
			pane: this.pane,
			light: this.spotlight1,
			name: 'Spotlight 1',
			scene: this.scene,
			positionRange: { min: -20, max: 20 },
			targetRange: { min: -20, max: 20 }
		});

		// setupLightPane({
		// 	pane: this.pane,
		// 	light: this.spotlight2,
		// 	name: 'Spotlight 2',
		// 	scene: this.scene,
		// 	positionRange: { min: -20, max: 20 },
		// 	targetRange: { min: -20, max: 20 }
		// });

	}

	async render() {
		if (!this.isPlaying) return;
		this.time = this.clock.getElapsedTime();

		// Apply easing to camera Y position and controls target when scroll control is enabled
		if (this.scrollControlEnabled) {
			this.currentCameraY += (this.targetCameraY - this.currentCameraY) * this.easingSpeed;
			this.currentControlsTargetY += (this.targetControlsTargetY - this.currentControlsTargetY) * this.easingSpeed;

			this.camera.position.y = this.currentCameraY;
			this.controls.target.y = this.currentControlsTargetY;
		}

		// Update controls first to get the base camera position
		this.controls.update();

		// Apply eased mouse-based camera wobble
		if (this.mouseCameraEnabled) {
			// Apply easing to mouse offset
			this.currentMouseOffset.x += (this.targetMouseOffset.x - this.currentMouseOffset.x) * this.mouseEasingSpeed;
			this.currentMouseOffset.y += (this.targetMouseOffset.y - this.currentMouseOffset.y) * this.mouseEasingSpeed;

			// Store the current camera position from controls
			const baseX = this.camera.position.x;
			const baseZ = this.camera.position.z;

			// Temporarily offset the camera for rendering with eased values
			this.camera.position.x = baseX + this.currentMouseOffset.x;
			this.camera.position.z = baseZ + this.currentMouseOffset.y;

			// Render with wobble
			await this.renderer.renderAsync(this.scene, this.camera);

			// Restore the original position so controls work properly
			this.camera.position.x = baseX;
			this.camera.position.z = baseZ;
		} else {
			// Reset mouse offset when disabled
			this.currentMouseOffset.x = 0;
			this.currentMouseOffset.y = 0;
			this.targetMouseOffset.x = 0;
			this.targetMouseOffset.y = 0;

			// No wobble, just render normally
			await this.renderer.renderAsync(this.scene, this.camera);
		}

		requestAnimationFrame(() => this.render());
	}

	stop() {
		this.isPlaying = false;

		// Remove event listeners
		window.removeEventListener('wheel', this.onScroll.bind(this));
		window.removeEventListener('mousemove', this.onMouseMove.bind(this));

		this.renderer.dispose();
		this.pane.dispose();
	}
}

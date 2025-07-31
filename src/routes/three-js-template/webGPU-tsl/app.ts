
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane, setupLightPane } from '$lib/utils/Tweakpane/utils';

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
	isPlaying: boolean;
	resizeListener: boolean = false;
	material!: THREE.MeshStandardNodeMaterial;
	geometry!: THREE.BoxGeometry;
	mesh!: THREE.Mesh;
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	pointLight!: THREE.PointLight;

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
		this.camera.position.set(0, 0, 3);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.isPlaying = true;
		this.setupLights();
		this.createMesh();
		this.resize();
		this.setUpSettings();
		this.init();
	}

	async init() {
		await this.renderer.init();
		this.render();
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
		this.scene.add(this.ambientLight);

		this.pointLight = new THREE.PointLight(0xffffff, 10);
		this.pointLight.position.set(1, 0.5, 7);
		this.scene.add(this.pointLight);
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

	createMesh() {
		this.geometry = new THREE.BoxGeometry(1, 1, 1);
		this.material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide,
		});
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.scene.add(this.mesh);
	}

	setUpSettings() {
		this.pane = new Pane();

		setupCameraPane({
			camera: this.camera,
			pane: this.pane,
			controls: this.controls,
			scene: this.scene,
			defaultOpen: false,
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight,
			name: 'Point Light',
			scene: this.scene,
			positionRange: { min: -15, max: 15 },
			targetRange: { min: -15, max: 15 }
		});

	}

	async render() {
		if (!this.isPlaying) return;
		this.controls.update();
		await this.renderer.renderAsync(this.scene, this.camera);
		requestAnimationFrame(() => this.render());
	}

	stop() {
		this.isPlaying = false;
		window.removeEventListener('resize', this.resize.bind(this));
		this.renderer.dispose();
		if (this.pane) this.pane.dispose();
	}
}
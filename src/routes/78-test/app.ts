
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane, setupLightPane } from '$lib/utils/tweakpaneUtils/utils';
import DisintegrateMesh from '../../lib/utils/meshes/DisintegrateMesh';

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
	disintegrate!: DisintegrateMesh;

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
		this.setupDisintegrate();
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
		// this.scene.add(this.mesh);
	}

	setupDisintegrate() {
		this.disintegrate = new DisintegrateMesh({
			scene: this.scene,
			camera: this.camera,
			renderer: this.renderer,
			progress: 0.5,
			position: new THREE.Vector3(0, 0, 0),
			boxSize: { x: 1, y: 1, z: 1 }
		});
	}


	setUpSettings() {
		this.pane = new Pane();
		(document.querySelector('.tp-dfwv') as HTMLElement)!.style.zIndex = '1000';

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

		// Add progress control for disintegration effect
		this.pane.addBinding(this.disintegrate, 'progress', {
			min: 0,
			max: 1,
			step: 0.01,
			label: 'Progress'
		}).on('change', (ev) => {
			this.disintegrate.updateProgress(ev.value);
		});

		// Add bloom controls for debugging
		const bloomFolder = this.pane.addFolder({ title: 'Bloom Debug', expanded: true });
		
		bloomFolder.addBinding(this.disintegrate.bloomPass.strength, 'value', {
			min: 0,
			max: 2,
			step: 0.01,
			label: 'Bloom Strength'
		});

		bloomFolder.addBinding(this.disintegrate.uniforms.bloomIntensity, 'value', {
			min: 0,
			max: 10,
			step: 0.1,
			label: 'Cube Bloom Intensity'
		});

		bloomFolder.addBinding(this.disintegrate.uniforms.particleBloomIntensity, 'value', {
			min: 0,
			max: 10,
			step: 0.1,
			label: 'Particle Bloom Intensity'
		});

	}

	async render() {
		if (!this.isPlaying) return;
		this.controls.update();
		
		// Use the disintegrate mesh postprocessing which includes bloom
		if (this.disintegrate) {
			this.disintegrate.render();
		} else {
			await this.renderer.renderAsync(this.scene, this.camera);
		}
		
		requestAnimationFrame(() => this.render());
	}

	stop() {
		this.isPlaying = false;
		window.removeEventListener('resize', this.resize.bind(this));
		this.renderer.dispose();
		if (this.pane) this.pane.dispose();
	}
}
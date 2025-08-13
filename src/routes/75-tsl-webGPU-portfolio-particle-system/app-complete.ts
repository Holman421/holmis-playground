import * as THREE from 'three/webgpu';
import {
	float,
	sin,
	cos,
	instanceIndex,
	instancedArray,
	Fn,
	uniform,
	vec3,
	vec4,
	time
} from 'three/tsl';
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
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	directionalLight!: THREE.DirectionalLight;

	// Particle system properties
	updateCompute!: any;
	particleMesh!: THREE.InstancedMesh;
	gridSize: number = 64; // 64x64 grid of particles
	count: number = this.gridSize * this.gridSize;

	// Wave animation uniforms
	waveAmplitude = uniform(0.15);
	waveFrequency = uniform(2.0);
	waveSpeed = uniform(1.0);
	particleSize = uniform(0.02);

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
			50,
			this.width / this.height,
			0.1,
			100
		);
		this.camera.position.set(0, 2, 5);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;

		this.isPlaying = true;
		this.setupLights();
		this.setupWaveParticles();
		this.resize();
		this.setUpSettings();
		this.init();
	}

	async init() {
		await this.renderer.init();
		this.render();
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
		this.scene.add(this.ambientLight);

		this.directionalLight = new THREE.DirectionalLight('#ffffff', 1.5);
		this.directionalLight.position.set(4, 2, 0);
		this.scene.add(this.directionalLight);
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

	setupWaveParticles() {
		// Create a material for the particles
		const material = new THREE.SpriteNodeMaterial({
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			transparent: true
		});

		// Create position buffer for all particles
		const positionBuffer = instancedArray(this.count, 'vec3');

		// Initialize particles in a grid
		const init = Fn(() => {
			const index = instanceIndex;

			// Convert index and grid size to float for calculations
			const indexFloat = float(index);
			const gridSizeFloat = float(this.gridSize);

			// Calculate x and z grid coordinates from the 1D index
			// x: column index in the grid (0 to gridSize-1)
			const col = indexFloat.mod(gridSizeFloat);
			// z: row index in the grid (0 to gridSize-1)
			const row = indexFloat.div(gridSizeFloat).floor();

			// Center the grid around (0, 0) and scale to fit nicely in view
			// Subtract half the grid size to center, then scale down
			const x = col
				.sub(gridSizeFloat.div(2)) // center
				.div(gridSizeFloat.div(4)); // scale

			const z = row
				.sub(gridSizeFloat.div(2)) // center
				.div(gridSizeFloat.div(4)); // scale

			const y = float(0); // Start at y = 0

			const position = positionBuffer.element(instanceIndex);
			position.assign(vec3(x, y, z));
		});

		// Initialize the positions
		const initCompute = init().compute(this.count);
		this.renderer.computeAsync(initCompute);

		// Update particles with wave animation
		const update = Fn(() => {
			const position = positionBuffer.element(instanceIndex);
			const index = instanceIndex;

			// Calculate grid position (convert to float first)
			const indexFloat = float(index);
			const gridSizeFloat = float(this.gridSize);

			const x = indexFloat
				.mod(gridSizeFloat)
				.sub(gridSizeFloat.div(2))
				.div(gridSizeFloat.div(4));
			const z = indexFloat
				.div(gridSizeFloat)
				.floor()
				.sub(gridSizeFloat.div(2))
				.div(gridSizeFloat.div(4));

			// Create wave animation
			const waveX = sin(
				x.mul(this.waveFrequency).add(time.mul(this.waveSpeed))
			);
			const waveZ = cos(
				z.mul(this.waveFrequency).add(time.mul(this.waveSpeed))
			);
			const y = waveX.add(waveZ).mul(this.waveAmplitude);

			position.assign(vec3(x, y, z));
		});

		this.updateCompute = update().compute(this.count);

		// Set up material nodes
		material.positionNode = positionBuffer.toAttribute();

		// Color based on height
		material.colorNode = Fn(() => {
			const position = positionBuffer.toAttribute();
			const height = position.y.add(1).div(2); // Normalize height to 0-1
			const color = vec3(
				height.mul(0.5).add(0.5),
				height.mul(0.3).add(0.7),
				1.0
			);
			return vec4(color, 1.0);
		})();

		material.scaleNode = this.particleSize;

		// Create the particle mesh
		const geometry = new THREE.PlaneGeometry(1, 1);
		this.particleMesh = new THREE.InstancedMesh(geometry, material, this.count);
		this.scene.add(this.particleMesh);
	}

	setUpSettings() {
		this.pane = new Pane();
		(document.querySelector('.tp-dfwv') as HTMLElement)!.style.zIndex = '1000';

		setupCameraPane({
			camera: this.camera,
			pane: this.pane,
			controls: this.controls,
			scene: this.scene,
			defaultOpen: false
		});

		setupLightPane({
			pane: this.pane,
			light: this.directionalLight,
			name: 'Directional Light',
			scene: this.scene,
			positionRange: { min: -15, max: 15 },
			targetRange: { min: -15, max: 15 }
		});

		// Wave animation controls
		const waveFolder = this.pane.addFolder({ title: 'Wave Animation' });

		waveFolder.addBinding(this.waveAmplitude, 'value', {
			label: 'Wave Amplitude',
			min: 0,
			max: 2,
			step: 0.01
		});

		waveFolder.addBinding(this.waveFrequency, 'value', {
			label: 'Wave Frequency',
			min: 0.1,
			max: 10,
			step: 0.1
		});

		waveFolder.addBinding(this.waveSpeed, 'value', {
			label: 'Wave Speed',
			min: 0,
			max: 5,
			step: 0.1
		});

		waveFolder.addBinding(this.particleSize, 'value', {
			label: 'Particle Size',
			min: 0.005,
			max: 0.1,
			step: 0.005
		});

		waveFolder.addButton({ title: 'Reset Animation' }).on('click', () => {
			this.resetWave();
		});
	}

	resetWave() {
		// Reset wave parameters to defaults
		this.waveAmplitude.value = 0.15;
		this.waveFrequency.value = 2.0;
		this.waveSpeed.value = 1.0;
		this.particleSize.value = 0.02;
	}

	async render() {
		if (!this.isPlaying) return;
		this.controls.update();

		// Update particle compute shader
		if (this.updateCompute) {
			this.renderer.compute(this.updateCompute);
		}

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

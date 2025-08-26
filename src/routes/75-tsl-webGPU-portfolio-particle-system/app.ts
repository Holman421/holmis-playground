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
	time,
	texture,
	uv
} from 'three/tsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane, setupLightPane } from '$lib/utils/tweakpaneUtils/utils';

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
	gridSize: number = 256; // 64x64 grid of particles
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
		const textureLoader = new THREE.TextureLoader();
		const circleTexture = textureLoader.load('/particles/9.png');

		const material = new THREE.SpriteNodeMaterial({
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			transparent: true,
			map: circleTexture
		});

		// Define the uniform for the texture
		const map = uniform(circleTexture);

		// Custom Fragment Shader to handle transparency
		material.colorNode = Fn(() => {
			const samplerColor = texture(material.map!, uv());
			return vec4(samplerColor.xyz, samplerColor.w);
		})();

		material.scaleNode = this.particleSize;

		const positionBuffer = instancedArray(this.count, 'vec3');

		const init = Fn(() => {
			const index = instanceIndex;

			const indexFloat = float(index);
			const gridSizeFloat = float(this.gridSize);

			const col = indexFloat.mod(gridSizeFloat);
			const row = indexFloat.div(gridSizeFloat).floor();

			const x = col.sub(gridSizeFloat.div(2)).div(gridSizeFloat.div(4)).mul(10);

			const z = row.sub(gridSizeFloat.div(2)).div(gridSizeFloat.div(4)).mul(10);

			const y = float(0); // Start at y = 0

			const position = positionBuffer.element(instanceIndex);
			position.assign(vec3(x, y, z));
		});

		const initCompute = init().compute(this.count);
		this.renderer.computeAsync(initCompute);

		const update = Fn(() => {
			const position = positionBuffer.element(instanceIndex);
			const index = instanceIndex;

			const indexFloat = float(index);
			const gridSizeFloat = float(this.gridSize);

			const col = indexFloat.mod(gridSizeFloat);
			const row = indexFloat.div(gridSizeFloat).floor();

			const x = col.sub(gridSizeFloat.div(2)).div(gridSizeFloat.div(4)).mul(10);

			const z = row.sub(gridSizeFloat.div(2)).div(gridSizeFloat.div(4)).mul(10);

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

		material.positionNode = positionBuffer.toAttribute();

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
	}

	async render() {
		if (!this.isPlaying) return;
		this.controls.update();

		if (this.updateCompute) {
			this.renderer.computeAsync(this.updateCompute);
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


import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane, setupLightPane } from '$lib/utils/Tweakpane/utils';
import { dot, float, floor, Fn, fract, mix, mul, sub, uv, vec2, vec3, uniform, positionLocal, abs, vec4, mod, step, div, add, sin, If, select, Discard, greaterThan } from 'three/tsl';

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
	uniforms: {
		value: any;
		frequency: any;
		amplitude: any;
	} = {
			value: null,
			frequency: null,
			amplitude: null
		}

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
		this.pointLight.position.set(-1.6, 0.7, 1.7);
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

		const frequencyUniform = uniform(5);
		const amplitudeUniform = uniform(1);
		const timeUniform = uniform(0);

		this.uniforms = {
			value: timeUniform,
			frequency: frequencyUniform,
			amplitude: amplitudeUniform
		};

		// Alternative hash
		const hash32 = Fn(([p]: [Vec3]) => {
			const p3 = fract(p.mul(0.1031));
			const dotted = p3.add(dot(p3, p3.yzx.add(33.33)));
			return fract(dotted.mul(dotted.add(dotted.yzx))).mul(2.0).sub(1.0);
		});

		// Gradient noise (better than value noise)
		const gradientNoise = Fn(([p]: [Vec3]) => {
			const i = floor(p);
			const f = fract(p);

			// Quintic interpolation (smoother than cubic)
			const u = f.mul(f).mul(f).mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0));

			// Generate gradients for 8 corners
			const grad000 = hash32(i.add(vec3(0.0, 0.0, 0.0)));
			const grad100 = hash32(i.add(vec3(1.0, 0.0, 0.0)));
			const grad010 = hash32(i.add(vec3(0.0, 1.0, 0.0)));
			const grad110 = hash32(i.add(vec3(1.0, 1.0, 0.0)));
			const grad001 = hash32(i.add(vec3(0.0, 0.0, 1.0)));
			const grad101 = hash32(i.add(vec3(1.0, 0.0, 1.0)));
			const grad011 = hash32(i.add(vec3(0.0, 1.0, 1.0)));
			const grad111 = hash32(i.add(vec3(1.0, 1.0, 1.0)));

			// Compute dot products with distance vectors
			const d000 = f.sub(vec3(0.0, 0.0, 0.0));
			const d100 = f.sub(vec3(1.0, 0.0, 0.0));
			const d010 = f.sub(vec3(0.0, 1.0, 0.0));
			const d110 = f.sub(vec3(1.0, 1.0, 0.0));
			const d001 = f.sub(vec3(0.0, 0.0, 1.0));
			const d101 = f.sub(vec3(1.0, 0.0, 1.0));
			const d011 = f.sub(vec3(0.0, 1.0, 1.0));
			const d111 = f.sub(vec3(1.0, 1.0, 1.0));

			const v000 = dot(grad000, d000);
			const v100 = dot(grad100, d100);
			const v010 = dot(grad010, d010);
			const v110 = dot(grad110, d110);
			const v001 = dot(grad001, d001);
			const v101 = dot(grad101, d101);
			const v011 = dot(grad011, d011);
			const v111 = dot(grad111, d111);

			// Trilinear interpolation
			const x1 = mix(v000, v100, u.x);
			const x2 = mix(v010, v110, u.x);
			const x3 = mix(v001, v101, u.x);
			const x4 = mix(v011, v111, u.x);

			const y1 = mix(x1, x2, u.y);
			const y2 = mix(x3, x4, u.y);

			return mix(y1, y2, u.z);
		});

		// Fractal noise with multiple octaves
		const fractalNoise = Fn(([p]: [Vec3]) => {
			let value = float(0.0);
			let amplitude = float(1.0);
			let frequency = float(1.0);

			// 4 octaves
			for (let i = 0; i < 4; i++) {
				value = value.add(gradientNoise(p.mul(frequency)).mul(amplitude));
				amplitude = amplitude.mul(0.5);
				frequency = frequency.mul(2.0);
			}

			return value;
		});

		const disintegrateShader = Fn(() => {
			const localPos = positionLocal.xyz;
			const scaledPos = localPos.mul(frequencyUniform);

			// Try different noise functions:

			// Option 1: Gradient noise
			const noiseValue = gradientNoise(scaledPos);

			// Option 2: Fractal noise (comment out line above, uncomment this)
			// const noiseValue = fractalNoise(scaledPos);

			const scaledNoise = noiseValue.mul(amplitudeUniform); // [0, amplitude]
			const finalNoise = scaledNoise.add(timeUniform.mul(2.0)).sub(1.0);

			const isOutOfRange = finalNoise.greaterThan(0.0);
			const isCorner = finalNoise.lessThan(0.0).and(finalNoise.greaterThan(-0.1));
			const finalColor = vec3(0.0, 0.0, 0.0).toVar();

			If(isOutOfRange, () => {
				Discard();
			}).ElseIf(isCorner, () => {
				finalColor.r = mix(1.0, 0.0, abs(finalNoise).div(0.1));
			});


			return finalColor;
		});

		// The correct way to assign the node to the material
		this.material.colorNode = disintegrateShader();

		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.scene.add(this.mesh);
	}

	setUpSettings() {
		this.pane = new Pane();

		this.pane.addBinding(this.uniforms.value, 'value', {
			min: 0,
			max: 1,
			step: 0.01,
			label: 'Uniform Value'
		});

		this.pane.addBinding(this.uniforms.frequency, 'value', {
			min: 0,
			max: 10,
			step: 0.1,
			label: 'Frequency'
		});

		this.pane.addBinding(this.uniforms.amplitude, 'value', {
			min: 0,
			max: 10,
			step: 0.1,
			label: 'Amplitude'
		});

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
import * as THREE from 'three';
import { WebGPURenderer, MeshStandardNodeMaterial } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane, setupLightPane } from '$lib/utils/tweakpaneUtils/utils';
import { MSDFTextNodeMaterial, MSDFTextGeometry } from './src/index';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import {
	attribute,
	timerLocal,
	sin,
	add,
	mul,
	div,
	sub,
	clamp,
	mix,
	vec3
} from 'three/tsl';

interface SketchOptions {
	_dom_unused?: never; // placeholder to avoid empty interface change noise
	dom: HTMLElement;
}

export default class Sketch {
	scene: THREE.Scene;
	container: HTMLElement;
	width: number;
	height: number;
	renderer: WebGPURenderer;
	camera: THREE.PerspectiveCamera;
	controls: OrbitControls;
	isPlaying: boolean;
	resizeListener: boolean = false;
	material!: MeshStandardNodeMaterial;
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
		this.renderer = new WebGPURenderer();
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
		this.handleFonts();
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

	handleFonts() {
		console.log('IS THIS EVEN WORKING?');
		console.log(MSDFTextNodeMaterial);
		Promise.all([
			loadFontAtlas('/fonts/Audiowide-msdf.png'),
			loadFont('/fonts/Audiowide-msdf.json')
		])
			.then(([atlas, font]: any) => {
				const geometry = new MSDFTextGeometry({
					text: 'ALES HOLMAN\nPORTFOLIO',
					font: font.data
				});

				const material = new MSDFTextNodeMaterial({
					map: atlas,
					color: '#000000',
					opacity: 1.0,
					strokeOutsetWidth: 0.1,
					strokeInsetWidth: 0.05,
					strokeColor: '#FFFFFF'
				});

				/**
				 * First approach: override nodes on the existing MSDFTextNodeMaterial instance
				 * We build a per-letter animated gradient using the geometry attributes.
				 */
				// Geometry attributes exposed to the shader via TSL
				const letterIndex = attribute('letterIndex', 'float');
				const lineLetterIndex = attribute('lineLetterIndex', 'float');
				const lineLettersTotal = attribute('lineLettersTotal', 'float');

				// Normalized progress across the line (0..1)
				const progress = clamp(
					div(lineLetterIndex, sub(lineLettersTotal, 1.0)),
					0.0,
					1.0
				);

				// Time (seconds) – automatically provided node that updates each frame
				const time = timerLocal();

				// Build a smooth animated rainbow-like gradient using phase shifts
				const r = add(mul(sin(add(mul(time, 0.5), progress)), 0.5), 0.5);
				const g = add(
					mul(sin(add(mul(time, 0.6), add(progress, 2.094))), 0.5),
					0.5
				);
				const b = add(
					mul(sin(add(mul(time, 0.7), add(progress, 4.188))), 0.5),
					0.5
				);

				// Combine into gradient color node
				const gradient = vec3(r, g, b);
				// Mix original base color with the animated gradient for subtlety
				material.colorNode = mix(material.color, gradient, 0.9);

				// Pulsing opacity per letter (staggered by letterIndex)
				const pulse = add(
					mul(sin(add(mul(time, 3.0), mul(letterIndex, 0.35))), 0.5),
					0.5
				);
				material.opacityNode = mul(material.opacityNode, pulse);

				// Individual Y position animation per letter
				// Create a wave effect where each letter bounces at different times
				// Make amplitude much larger to account for the 0.01 scale
				const yOffset = mul(
					sin(add(mul(time, 2.0), mul(letterIndex, 0.5))),
					5.0 // Much larger amplitude to be visible at 0.01 scale
				);

				// Apply the Y offset to the vertex position
				// Get the original position attribute and add the animation
				const position = attribute('position', 'vec2'); // MSDF uses 2D positions
				const animatedPosition = vec3(
					position.x,
					add(position.y, yOffset), // Add Y animation
					0.0
				);

				// Override the position node
				material.positionNode = animatedPosition;

				material.needsUpdate = true;

				const mesh = new THREE.Mesh(geometry as any, material as any);
				mesh.position.set(0, 0, 0);
				mesh.scale.set(0.01, 0.01, 0.01);
				mesh.rotation.set(0, Math.PI * 1, Math.PI * 1.0);
				this.scene.add(mesh);
			})
			.catch((e) => console.error('MSDF font load failed', e));

		function loadFontAtlas(path: string) {
			return new Promise((resolve, reject) => {
				const loader = new THREE.TextureLoader();
				loader.load(path, resolve, undefined, reject);
			});
		}

		function loadFont(path: string) {
			return new Promise((resolve, reject) => {
				const loader = new FontLoader();
				loader.load(path, resolve, undefined, reject);
			});
		}
	}

	createMesh() {
		this.geometry = new THREE.BoxGeometry(1, 1, 1);
		this.material = new MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide
		});
		this.mesh = new THREE.Mesh(this.geometry, this.material as any);
		// this.scene.add(this.mesh);
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

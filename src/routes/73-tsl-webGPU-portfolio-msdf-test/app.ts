import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { MSDFText } from './MsdfText';

interface SketchOptions {
	/** DOM element container */
	dom: HTMLElement;
}

export default class Sketch {
	// Core
	scene: THREE.Scene;
	container: HTMLElement;
	width: number;
	height: number;
	renderer: THREE.WebGPURenderer;
	camera: THREE.PerspectiveCamera;
	controls: OrbitControls;
	isPlaying: boolean;
	resizeListener = false;

	pane!: Pane;
	msdfText!: MSDFText;

	constructor(options: SketchOptions) {
		this.scene = new THREE.Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new THREE.WebGPURenderer();
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 1000);
		this.camera.position.set(0, 0, 3);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.isPlaying = true;

		this.resize();
		this.init();
	}

	async init() {
		this.msdfText = new MSDFText({
			text: 'BORING WEBSITES\nI DONT LIKE',
			fontTexturePath: '/fonts/Audiowide-msdf.png',
			fontDataPath: '/fonts/Audiowide-msdf.json'
		});

		await this.renderer.init();
		await this.msdfText.loadAssets();
		await this.msdfText.createMesh();
		this.scene.add(this.msdfText.mesh);

		this.setUpSettings();
		this.render();
	}

	async updateTextGeometry() {
		const oldMesh = this.msdfText.mesh;
		await this.msdfText.createMesh();
		this.scene.remove(oldMesh);
		this.scene.add(this.msdfText.mesh);
	}

	setUpSettings() {
		this.pane = new Pane();
		(document.querySelector('.tp-dfwv') as HTMLElement)?.style && ((document.querySelector('.tp-dfwv') as HTMLElement).style.zIndex = '1000');

		const textFolder = this.pane.addFolder({ title: 'Text Controls' });
		textFolder.addBinding(this.msdfText.uniforms.textScale, 'value', {
			label: 'Scale',
			min: 0.001,
			max: 0.01,
			step: 0.0001
		}).on('change', () => this.updateTextGeometry());
		textFolder.addBinding(this.msdfText.uniforms.planePadding, 'value', {
			label: 'Padding',
			min: 1.0,
			max: 5.0,
			step: 0.1
		}).on('change', () => this.updateTextGeometry());
		textFolder.addBinding(this.msdfText.uniforms.lineSpacing, 'value', {
			label: 'Line Spacing',
			min: 0.5,
			max: 3.0,
			step: 0.05
		}).on('change', () => this.updateTextGeometry());

		// Circle debug
		const circleOpts = { circles: false };
		textFolder.addBinding(circleOpts, 'circles', { label: 'Show Circles' })
			.on('change', (e) => this.msdfText.updateParameters({ showCircles: e.value ? 1 : 0 }));
		textFolder.addBinding(this.msdfText.uniforms.circleRadius, 'value', {
			label: 'Circle Radius',
			min: 0,
			max: 0.5,
			step: 0.01
		}).on('change', () => this.msdfText.updateParameters({ circleRadius: this.msdfText.uniforms.circleRadius.value as number }));
		textFolder.addBinding(this.msdfText.uniforms.circleFeather, 'value', {
			label: 'Circle Feather',
			min: 0,
			max: 3,
			step: 0.01
		}).on('change', () => this.msdfText.updateParameters({ circleFeather: this.msdfText.uniforms.circleFeather.value as number }));
		// Iso-surface controls for metaball fusion
		textFolder.addBinding(this.msdfText.uniforms.circleIsoLevel, 'value', {
			label: 'Iso Level',
			min: 0.0,
			max: 5.0,
			step: 0.01
		}).on('change', () => this.msdfText.updateParameters({ circleIsoLevel: this.msdfText.uniforms.circleIsoLevel.value as number }));
		textFolder.addBinding(this.msdfText.uniforms.circleIsoFeather, 'value', {
			label: 'Iso Feather',
			min: 0.0,
			max: 1.0,
			step: 0.005
		}).on('change', () => this.msdfText.updateParameters({ circleIsoFeather: this.msdfText.uniforms.circleIsoFeather.value as number }));
	}

	stop() {
		this.isPlaying = false;
		window.removeEventListener('resize', this.resizeHandler);
		this.msdfText?.dispose();
		this.renderer.dispose();
		if (this.pane) this.pane.dispose();
	}

	private resizeHandler = () => this.resize();

	resize() {
		if (!this.resizeListener) {
			window.addEventListener('resize', this.resizeHandler);
			this.resizeListener = true;
		}
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	async render() {
		if (!this.isPlaying) return;
		this.controls.update();
		await this.renderer.renderAsync(this.scene, this.camera);
		requestAnimationFrame(() => this.render());
	}
}

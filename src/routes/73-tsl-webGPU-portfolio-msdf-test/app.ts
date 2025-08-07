import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { MSDFText } from './MsdfText';
import {
	add,
	float,
	Fn,
	int,
	Loop,
	mul,
	sub,
	texture,
	uniform,
	uv,
	varying,
	vec2
} from 'three/tsl';

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
	msdfText!: MSDFText;

	// --- Post-processing properties ---
	private renderTargetA!: THREE.RenderTarget;
	private renderTargetB!: THREE.RenderTarget;
	private postProcessScene!: THREE.Scene;
	private postProcessCamera!: THREE.OrthographicCamera;
	private fullscreenQuad!: THREE.Mesh;

	// --- Keep direct references to the uniforms for easy access ---
	private blurAmount!: ReturnType<typeof uniform>;
	private blurInputTexture!: ReturnType<typeof uniform>;
	private blurDirection!: ReturnType<typeof uniform>;

	constructor(options: SketchOptions) {
		this.scene = new THREE.Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new THREE.WebGPURenderer();
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		// The clear color will be managed in the render passes
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

		this.setupPostProcessing();
		this.setUpSettings();
		this.render();
	}

	setupPostProcessing() {
		this.renderTargetA = new THREE.RenderTarget(this.width, this.height);
		this.renderTargetB = new THREE.RenderTarget(this.width, this.height);

		this.postProcessScene = new THREE.Scene();
		this.postProcessCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

		const quadGeometry = new THREE.PlaneGeometry(2, 2);
		const postProcessMaterial = new THREE.NodeMaterial();
		this.fullscreenQuad = new THREE.Mesh(quadGeometry, postProcessMaterial);
		this.postProcessScene.add(this.fullscreenQuad);

		// Store uniforms as class properties for easy access later
		this.blurInputTexture = uniform(this.renderTargetA.texture);
		this.blurDirection = uniform(new THREE.Vector2(1, 0));
		this.blurAmount = uniform(2.0);

		const gaussianBlur = Fn(([tex, texUV, dir, blurAmt]: any) => {
			const weights = [
				float(0.227027),
				float(0.1945946),
				float(0.1216216),
				float(0.054054),
				float(0.016216)
			];
			const resolution = vec2(this.width, this.height);
			const texelSize = vec2(1.0).div(resolution);
			const result = mul(texture(tex, texUV), weights[0]).toVar();

			Loop({ start: int(1), end: int(5) }, ({ i }) => {
				const offset = mul(i, texelSize, dir, blurAmt);
				result.addAssign(mul(texture(tex, add(texUV, offset)), weights[i]));
				result.addAssign(mul(texture(tex, sub(texUV, offset)), weights[i]));
			});
			return result;
		});

		postProcessMaterial.colorNode = gaussianBlur(
			this.blurInputTexture,
			varying(uv()),
			this.blurDirection,
			this.blurAmount
		);
	}

	async updateTextGeometry() {
		const oldMesh = this.msdfText.mesh;
		await this.msdfText.createMesh();
		this.scene.remove(oldMesh);
		this.scene.add(this.msdfText.mesh);
	}

	setUpSettings() {
		this.pane = new Pane();
		(document.querySelector('.tp-dfwv') as HTMLElement)!.style.zIndex = '1000';

		const textFolder = this.pane.addFolder({ title: 'Text Controls' });
		// Add the blur amount to the pane for real-time control
		textFolder.addBinding(this.blurAmount, 'value', {
			label: 'Blur Amount',
			min: 0,
			max: 20,
			step: 0.1
		});
	}

	stop() {
		this.isPlaying = false;
		window.removeEventListener('resize', this.resize.bind(this));
		this.msdfText?.dispose();

		// --- NEW: Dispose post-processing resources ---
		this.renderTargetA?.dispose();
		this.renderTargetB?.dispose();
		(this.fullscreenQuad?.material as THREE.Material)?.dispose();

		this.renderer.dispose();
		if (this.pane) this.pane.dispose();
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

		// --- NEW: Resize render targets on window resize ---
		if (this.renderTargetA) {
			this.renderTargetA.setSize(this.width, this.height);
			this.renderTargetB.setSize(this.width, this.height);
		}
	}

	async render() {
		if (!this.isPlaying) return;
		this.controls.update();

		// --- NEW: Correct multi-pass rendering pipeline ---

		// Pass 1: Render the main scene (with text) to RenderTargetA
		this.renderer.setRenderTarget(this.renderTargetA);
		this.renderer.setClearColor(0x000000, 0); // Clear with transparent background
		this.renderer.clear();
		await this.renderer.renderAsync(this.scene, this.camera);

		// Pass 2: Render a horizontal blur to RenderTargetB
		this.renderer.setRenderTarget(this.renderTargetB);
		this.blurInputTexture.value = this.renderTargetA.texture;
		(this.blurDirection.value as THREE.Vector2).set(1, 0); // Set direction to horizontal
		await this.renderer.renderAsync(
			this.postProcessScene,
			this.postProcessCamera
		);

		// Pass 3: Render a vertical blur to the screen
		this.renderer.setRenderTarget(null); // Set output back to the screen
		this.blurInputTexture.value = this.renderTargetB.texture;
		this.blurDirection.value.set(0, 1); // Set direction to vertical
		await this.renderer.renderAsync(
			this.postProcessScene,
			this.postProcessCamera
		);

		requestAnimationFrame(() => this.render());
	}
}

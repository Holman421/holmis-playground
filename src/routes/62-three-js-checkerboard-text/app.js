import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import gsap from 'gsap';
import { Text } from './troika-text/index.js'; // Import the modified Text class from the local path

// Add shader imports
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import textVertexShader from './shaders/textVertex.glsl';
import textFragmentShader from './shaders/textFragment.glsl';
import { setupCameraPane } from '$lib/utils/Tweakpane/utils';
import { Pane } from 'tweakpane';

export default class Sketch {
	constructor(options) {
		this.scene = new THREE.Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new THREE.WebGLRenderer({
			antialias: true
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0x000000, 1);
		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 1000);
		this.camera.position.set(0, 0, 3);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;

		this.doTheLog = true;

		this.isPlaying = true;

		// Create settings first
		this.settings = {
			text: {
				content: 'abc',
				fontSize: 0.5,
				fillColor: '#000000',
				fillOpacity: 1.0
			},
			stroke: {
				color: '#00ffff',
				opacity: 1.0,
				width: 0.005
			},
			wave: {
				amplitude: 0.05,
				frequency: 0.2
			},
			debug: {
				showBoundingBox: true,
				showCharacterBoxes: true
			},
			progress: 0
		};

		// Initialize everything in the right order
		this.setupLights();
		this.addObjects();
		this.resize();
		this.setupSettings();

		// Start render loop immediately
		this.render();

		// Load font after scene is already rendering
		this.loadFont();
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

	async loadFont() {
		this.text = new Text();

		// Configure initial text properties
		this.text.text = this.settings.text.content;
		this.text.color = this.settings.text.fillColor;
		this.text.fontSize = this.settings.text.fontSize;
		this.text.position.z = 0.5;
		this.text.anchorX = 'center';
		this.text.anchorY = 'middle';
		this.text.font = './fonts/grotesk-font.ttf';
		this.text.progress = this.settings.progress;

		// Set stroke properties using Troika's built-in properties
		this.text.strokeWidth = this.settings.stroke.width;
		this.text.strokeColor = new THREE.Color(this.settings.stroke.color);
		this.text.strokeOpacity = this.settings.stroke.opacity;

		this.scene.add(this.text);
	}

	setupLights() {
		const ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
		directionalLight.position.set(1, 1, 1);
		this.scene.add(directionalLight);
	}

	addObjects() {
		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			side: THREE.DoubleSide,
			uniforms: {
				uTexture: { value: null }
			},
			wireframe: false
		});

		this.geometry = new THREE.PlaneGeometry(2, 2, 5, 5);
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.mesh.position.set(0, 0, 0);
		this.scene.add(this.mesh);
	}

	setupSettings() {
		this.pane = new Pane();

		setupCameraPane({
			pane: this.pane,
			camera: this.camera,
			controls: this.controls,
			scene: this.scene,
			isActive: false
		});

		const textFolder = this.pane.addFolder({ title: 'Text' });
		textFolder
			.addBinding(this.settings, 'progress', {
				label: 'Progress',
				min: 0,
				max: 1,
				step: 0.01
			})
			.on('change', () => {
				this.text.progress = this.settings.progress;
			});
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;

		// Update the time uniform in our injected shader
		if (this.text?._derivedMaterial?.uniforms?.uTime) {
			this.text._derivedMaterial.uniforms.uTime.value = this.time;
		}

		this.controls.update();
		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(this.render.bind(this));
	}

	stop() {
		this.isPlaying = false;
		this.pane.dispose();
	}
}

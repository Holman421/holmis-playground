import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import gsap from 'gsap';
import { setupCameraGUI } from '$lib/utils/cameraGUI';

// Add shader imports
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';

export default class Sketch {
	constructor(options) {
		this.scene = new THREE.Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0x000000, 1);
		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 1000);
		this.camera.position.set(0, 0, 3);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;
		this.progress = 0;

		this.isPlaying = true;
		this.isOpen = false;

		this.setupEvents();
		this.setupLights();
		this.addObjects();
		this.resize();
		this.render();
		this.setUpSettings();
	}

	setupEvents() {}

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
		const ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
		directionalLight.position.set(1, 1, 1);
		this.scene.add(directionalLight);
	}

	addObjects() {
		const numCircles = Math.floor(Math.random() * 5) + 3; // 3-7 circles
		const circlePositions = [];
		const noiseParams = [];

		// Add texture loading
		const textureLoader = new THREE.TextureLoader();
		const texture = textureLoader.load('/pictures/universe/universe-1.jpg'); // Update path to your image

		for (let i = 0; i < numCircles; i++) {
			circlePositions.push(
				Math.random(), // x
				Math.random() // y
			);
			noiseParams.push(
				Math.random() * 4 + 1, // frequency
				Math.random() * 4 + 1, // speed
				Math.random() * 0.5 + 0.2 // amplitude
			);
		}

		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uProgress: { value: 0 },
				uCircles: { value: new Float32Array(circlePositions) },
				uNoiseParams: { value: new Float32Array(noiseParams) },
				uNumCircles: { value: numCircles },
				uTexture: { value: texture } // Add texture uniform
			},
			side: THREE.DoubleSide
		});

		this.geometry = new THREE.PlaneGeometry(2, 2);
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.mesh.position.set(0, 0, 0);
		this.scene.add(this.mesh);
	}

	animateProgress() {
		const targetProgress = this.isOpen ? 0 : 1;
		this.isOpen = !this.isOpen;

		gsap.to(this.material.uniforms.uProgress, {
			value: targetProgress,
			duration: this.isOpen ? 5 : 1,
			ease: 'power1.in',
			overwrite: true,
			onUpdate: () => {
				// Update the TweakPane controller when animation updates
				this.progressController.refresh();
			}
		});
	}

	setUpSettings() {
		this.pane = new Pane({
			title: 'Controls'
		});

		// Store reference to the controller
		const progressInput = this.pane.addBinding(this.material.uniforms.uProgress, 'value', {
			min: 0,
			max: 1,
			step: 0.01,
			label: 'progress'
		});

		this.pane.addButton({ title: 'Toggle Animation' }).on('click', () => this.animateProgress());

		// Update the animateProgress method to work with TweakPane
		this.progressController = progressInput;
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		this.material.uniforms.uTime.value = this.time;

		this.controls.update();
		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(this.render.bind(this));
	}

	stop() {
		this.isPlaying = false;
		this.pane.dispose();
	}
}

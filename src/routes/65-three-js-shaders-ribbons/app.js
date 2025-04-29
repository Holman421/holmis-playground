import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import gsap from 'gsap';

// Add shader imports
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { setupCameraPane } from '$lib/utils/Tweakpane/utils';
import { Pane } from 'tweakpane';

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
		this.camera.position.set(0, 1, 3);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;

		this.clock = new THREE.Clock();
		this.isPlaying = true;
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

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		directionalLight.position.set(0.5, 2, 0.86);
		this.scene.add(directionalLight);
	}

	addObjects() {
		this.mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
		this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);

		this.plane = new THREE.Mesh(this.geometry, this.mat);
		this.scene.add(this.plane);

		let floorGeometry = new THREE.PlaneGeometry(30, 30, 200, 200).rotateX(-Math.PI / 2);
		let floorMaterial = new THREE.MeshStandardMaterial({
			side: THREE.DoubleSide
		});
		let floor = new THREE.Mesh(floorGeometry, floorMaterial);
		this.scene.add(floor);
	}

	setUpSettings() {
		this.pane = new Pane();
		document.querySelector('.tp-dfwv').style.zIndex = 1000;

		// setupCameraPane({
		// 	camera: this.camera,
		// 	pane: this.pane,
		// 	controls: this.controls,
		// 	scene: this.scene
		// });
	}

	render() {
		if (!this.isPlaying) return;
		this.time = this.clock.getElapsedTime();

		this.controls.update();
		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(this.render.bind(this));
	}

	stop() {
		this.isPlaying = false;
	}
}

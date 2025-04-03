import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { Pane } from 'tweakpane';
import gsap from 'gsap';
import { setupCameraPane } from '$lib/utils/Tweakpane/utils';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
// Add shader imports
import vertexShader from './shaders/vertexParticles.glsl';
import fragmentShader from './shaders/fragment.glsl';

import simVertex from './shaders/simVertex.glsl';
import simFragment from './shaders/simFragment.glsl';

import vertexParticles from './shaders/vertexParticles.glsl';
import { setupLightGUI } from '$lib/utils/lightGUI';

export default class Sketch {
	constructor(options) {
		this.scene = new THREE.Scene();
		this.container = options.dom;

		this.isMobile = window.innerWidth < 1024;
		this.canvasSize = this.isMobile ? 300 : 600;

		this.width = this.canvasSize * 2;
		this.height = this.canvasSize;
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio(this.pixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor('#070809', 1);
		this.container.appendChild(this.renderer.domElement);

		// this.scene.add(new THREE.AxesHelper(5));

		this.isPlaying = true;
		this.setupRaycaster();
		this.setupCamera();
		this.setupLights();
		this.setUpFBO();
		this.addObjects();
		this.setUpResize();
		this.setupPasses();
		this.setUpSettings();
		this.render();
	}

	setupCamera() {
		this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 1024);
		this.camera.position.set(0.0, 0.0, 2.25);
		this.camera.lookAt(0, 0, 0);

		// this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		// this.controls.enabled = false;
		this.time = 0;
	}

	setupRaycaster() {
		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.dummy = new THREE.Mesh(
			new THREE.PlaneGeometry(100, 100, 1, 1),
			new THREE.MeshBasicMaterial()
		);
		this.targetMouse = new THREE.Vector3(0, 0, 0);

		window.addEventListener('pointermove', (e) => {
			if (window.innerWidth >= 1024) {
				// Convert mouse position to normalized device coordinates (-1 to +1)
				this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
				this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

				// Update raycaster and get intersection
				this.raycaster.setFromCamera(this.pointer, this.camera);
				let intersects = this.raycaster.intersectObject(this.dummy);

				if (intersects.length > 0) {
					this.targetMouse.copy(intersects[0].point);
				}
			} else {
				this.targetMouse.set(0, 0, 0);
			}
		});

		window.addEventListener('mousedown', () => {
			this.fboMaterial.uniforms.uMouseMode.value = -1.0;
		});

		window.addEventListener('mouseup', () => {
			this.fboMaterial.uniforms.uMouseMode.value = 1.0;
		});
	}

	setUpResize() {
		window.addEventListener('resize', this.resize.bind(this));
	}

	setupPasses() {
		this.renderer.setSize(this.canvasSize * 4, this.canvasSize * 2);
		this.camera.aspect = (this.canvasSize * 4) / (this.canvasSize * 2);
		this.camera.updateProjectionMatrix();

		this.composer = new EffectComposer(this.renderer);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(this.renderPass);

		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();

		this.bloomPass = new UnrealBloomPass(
			new THREE.Vector2(this.canvasSize * 4, this.canvasSize * 2),
			0.7,
			0.25,
			0.66
		);
		this.composer.addPass(this.bloomPass);

		this.afterimagePass = new AfterimagePass(0.1);
		this.composer.addPass(this.afterimagePass);
	}

	resize() {
		this.isMobile = window.innerWidth < 1024;
		this.canvasSize = this.isMobile ? 300 : 600;
		this.width = this.canvasSize * 2;
		this.height = this.canvasSize;
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);

		this.renderer.setSize(this.width, this.height);
		this.renderer.setPixelRatio(this.pixelRatio);

		this.shaderResetPointsOffset = this.isMobile ? 1 : 0;
		this.fboMaterial.uniforms.shaderResetPointsOffset.value = this.shaderResetPointsOffset;
		if (this.isMobile) {
			this.fboMaterial.uniforms.uCurrentMouse.value = new THREE.Vector2(0, 0);
		}
		// Update camera
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();

		// Update the canvas size uniform
		this.material.uniforms.uCanvasSize.value = this.canvasSize;

		// Update composer
		this.composer.setSize(this.canvasSize * 4, this.canvasSize * 2);
		this.composer.setPixelRatio(this.pixelRatio);
		this.bloomPass.resolution.set(this.canvasSize * 4, this.canvasSize * 2);
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(this.ambientLight);

		this.pointLight = new THREE.PointLight(0xffffff, 30);
		this.pointLight.position.set(1.2, -0.1, 0.1);
		this.scene.add(this.pointLight);

		this.pointLight2 = new THREE.PointLight(0xffffff, 30);
		this.pointLight2.position.set(1.2, -3.0, 0.1);
		this.scene.add(this.pointLight2);
	}

	getRenderTarget() {
		const renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		return renderTarget;
	}

	setUpFBO() {
		this.size = 256;
		this.fbo = this.getRenderTarget();
		this.fbo1 = this.getRenderTarget();
		this.fboScene = new THREE.Scene();
		this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
		this.fboCamera.position.set(0, 0, 0.5);
		this.fboCamera.lookAt(0, 0, 0);
		let geometry = new THREE.PlaneGeometry(2, 2);
		this.data = new Float32Array(this.size * this.size * 4);
		this.shaderResetPointsOffset = window.innerWidth >= 1024 ? 0 : 1;

		for (let i = 0; i < this.size; i++) {
			for (let j = 0; j < this.size; j++) {
				let index = (i + j * this.size) * 4;
				// Distribute particles in a circle with random radius
				let theta = (i * 2.0 * Math.PI) / this.size + (Math.random() * 0.2 - 0.1);
				let radius = 1.0 + Math.random() * 0.5; // Random radius between 1.0 and 1.5
				this.data[index + 0] = Math.random() * 2 - 1;
				this.data[index + 1] = Math.random() * 2 - 1;
				this.data[index + 2] = 0;
				this.data[index + 3] = Math.random() > 0.5 ? 1 : -1;
			}
		}
		this.fboTexture = new THREE.DataTexture(
			this.data,
			this.size,
			this.size,
			THREE.RGBAFormat,
			THREE.FloatType
		);
		this.fboTexture.magFilter = THREE.NearestFilter;
		this.fboTexture.minFilter = THREE.NearestFilter;
		this.fboTexture.needsUpdate = true;

		this.fboMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uPositions: { value: this.fboTexture },
				uTime: { value: 0 },
				uCurrentMouse: { value: new THREE.Vector2(0, 0) },
				uInfo: { value: null },
				uMouseMode: { value: 1.0 },
				uNoiseScale: { value: 6.0 },
				uNoiseStrength: { value: 0.025 },
				uAttractionStrength: { value: 0.4 },
				shaderResetPointsOffset: { value: this.shaderResetPointsOffset }
			},
			vertexShader: simVertex,
			fragmentShader: simFragment
		});

		this.infoArray = new Float32Array(this.size * this.size * 4);

		for (let i = 0; i < this.size; i++) {
			for (let j = 0; j < this.size; j++) {
				// Changed i++ to j++
				let index = (i + j * this.size) * 4;
				this.infoArray[index + 0] = 0.5 + Math.random();
				this.infoArray[index + 1] = 0.5 + Math.random();
				this.infoArray[index + 2] = 1;
				this.infoArray[index + 3] = 1;
			}
		}
		this.info = new THREE.DataTexture(
			this.infoArray,
			this.size,
			this.size,
			THREE.RGBAFormat,
			THREE.FloatType
		);
		this.info.magFilter = THREE.NearestFilter;
		this.info.minFilter = THREE.NearestFilter;
		this.info.needsUpdate = true;

		this.fboMaterial.uniforms.uInfo.value = this.info;

		this.fboMesh = new THREE.Mesh(geometry, this.fboMaterial);
		this.fboScene.add(this.fboMesh);

		this.renderer.setRenderTarget(this.fbo);
		this.renderer.render(this.fboScene, this.fboCamera);
		this.renderer.setRenderTarget(this.fbo1);
		this.renderer.render(this.fboScene, this.fboCamera);
	}

	addObjects() {
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivates: '#extension GL_OES_standard_derivatives : enable'
			},
			uniforms: {
				uTime: { value: 0 },
				uPositions: { value: null },
				uCanvasSize: { value: this.canvasSize } // Add this uniform
			},
			transparent: true,
			vertexShader,
			fragmentShader,
			side: THREE.DoubleSide
		});

		this.count = this.size ** 2;
		let geometry = new THREE.BufferGeometry();
		let positions = new Float32Array(this.count * 3);
		let uv = new Float32Array(this.count * 2);

		for (let i = 0; i < this.size; i++) {
			for (let j = 0; j < this.size; j++) {
				let index = i + j * this.size;
				positions[index * 3 + 0] = Math.random();
				positions[index * 3 + 1] = Math.random();
				positions[index * 3 + 2] = 0;

				uv[index * 2 + 0] = i / this.size;
				uv[index * 2 + 1] = j / this.size;
			}
		}

		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

		this.material.uniforms.uPositions.value = this.fboTexture;

		this.points = new THREE.Points(geometry, this.material);
		// this.points.rotation.y = Math.PI / 2;
		this.points.frustumCulled = false; // Add this line to disable frustum culling
		this.scene.add(this.points);

		// Create box with edges
		this.boxGeometry = new THREE.BoxGeometry(0.75, 10, 0.75);
		this.boxMaterial = new THREE.MeshStandardMaterial({
			color: 'black',
			side: THREE.DoubleSide,
			polygonOffset: true,
			polygonOffsetFactor: 1,
			polygonOffsetUnits: 1
		});
		this.box = new THREE.Mesh(this.boxGeometry, this.boxMaterial);

		// Create only the outer edges
		const edgesGeometry = new THREE.EdgesGeometry(this.boxGeometry, 89); // High angle threshold
		const edgesMaterial = new THREE.LineBasicMaterial({
			color: 'white',
			linewidth: 1
		});
		this.edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

		// Group box and edges
		this.boxGroup = new THREE.Group();
		this.boxGroup.add(this.box);
		// this.boxGroup.add(this.edges);
		this.boxGroup.rotation.y = Math.PI / 8;
		// this.scene.add(this.boxGroup);
	}

	setUpSettings() {
		this.pane = new Pane();
		document.querySelector('.tp-dfwv').style.zIndex = 1000;

		// Add bloom folder
		const bloomFolder = this.pane.addFolder({
			title: 'Bloom Effect',
			expanded: false
		});

		bloomFolder.addBinding(this.bloomPass, 'enabled', {
			label: 'Enable Bloom'
		});

		bloomFolder.addBinding(this.bloomPass, 'strength', {
			label: 'Bloom Strength',
			min: 0,
			max: 3
		});

		bloomFolder.addBinding(this.bloomPass, 'radius', {
			label: 'Bloom Radius',
			min: 0,
			max: 1
		});

		bloomFolder.addBinding(this.bloomPass, 'threshold', {
			label: 'Bloom Threshold',
			min: 0,
			max: 1
		});

		// Simulation folder
		const simulationFolder = this.pane.addFolder({ title: 'Simulation', expanded: false });

		simulationFolder.addBinding(this.fboMaterial.uniforms.uNoiseScale, 'value', {
			label: 'Noise Scale',
			min: 0.1,
			max: 10.0
		});

		simulationFolder.addBinding(this.fboMaterial.uniforms.uNoiseStrength, 'value', {
			label: 'Noise Strength',
			min: 0.0,
			max: 0.05
		});
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;

		// Add smooth mouse movement with faster interpolation
		const currentMouse = this.fboMaterial.uniforms.uCurrentMouse.value;
		currentMouse.x += (this.targetMouse.x - currentMouse.x) * 0.5;
		currentMouse.y += (this.targetMouse.y - currentMouse.y) * 0.5;

		this.material.uniforms.uTime.value = this.time;
		this.fboMaterial.uniforms.uTime.value = this.time;
		requestAnimationFrame(this.render.bind(this));

		this.fboMaterial.uniforms.uPositions.value = this.fbo1.texture;
		this.material.uniforms.uPositions.value = this.fbo.texture;

		this.renderer.setRenderTarget(this.fbo);
		this.renderer.render(this.fboScene, this.fboCamera);
		this.renderer.setRenderTarget(null);
		this.renderer.render(this.scene, this.camera);

		this.composer.render();

		let temp = this.fbo;
		this.fbo = this.fbo1;
		this.fbo1 = temp;
	}

	stop() {
		this.isPlaying = false;
		this.pane.dispose();
	}
}

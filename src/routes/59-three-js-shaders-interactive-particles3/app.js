import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import GUI from 'lil-gui';
import gsap from 'gsap';
import { setupCameraGUI } from '$lib/utils/cameraGUI';
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
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio(this.pixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0x000000, 1);
		this.container.appendChild(this.renderer.domElement);

		this.axesHelper = new THREE.AxesHelper(5);
		// this.scene.add(this.axesHelper);

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
		this.setupButtonHover();
	}

	setupCamera() {
		this.camera = new THREE.PerspectiveCamera(
			70, // reduced FOV from 95 to 70
			this.width / this.height,
			0.01,
			1000
		);
		this.camera.position.set(4.0, 0.0, 0);
		// this.camera.rotation.set(3.0, 0.0, 0);
		this.camera.lookAt(0, 0, 0);
		this.camera.fov = 60;
		this.camera.updateProjectionMatrix();

		// Add target Y position for smooth interpolation
		this.targetY = this.camera.position.y;

		this.container.addEventListener('wheel', (event) => {
			event.preventDefault();
			// Reduce the delta and invert the direction
			console.log(this.camera.position.y);
			const delta = event.deltaY * -0.003;
			this.targetY = Math.max(-2.2, Math.min(0, this.targetY + delta));
		});

		this.time = 0;
	}

	setupRaycaster() {
		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.dummy = new THREE.Mesh(
			new THREE.PlaneGeometry(100, 100, 1, 1),
			new THREE.MeshBasicMaterial()
		);
		this.targetMouse = new THREE.Vector3(0, 0, 0); // Add this line
		this.ball = new THREE.Mesh(
			new THREE.SphereGeometry(0.1, 32, 32),
			new THREE.MeshBasicMaterial({ color: 0xff0000 })
		);
		// this.scene.add(this.ball);
		window.addEventListener('pointermove', (e) => {
			this.pointer.x = (e.clientX / this.width) * 2 - 1;
			this.pointer.y = -((e.clientY - 56) / this.height) * 2 + 1;
			this.raycaster.setFromCamera(this.pointer, this.camera);

			let intersects = this.raycaster.intersectObject(this.dummy);

			if (intersects.length > 0) {
				let point = intersects[0].point;
				this.targetMouse.copy(point); // Change this line
				this.fboMaterial.uniforms.uMouse.value = point;
				// this.ball.position.copy(point);
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
		this.composer = new EffectComposer(this.renderer);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(this.renderPass);

		this.bloomPass = new UnrealBloomPass(
			new THREE.Vector2(this.width, this.height),
			0.7,
			1.0,
			0.66
		);
		this.composer.addPass(this.bloomPass);

		this.afterimagePass = new AfterimagePass(0.1);
		this.composer.addPass(this.afterimagePass);
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);

		this.renderer.setSize(this.width, this.height);
		this.renderer.setPixelRatio(this.pixelRatio);

		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
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

		for (let i = 0; i < this.size; i++) {
			for (let j = 0; j < this.size; j++) {
				// Changed i++ to j++
				let index = (i + j * this.size) * 4;
				let theta = Math.random() * Math.PI * 2;
				let r = 0.5 + Math.random() * 0.5;
				this.data[index + 0] = Math.cos(theta) * r;
				this.data[index + 1] = Math.sin(theta) * r;
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
				uMouse: { value: new THREE.Vector2(0, 0) },
				uCurrentMouse: { value: new THREE.Vector2(0, 0) }, // Add this line
				uInfo: { value: null },
				uMouseMode: { value: 1.0 },
				uNoiseScale: { value: 5.0 },
				uNoiseStrength: { value: 0.005 },
				uCircularForce: { value: 0.7 },
				uRotationSpeed: { value: 0.15 },
				uAttractionStrength: { value: 0.1 }
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
				uPositions: { value: null }
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
		this.points.rotation.x = Math.PI / 2;
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
		this.scene.add(this.boxGroup);
	}

	setUpSettings() {
		this.gui = new GUI();
		this.controllers = {}; // Store controllers for updating

		setupLightGUI(this.pointLight2, this.gui, 'Directional Light');

		// setupCameraGUI({ gui: this.gui, camera: this.camera, controls: this.controls });

		// Add bloom folder
		const bloomFolder = this.gui.addFolder('Bloom Effect');
		bloomFolder.add(this.bloomPass, 'enabled').name('Enable Bloom');
		bloomFolder.add(this.bloomPass, 'strength', 0, 3).name('Bloom Strength');
		bloomFolder.add(this.bloomPass, 'radius', 0, 1).name('Bloom Radius');
		bloomFolder.add(this.bloomPass, 'threshold', 0, 1).name('Bloom Threshold');
		bloomFolder.open();

		const simulationFolder = this.gui.addFolder('Simulation');
		this.controllers.noiseScale = simulationFolder
			.add(this.fboMaterial.uniforms.uNoiseScale, 'value', 0.1, 10.0)
			.name('Noise Scale');
		this.controllers.noiseStrength = simulationFolder
			.add(this.fboMaterial.uniforms.uNoiseStrength, 'value', 0.0, 0.02)
			.name('Noise Strength');
		this.controllers.circularForce = simulationFolder
			.add(this.fboMaterial.uniforms.uCircularForce, 'value', 0.0, 2.0)
			.name('Circular Force');
		this.controllers.rotationSpeed = simulationFolder
			.add(this.fboMaterial.uniforms.uRotationSpeed, 'value', 0.0, 1.0)
			.name('Rotation Speed');
		this.controllers.attractionStrength = simulationFolder
			.add(this.fboMaterial.uniforms.uAttractionStrength, 'value', 0.01, 0.5)
			.name('Attraction Strength');
		simulationFolder.open();
	}

	setupButtonHover() {
		const button = document.getElementById('explore-btn');
		const hoverModes = [
			{ type: 'noise', value: 0 },
			{ type: 'noise', value: 0.015 },
			{ type: 'rotation', value: 0.35 },
			{ type: 'combined', noiseScale: 30, rotationSpeed: 0.04 }
		];
		let currentModeIndex = Math.floor(Math.random() * hoverModes.length);

		const updateGUI = () => {
			Object.values(this.controllers).forEach((controller) => controller.updateDisplay());
		};

		button.addEventListener('mouseenter', () => {
			const mode = hoverModes[currentModeIndex];
			if (mode.type === 'noise') {
				gsap.to(this.fboMaterial.uniforms.uNoiseStrength, {
					value: mode.value,
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: updateGUI
				});
			} else if (mode.type === 'rotation') {
				gsap.to(this.fboMaterial.uniforms.uRotationSpeed, {
					value: mode.value,
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: updateGUI
				});
			} else if (mode.type === 'combined') {
				gsap.to(this.fboMaterial.uniforms.uNoiseScale, {
					value: mode.noiseScale,
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: updateGUI
				});
				gsap.to(this.fboMaterial.uniforms.uRotationSpeed, {
					value: mode.rotationSpeed,
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: updateGUI
				});
			}
			currentModeIndex = (currentModeIndex + 1) % hoverModes.length;
		});

		button.addEventListener('mouseleave', () => {
			// Reset all parameters to their default values
			gsap.to(this.fboMaterial.uniforms.uNoiseStrength, {
				value: 0.005,
				duration: 0.5,
				ease: 'power2.out',
				onUpdate: updateGUI
			});
			gsap.to(this.fboMaterial.uniforms.uRotationSpeed, {
				value: 0.15,
				duration: 0.5,
				ease: 'power2.out',
				onUpdate: updateGUI
			});
			gsap.to(this.fboMaterial.uniforms.uNoiseScale, {
				value: 5.0,
				duration: 0.5,
				ease: 'power2.out',
				onUpdate: updateGUI
			});
		});
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;

		// Add smooth camera movement with easing
		const ease = 0.05;
		this.camera.position.y = Math.max(
			-2.2,
			Math.min(0, this.camera.position.y + (this.targetY - this.camera.position.y) * ease)
		);

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
		this.gui.destroy();
	}
}

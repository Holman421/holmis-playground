import * as THREE from 'three';
import { REVISION } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import fragment from './shader/fragment.glsl';
import vertex from './shader/vertexParticles.glsl';

import simFragment from './shader/simFragment.glsl';
import simVertex from './shader/simVertex.glsl';
import GUI from 'lil-gui';
import gsap from 'gsap';
import { setupCameraGUI } from '$lib/utils/cameraGUI';
import { setupObjectGUI } from '$lib/utils/objectGUI';

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

		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();

		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(95, this.width / this.height, 0.01, 1000);

		// let frustumSize = 10;
		// let aspect = this.width / this.height;
		// this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;

		this.camera.position.set(0.27, 0.7, 1.15);
		this.camera.rotation.set(-1.15, 0.69, 0.96);
		this.controls.target.set(-0.45, -0.1, 0.79);
		this.camera.fov = 95;
		this.camera.updateProjectionMatrix();

		this.composer = new EffectComposer(this.renderer);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(this.renderPass);

		this.bloomPass = new UnrealBloomPass(
			new THREE.Vector2(this.width, this.height),
			1.15,
			1.0,
			0.66
		);
		this.composer.addPass(this.bloomPass);

		this.afterimagePass = new AfterimagePass(0.1);
		this.composer.addPass(this.afterimagePass);

		this.isPlaying = true;
		this.setupEvents();
		this.setupFBO();
		this.addObjects();
		this.resize();
		this.render();
		this.setupResize();
		this.setUpSettings();
	}

	setupEvents() {
		this.dummy = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial());
		this.ball = new THREE.Mesh(
			new THREE.SphereGeometry(0.1, 32, 32),
			new THREE.MeshBasicMaterial({ color: 0x555555 })
		);
		// this.scene.add(this.ball)
		document.addEventListener('pointermove', (e) => {
			this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
			this.pointer.y = -((e.clientY - 56) / (window.innerHeight - 56)) * 2 + 1;

			this.raycaster.setFromCamera(this.pointer, this.camera);
			let intersects = this.raycaster.intersectObject(this.dummy);
			if (intersects.length > 0) {
				let { x, y } = intersects[0].point;
				this.fboMaterial.uniforms.uMouse.value = new THREE.Vector2(x, y);
				this.ball.position.set(x, y, 0);
			}
		});
	}

	setUpSettings() {
		this.gui = new GUI();
		this.controllers = {}; // Store controllers for later access

		// setupCameraGUI(this.camera, this.controls, this.gui);

		const particleFolder = this.gui.addFolder('Particle Controls');

		// Store controller references when creating them
		this.controllers.mouseForce = particleFolder
			.add(this.settings, 'mouseForce', 0, 0.5, 0.01)
			.onChange((value) => {
				this.fboMaterial.uniforms.uMouseForce.value = value;
			});

		this.controllers.circularForce = particleFolder
			.add(this.settings, 'circularForce', 0, 2, 0.1)
			.onChange((value) => {
				this.fboMaterial.uniforms.uCircularForce.value = value;
			});

		this.controllers.rotationSpeed = particleFolder
			.add(this.settings, 'rotationSpeed', 0, 1, 0.01)
			.onChange((value) => {
				this.fboMaterial.uniforms.uRotationSpeed.value = value;
			});

		this.controllers.targetRadius = particleFolder
			.add(this.settings, 'targetRadius', 0.0, 3, 0.1)
			.onChange((value) => {
				this.fboMaterial.uniforms.uTargetRadius.value = value;
			});

		this.controllers.noiseStrength = particleFolder
			.add(this.settings, 'noiseStrength', 0, 0.02, 0.001)
			.onChange((value) => {
				this.fboMaterial.uniforms.uNoiseStrength.value = value;
			});

		// Add animation button
		const animationFolder = this.gui.addFolder('Animation');
		animationFolder
			.add(
				{
					animate: () => {
						if (this.settings.isAnimating) return;
						this.settings.isAnimating = true;

						const targetState = this.isFirstState
							? this.settingsStates.second
							: this.settingsStates.first;

						gsap.to(this.settings, {
							duration: 2,
							mouseForce: targetState.mouseForce,
							circularForce: targetState.circularForce,
							rotationSpeed: targetState.rotationSpeed,
							targetRadius: targetState.targetRadius,
							noiseStrength: targetState.noiseStrength,
							ease: 'power2.inOut',
							onUpdate: () => {
								// Update uniforms
								this.fboMaterial.uniforms.uMouseForce.value = this.settings.mouseForce;
								this.fboMaterial.uniforms.uCircularForce.value = this.settings.circularForce;
								this.fboMaterial.uniforms.uRotationSpeed.value = this.settings.rotationSpeed;
								this.fboMaterial.uniforms.uTargetRadius.value = this.settings.targetRadius;
								this.fboMaterial.uniforms.uNoiseStrength.value = this.settings.noiseStrength;

								// Update individual controllers
								this.controllers.mouseForce.updateDisplay();
								this.controllers.circularForce.updateDisplay();
								this.controllers.rotationSpeed.updateDisplay();
								this.controllers.targetRadius.updateDisplay();
								this.controllers.noiseStrength.updateDisplay();
							},
							onComplete: () => {
								this.isFirstState = !this.isFirstState;
								this.settings.isAnimating = false;
							}
						});
					}
				},
				'animate'
			)
			.name('Toggle Animation');

		// Initialize state
		this.isFirstState = true;
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this));
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

	setupFBO() {
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
				let index = (i + j * this.size) * 4;
				let theta = Math.random() * Math.PI * 2;
				let r = 0.5 + 0.5 * Math.random();
				this.data[index + 0] = r * Math.cos(theta);
				this.data[index + 1] = r * Math.sin(theta);
				this.data[index + 2] = 1;
				this.data[index + 3] = 1;
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

		this.settings = {
			progress: 0,
			bloomStrength: 1.15,
			bloomRadius: 1,
			bloomThreshold: 0.66,
			afterimageStrength: 0.1,
			mouseForce: 0.1, // Changed to match second state
			circularForce: 2.0, // Changed to match second state
			rotationSpeed: 0.2, // Changed to match second state
			targetRadius: 2.1, // Changed to match second state
			noiseStrength: 0.003, // Changed to match second state
			isAnimating: false
		};

		// Switch first and second states
		this.settingsStates = {
			first: {
				mouseForce: 0.1,
				circularForce: 2.0,
				rotationSpeed: 0.2,
				targetRadius: 2.1,
				noiseStrength: 0.002
			},
			second: {
				mouseForce: 0.1,
				circularForce: 0,
				rotationSpeed: 1.0,
				targetRadius: 0,
				noiseStrength: 0.02
			}
		};

		this.fboMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uPositions: { value: this.fboTexture },
				uInfo: { value: null },
				uMouse: { value: new THREE.Vector2(0, 0) },
				time: { value: 0 },
				uMouseForce: { value: this.settings.mouseForce },
				uCircularForce: { value: this.settings.circularForce },
				uRotationSpeed: { value: this.settings.rotationSpeed },
				uTargetRadius: { value: this.settings.targetRadius },
				uNoiseStrength: { value: this.settings.noiseStrength }
			},
			vertexShader: simVertex,
			fragmentShader: simFragment
		});

		this.infoarray = new Float32Array(this.size * this.size * 4);

		for (let i = 0; i < this.size; i++) {
			for (let j = 0; j < this.size; j++) {
				let index = (i + j * this.size) * 4;
				this.infoarray[index + 0] = 0.5 + Math.random();
				this.infoarray[index + 1] = 0.5 + Math.random();
				this.infoarray[index + 2] = 1;
				this.infoarray[index + 3] = 1;
			}
		}

		this.info = new THREE.DataTexture(
			this.infoarray,
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

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
		this.composer.setSize(this.width, this.height);
	}

	addObjects() {
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: { value: 0 },
				uPositions: { value: null },
				resolution: { value: new THREE.Vector4() }
			},
			// wireframe: true,
			transparent: true,
			vertexShader: vertex,
			fragmentShader: fragment
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
		this.scene.add(this.points);
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		this.material.uniforms.time.value = this.time;
		this.fboMaterial.uniforms.time.value = this.time;
		requestAnimationFrame(this.render.bind(this));

		this.fboMaterial.uniforms.uPositions.value = this.fbo1.texture;
		this.material.uniforms.uPositions.value = this.fbo.texture;

		this.renderer.setRenderTarget(this.fbo);
		this.renderer.render(this.fboScene, this.fboCamera);
		this.renderer.setRenderTarget(null);

		this.composer.render();

		// swap render targets
		let temp = this.fbo;
		this.fbo = this.fbo1;
		this.fbo1 = temp;

		// this.renderer.setRenderTarget(null);
		// this.renderer.render(this.fboScene, this.fboCamera);
	}

	stop() {
		this.isPlaying = false;
		this.gui.destroy();
	}
}

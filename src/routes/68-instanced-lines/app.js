import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import gsap from 'gsap';

// Add shader imports
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import mouseVertexShader from './shaders/mouseVertex.glsl';
import mouseFragmentShader from './shaders/mouseFragment.glsl';
import postprocessFragmentShader from './shaders/postprocess.glsl';
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

		this.mouse = new THREE.Vector2(0, 0);
		this.previousMouse = new THREE.Vector2(0, 0);
		this.lastMouse = new THREE.Vector2(0, 0);

		// Create camera that fits exactly to the screen
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
		this.camera.position.set(0, 0, 1);
		this.camera.lookAt(0, 0, 0);

		// Create controls but disable them by default
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enabled = false; // Disable orbit controls
		this.controls.enableDamping = true;

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

	setupEvents() {
		window.addEventListener('mousemove', this.onMouseMove.bind(this));
	}

	onMouseMove(event) {
		// Get mouse position relative to the container
		const rect = this.renderer.domElement.getBoundingClientRect();

		// Calculate normalized UV coordinates (0 to 1)
		const x = (event.clientX - rect.left) / rect.width;
		const y = (event.clientY - rect.top) / rect.height;

		// Set mouse position in UV space directly
		this.mouse.x = x;
		this.mouse.y = 1 - y; // Invert Y to match WebGL coordinates
	}

	resize() {
		if (!this.resizeListener) {
			window.addEventListener('resize', this.resize.bind(this));
			this.resizeListener = true;
		}

		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);

		// Update orthographic camera to maintain aspect ratio
		const aspectRatio = this.width / this.height;
		if (aspectRatio > 1) {
			// Wider than tall
			this.camera.left = -aspectRatio;
			this.camera.right = aspectRatio;
			this.camera.top = 1;
			this.camera.bottom = -1;
		} else {
			// Taller than wide
			this.camera.left = -1;
			this.camera.right = 1;
			this.camera.top = 1 / aspectRatio;
			this.camera.bottom = -1 / aspectRatio;
		}
		this.camera.updateProjectionMatrix();

		// Resize render targets
		if (this.renderTarget) {
			this.renderTarget.dispose();
			this.renderTarget = this.createRenderTarget();
		}
		if (this.renderTarget2) {
			this.renderTarget2.dispose();
			this.renderTarget2 = this.createRenderTarget();
		}
		// Update material uniforms with new resolution
		if (this.material) {
			this.material.uniforms.uResolution.value.set(this.width, this.height);
			this.material.uniforms.uAspect.value = this.width / this.height;
		}

		// Update mouse material uniforms
		if (this.mouseMaterial) {
			this.mouseMaterial.uniforms.uResolution.value.set(
				this.width,
				this.height
			);
		}
	}

	createRenderTarget() {
		return new THREE.WebGLRenderTarget(this.width, this.height, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
	}

	setupLights() {
		const ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
		directionalLight.position.set(1, 1, 1);
		this.scene.add(directionalLight);
	}

	addObjects() {
		const textureLoader = new THREE.TextureLoader();
		this.texture = textureLoader.load(
			'./src/routes/68-instanced-lines/instanced-lines-4.png',
			(texture) => {
				// Update aspect ratio once the texture is loaded
				const textureAspect = texture.image.width / texture.image.height;
				if (this.material) {
					this.material.uniforms.uTextureAspect = { value: textureAspect };
				}
			}
		);

		// Create render targets for the mouse trail
		this.renderTarget = this.createRenderTarget();
		this.renderTarget2 = this.createRenderTarget();

		// --- First pass: main scene as before, but render to a target ---
		this.firstPassRenderTarget = this.createRenderTarget();

		// --- Second pass: fullscreen quad with postprocess shader ---
		this.postprocessMaterial = new THREE.ShaderMaterial({
			vertexShader, // reuse the same vertex shader
			fragmentShader: postprocessFragmentShader,
			uniforms: {
				uTexture: { value: this.firstPassRenderTarget.texture }, // from first pass
				uDisplacementTexture: { value: this.texture }, // original loaded texture
				uTrailTexture: { value: this.renderTarget.texture } // mouse trail
			}
		});
		this.postprocessGeometry = new THREE.PlaneGeometry(2, 2);
		this.postprocessMesh = new THREE.Mesh(
			this.postprocessGeometry,
			this.postprocessMaterial
		);
		this.postprocessScene = new THREE.Scene();
		this.postprocessScene.add(this.postprocessMesh);

		// Create the scene for the mouse trail
		this.createMouseCanvas();

		// Main scene material
		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			side: THREE.DoubleSide,
			uniforms: {
				uTexture: { value: this.texture },
				uTrailTexture: { value: this.renderTarget.texture },
				uResolution: { value: new THREE.Vector2(this.width, this.height) },
				uMousePosition: { value: new THREE.Vector2(0, 0) },
				uTime: { value: 0 },
				uAspect: { value: this.width / this.height },
				uTextureAspect: { value: 1.0 },
				uTextureScale: { value: 1.0 },
				uBlurStrength: { value: 10.0 }
			}
		});

		// Create a plane that perfectly fits the view
		const aspectRatio = this.width / this.height;
		let planeWidth, planeHeight;

		if (aspectRatio > 1) {
			// Wider than tall
			planeWidth = aspectRatio * 2;
			planeHeight = 2;
		} else {
			// Taller than wide
			planeWidth = 2;
			planeHeight = 2 / aspectRatio;
		}

		this.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.mesh.position.set(0, 0, 0);
		this.scene.add(this.mesh);
	}

	createMouseCanvas() {
		// Create a separate scene for the mouse trail
		this.mouseScene = new THREE.Scene();

		// Create a camera for the mouse trail scene - simple orthographic to match UV space
		this.mouseCamera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 1);

		// Create a material for the mouse trail
		this.mouseMaterial = new THREE.ShaderMaterial({
			vertexShader: mouseVertexShader,
			fragmentShader: mouseFragmentShader,
			uniforms: {
				uMousePosition: { value: new THREE.Vector2(0, 0) },
				uPreviousMousePosition: { value: new THREE.Vector2(0, 0) },
				uTrailTexture: { value: null },
				uResolution: { value: new THREE.Vector2(this.width, this.height) },
				uMouseRadius: { value: 15.0 }
			}
		});

		// Create a mesh for the mouse trail - use a full screen quad in UV space
		const planeGeometry = new THREE.PlaneGeometry(1, 1);
		this.mouseMesh = new THREE.Mesh(planeGeometry, this.mouseMaterial);
		this.mouseMesh.position.set(0.5, 0.5, 0); // Center in UV space (0-1)
		this.mouseScene.add(this.mouseMesh);
	}

	setUpSettings() {
		this.pane = new Pane();
		document.querySelector('.tp-dfwv').style.zIndex = 1000;

		// Settings for mouse trail
		const mouseFolder = this.pane.addFolder({
			title: 'Mouse Trail',
			expanded: true
		});

		mouseFolder.addBinding(this.mouseMaterial.uniforms.uMouseRadius, 'value', {
			label: 'Radius',
			min: 5.0,
			max: 50.0,
			step: 1.0
		});

		// Trail decay settings
		this.settings = {
			trailDecay: 0.96,
			trailStrength: 0.5, // Reduced from 0.7 to 0.5
			maxDisplacement: 0.1,
			blurStrength: 20.0,
			maxIntensity: 0.5, // New setting to control max intensity
			textureScale: 1.0 // Texture scaling factor
		};

		// Add texture controls
		const textureFolder = this.pane.addFolder({
			title: 'Texture Settings',
			expanded: true
		});

		textureFolder
			.addBinding(this.settings, 'textureScale', {
				label: 'Scale',
				min: 0.5,
				max: 2.0,
				step: 0.1
			})
			.on('change', ({ value }) => {
				// Update the texture scale uniform
				if (this.material && this.material.uniforms.uTextureScale) {
					this.material.uniforms.uTextureScale.value = value;
				}
			});
		// Initialize uniforms from settings
		if (this.material) {
			this.material.uniforms.uTextureScale = {
				value: this.settings.textureScale
			};
			this.material.uniforms.uBlurStrength = {
				value: this.settings.blurStrength
			};
		}

		mouseFolder
			.addBinding(this.settings, 'trailDecay', {
				label: 'Trail Decay',
				min: 0.8,
				max: 0.999,
				step: 0.001
			})
			.on('change', ({ value }) => {
				// Update the decay in the shader
				const shaderCode = this.mouseMaterial.fragmentShader;
				const updatedShader = shaderCode.replace(
					/color \*= ([\d.]+);/,
					`color *= ${value};`
				);
				this.mouseMaterial.fragmentShader = updatedShader;
				this.mouseMaterial.needsUpdate = true;
			});

		mouseFolder
			.addBinding(this.settings, 'trailStrength', {
				label: 'Trail Strength',
				min: 0.1,
				max: 2.0,
				step: 0.1
			})
			.on('change', ({ value }) => {
				// Update the strength in the shader
				const shaderCode = this.mouseMaterial.fragmentShader;
				const updatedShader = shaderCode.replace(
					/strength \* ([\d.]+)(?=\))/,
					`strength * ${value}`
				);
				this.mouseMaterial.fragmentShader = updatedShader;
				this.mouseMaterial.needsUpdate = true;
			});

		mouseFolder
			.addBinding(this.settings, 'maxIntensity', {
				label: 'Max Intensity',
				min: 0.2,
				max: 1.0,
				step: 0.05
			})
			.on('change', ({ value }) => {
				// Update the max intensity in the shader
				const shaderCode = this.mouseMaterial.fragmentShader;
				const updatedShader = shaderCode.replace(
					/float maxIntensity = ([\d.]+);/,
					`float maxIntensity = ${value};`
				);
				this.mouseMaterial.fragmentShader = updatedShader;
				this.mouseMaterial.needsUpdate = true;
			});

		// Effect settings
		const effectFolder = this.pane.addFolder({
			title: 'Effect Settings',
			expanded: true
		});

		effectFolder
			.addBinding(this.settings, 'maxDisplacement', {
				label: 'Max Displacement',
				min: 0.01,
				max: 0.5,
				step: 0.01
			})
			.on('change', ({ value }) => {
				const fragmentShader = this.material.fragmentShader;
				const updatedShader = fragmentShader.replace(
					/float maxDisplacement = ([\d.]+);/,
					`float maxDisplacement = ${value};`
				);
				this.material.fragmentShader = updatedShader;
				this.material.needsUpdate = true;
			});
		effectFolder
			.addBinding(this.settings, 'blurStrength', {
				label: 'Blur Strength',
				min: 1.0,
				max: 20.0,
				step: 0.5
			})
			.on('change', ({ value }) => {
				// Update blur strength directly in the uniform instead of recompiling the shader
				if (this.material && this.material.uniforms) {
					// Create blur strength uniform if it doesn't exist
					if (!this.material.uniforms.uBlurStrength) {
						this.material.uniforms.uBlurStrength = { value: value };
					} else {
						this.material.uniforms.uBlurStrength.value = value;
					}
				}
			});

		// Add clear button
		mouseFolder.addButton({ title: 'Clear Trail' }).on('click', () => {
			this.clearTrail();
		});
		// Disabled camera pane since we're using orthographic camera with fixed position
		// setupCameraPane({
		// 	camera: this.camera,
		// 	pane: this.pane,
		// 	controls: this.controls,
		// 	scene: this.scene
		// });
	}

	clearTrail() {
		// Create a clear scene
		const clearScene = new THREE.Scene();
		const clearMaterial = new THREE.MeshBasicMaterial({
			color: 0x000000,
			transparent: true,
			opacity: 0
		});
		const clearMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(2, 2),
			clearMaterial
		);
		clearScene.add(clearMesh);

		// Clear both render targets
		this.renderer.setRenderTarget(this.renderTarget);
		this.renderer.render(clearScene, this.mouseCamera);
		this.renderer.setRenderTarget(this.renderTarget2);
		this.renderer.render(clearScene, this.mouseCamera);
		this.renderer.setRenderTarget(null);
	}

	render() {
		if (!this.isPlaying) return;
		this.time = this.clock.getElapsedTime();
		this.material.uniforms.uTime.value = this.time;

		// Initialize lastMouse if it's at the initial zero value
		if (
			this.lastMouse.x === 0 &&
			this.lastMouse.y === 0 &&
			(this.mouse.x !== 0 || this.mouse.y !== 0)
		) {
			this.lastMouse.copy(this.mouse);
			this.previousMouse.copy(this.mouse);
		}

		// Check if mouse has moved significantly (avoids tiny movements causing artifacts)
		const mouseDelta = this.mouse.distanceTo(this.lastMouse);
		if (mouseDelta > 0.001) {
			// Update previous mouse position
			this.previousMouse.copy(this.lastMouse);

			// Set current trail texture
			this.mouseMaterial.uniforms.uTrailTexture.value =
				this.renderTarget.texture;

			// Update mouse uniforms
			this.mouseMaterial.uniforms.uMousePosition.value.copy(this.mouse);
			this.mouseMaterial.uniforms.uPreviousMousePosition.value.copy(
				this.previousMouse
			);

			// Render the mouse trail to renderTarget2
			this.renderer.setRenderTarget(this.renderTarget2);
			this.renderer.render(this.mouseScene, this.mouseCamera);
			this.renderer.setRenderTarget(null);

			// Swap the render targets
			const temp = this.renderTarget;
			this.renderTarget = this.renderTarget2;
			this.renderTarget2 = temp;

			// Update the main material with the new trail texture
			this.material.uniforms.uTrailTexture.value = this.renderTarget.texture;

			// Update last mouse position
			this.lastMouse.copy(this.mouse);
		} else {
			// Apply decay even when mouse isn't moving
			// This helps prevent excessive build-up in one spot
			this.mouseMaterial.uniforms.uTrailTexture.value =
				this.renderTarget.texture;
			this.mouseMaterial.uniforms.uMousePosition.value.set(-100, -100); // Off-screen
			this.mouseMaterial.uniforms.uPreviousMousePosition.value.set(-100, -100); // Off-screen

			// Render with decay-only to renderTarget2
			this.renderer.setRenderTarget(this.renderTarget2);
			this.renderer.render(this.mouseScene, this.mouseCamera);
			this.renderer.setRenderTarget(null);

			// Swap the render targets
			const temp = this.renderTarget;
			this.renderTarget = this.renderTarget2;
			this.renderTarget2 = temp;

			// Update the main material with the new trail texture
			this.material.uniforms.uTrailTexture.value = this.renderTarget.texture;
		}

		// --- First pass: render main scene to render target ---
		this.renderer.setRenderTarget(this.firstPassRenderTarget);
		this.renderer.render(this.scene, this.camera);
		this.renderer.setRenderTarget(null);

		// --- Second pass: render postprocess quad to screen ---
		this.renderer.render(this.postprocessScene, this.camera);

		requestAnimationFrame(this.render.bind(this));
	}

	stop() {
		this.isPlaying = false;
		this.renderer.dispose();
		this.pane.dispose();

		// Clean up event listeners
		window.removeEventListener('mousemove', this.onMouseMove.bind(this));
		window.removeEventListener('resize', this.resize.bind(this));

		// Dispose of render targets
		if (this.renderTarget) this.renderTarget.dispose();
		if (this.renderTarget2) this.renderTarget2.dispose();
	}
}

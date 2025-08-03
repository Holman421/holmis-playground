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
import { on } from 'svelte/events';

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

		let frustumSize = 5;
		let aspect = this.width / this.height;
		this.camera = new THREE.OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			-1000,
			1000
		);

		// this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 1000);
		// this.camera.position.set(0, 0, 3);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;

		this.doTheLog = true;

		this.isPlaying = true;

		// Create settings first
		this.settings = {
			text: {
				content: 'Holmis playground',
				fontSize: 0.5,
				fillColor: '#ffcc00',
				fillOpacity: 1.0,
				finalColor: '#ffffff'
			},
			stroke: {
				color: '#ffcc00',
				opacity: 1.0,
				width: 0.002,
				firstOutlineColor: '#ffffff'
			},
			wave: {
				amplitude: 0.05,
				frequency: 0.2
			},
			debug: {
				showBoundingBox: true,
				showCharacterBoxes: true
			},
			progress: {
				1: 0,
				2: 0,
				3: 0,
				4: 0
			},
			animation: {
				duration: 1.75,
				delay: 1.55
			}
		};

		this.timeline = null; // Add this line to track the animation

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
		this.text.font = './fonts/Audiowide.woff';
		this.text.finalTextColor = this.settings.text.finalColor;

		// Set initial progress values - wait for text to be ready
		this.text.sync(() => {
			this.text.progress1 = this.settings.progress[1];
			this.text.progress2 = this.settings.progress[2];
			this.text.progress3 = this.settings.progress[3];
			this.text.progress4 = this.settings.progress[4];
		});

		// Also set initial uniforms for the background material
		this.material.uniforms.uProgress1.value = this.settings.progress[1];
		this.material.uniforms.uProgress2.value = this.settings.progress[2];
		this.material.uniforms.uProgress3.value = this.settings.progress[3];
		this.material.uniforms.uProgress4.value = this.settings.progress[4];

		// Set stroke properties using Troika's built-in properties
		this.text.strokeWidth = this.settings.stroke.width;
		this.text.strokeColor = new THREE.Color(this.settings.stroke.color);
		this.text.strokeOpacity = this.settings.stroke.opacity;
		this.text.firstOutlineColor = this.settings.stroke.firstOutlineColor;

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
				uProgress1: { value: 0 },
				uProgress2: { value: 0 },
				uProgress3: { value: 0 },
				uProgress4: { value: 0 }
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
		document.querySelector('.tp-dfwv').style.zIndex = 1000;
		this.progressBindings = {};

		setupCameraPane({
			pane: this.pane,
			camera: this.camera,
			controls: this.controls,
			scene: this.scene,
			isActive: false
		});

		const textFolder = this.pane.addFolder({ title: 'Text' });

		// Add text content and style controls
		textFolder
			.addBinding(this.settings.text, 'content', {
				label: 'Text'
			})
			.on('change', (ev) => {
				if (this.text) {
					this.text.text = ev.value;
				}
			});

		textFolder
			.addBinding(this.settings.text, 'fillColor', {
				label: 'Fill Color',
				view: 'color'
			})
			.on('change', (ev) => {
				if (this.text) {
					this.text.color = ev.value;
				}
			});

		textFolder
			.addBinding(this.settings.text, 'finalColor', {
				label: 'Final Color',
				view: 'color'
			})
			.on('change', (ev) => {
				if (this.text) {
					this.text.finalTextColor = ev.value;
				}
			});

		textFolder
			.addBinding(this.settings.stroke, 'color', {
				label: 'Stroke Color',
				view: 'color'
			})
			.on('change', (ev) => {
				if (this.text) {
					this.text.strokeColor = new THREE.Color(ev.value);
				}
			});

		textFolder
			.addBinding(this.settings.stroke, 'firstOutlineColor', {
				label: 'First Outline Color',
				view: 'color'
			})
			.on('change', (ev) => {
				if (this.text) {
					this.text.firstOutlineColor = ev.value;
				}
			});

		textFolder
			.addBinding(this.settings.stroke, 'width', {
				label: 'Stroke Width',
				min: 0,
				max: 0.05,
				step: 0.001
			})
			.on('change', (ev) => {
				if (this.text) {
					this.text.strokeWidth = ev.value;
				}
			});

		// Store each binding
		this.progressBindings[1] = textFolder
			.addBinding(this.settings.progress, '1', {
				label: 'Progress 1',
				min: 0,
				max: 1,
				step: 0.01
			})
			.on('change', (ev) => {
				if (this.text) this.text.progress1 = ev.value;
				this.material.uniforms.uProgress1.value = ev.value;
			});

		this.progressBindings[2] = textFolder
			.addBinding(this.settings.progress, '2', {
				label: 'Progress 2',
				min: 0,
				max: 1,
				step: 0.01
			})
			.on('change', (ev) => {
				if (this.text) this.text.progress2 = ev.value;
				this.material.uniforms.uProgress2.value = ev.value;
			});

		this.progressBindings[3] = textFolder
			.addBinding(this.settings.progress, '3', {
				label: 'Progress 3',
				min: 0,
				max: 1,
				step: 0.01
			})
			.on('change', (ev) => {
				if (this.text) this.text.progress3 = ev.value;
				this.material.uniforms.uProgress3.value = ev.value;
			});

		this.progressBindings[4] = textFolder
			.addBinding(this.settings.progress, '4', {
				label: 'Progress 4',
				min: 0,
				max: 1,
				step: 0.01
			})
			.on('change', (ev) => {
				if (this.text) this.text.progress4 = ev.value;
				this.material.uniforms.uProgress4.value = ev.value;
			});

		// Add animation settings folder
		const animationFolder = this.pane.addFolder({ title: 'Animation' });

		animationFolder.addBinding(this.settings.animation, 'duration', {
			label: 'Duration',
			min: 0.1,
			max: 5.0,
			step: 0.05
		});

		animationFolder.addBinding(this.settings.animation, 'delay', {
			label: 'Delay Offset',
			min: 0.1,
			max: 5.0,
			step: 0.05
		});

		textFolder
			.addButton({
				title: 'Animate'
			})
			.on('click', () => {
				// Kill existing timeline if it exists
				if (this.timeline) {
					this.timeline.kill();
				}

				// Reset all progress values
				[1, 2, 3, 4].forEach((i) => {
					this.settings.progress[i] = 0;
					this.material.uniforms[`uProgress${i}`].value = 0;
					if (this.text) this.text[`progress${i}`] = 0;
				});

				// Create and store new timeline
				this.timeline = gsap.timeline({
					defaults: {
						duration: this.settings.animation.duration
					}
				});

				const delay = `-=${this.settings.animation.delay}`;

				this.timeline
					.to(this.settings.progress, {
						1: 1,
						onUpdate: () => {
							if (this.text) this.text.progress1 = this.settings.progress[1];
							this.material.uniforms.uProgress1.value =
								this.settings.progress[1];
							this.progressBindings[1].refresh();
						}
					})
					.to(
						this.settings.progress,
						{
							2: 1,
							onUpdate: () => {
								if (this.text) this.text.progress2 = this.settings.progress[2];
								this.material.uniforms.uProgress2.value =
									this.settings.progress[2];
								this.progressBindings[2].refresh();
							}
						},
						delay
					)
					.to(
						this.settings.progress,
						{
							3: 1,
							onUpdate: () => {
								if (this.text) this.text.progress3 = this.settings.progress[3];
								this.material.uniforms.uProgress3.value =
									this.settings.progress[3];
								this.progressBindings[3].refresh();
							}
						},
						delay
					)
					.to(
						this.settings.progress,
						{
							4: 1,
							onUpdate: () => {
								if (this.text) this.text.progress4 = this.settings.progress[4];
								this.material.uniforms.uProgress4.value =
									this.settings.progress[4];
								this.progressBindings[4].refresh();
							}
						},
						delay
					);
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
		this.renderer.dispose();
		this.pane.dispose();
	}
}

import * as THREE from 'three/webgpu';
import { pass, mrt, output, emissive } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane, setupLightPane } from '$lib/utils/Tweakpane/utils';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import {
	createRecordingControls,
	type RecordingControls
} from '$lib/utils/recordingControls';
import {
	dot,
	float,
	floor,
	Fn,
	fract,
	mix,
	vec3,
	uniform,
	positionLocal,
	If,
	select,
	Discard,
	greaterThan,
	smoothstep,
	texture,
	screenUV,
	pow,
	clamp,
	normalize,
	instancedArray
} from 'three/tsl';
import gsap from 'gsap';

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
	material!: THREE.MeshStandardNodeMaterial;
	geometry!: THREE.BoxGeometry;
	mesh!: THREE.Mesh;
	group!: THREE.Group;
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	pointLight!: THREE.PointLight;
	recordingControls!: RecordingControls;
	cycleTimeline!: gsap.core.Timeline;
	text!: THREE.Mesh;
	textGeometry!: TextGeometry;
	textMaterial!: THREE.MeshStandardMaterial;
	font!: any;
	textOptions = {
		currentText: 'Frontend Developer',
		texts: [
			'Frontend Developer',
			'WebGPU Explorer',
			'Creative Coder',
			'Three.js Specialist'
		],
		currentIndex: 0,
		fontSize: 0.3,
		textColor: '#29c4ce',
		padding: 0.25 // Extra space around text
	};
	bloomOptions = {
		color: '#29c4ce', // Cyan color
		intensity: 3.0
	};
	uniforms: {
		progress: any;
		frequency: any;
		amplitude: any;
		bloomStrength: any;
		bloomRadius: any;
		bloomThreshold: any;
		bloomColor: any;
		bloomIntensity: any;
	} = {
		progress: null,
		frequency: null,
		amplitude: null,
		bloomStrength: null,
		bloomRadius: null,
		bloomThreshold: null,
		bloomColor: null,
		bloomIntensity: null
	};

	// Bloom effect properties
	postProcessing!: THREE.PostProcessing;
	bloomPass: any;

	constructor(options: SketchOptions) {
		this.scene = new THREE.Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new THREE.WebGPURenderer();
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(new THREE.Color(0x000000), 1);
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
		this.setupLights();
		this.createGroup();
		this.createMesh();
		this.createText();
		this.setupBloom();
		this.resize();
		this.setUpSettings();
		this.startCycleAnimation();
		this.init();
	}

	async init() {
		await this.renderer.init();

		// Initialize recording controls after renderer is ready
		// this.recordingControls = createRecordingControls({
		// 	canvas: this.renderer.domElement,
		// 	container: this.container,
		// 	position: 'top-left'
		// });

		this.render();
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
		this.scene.add(this.ambientLight);

		this.pointLight = new THREE.PointLight(0xffffff, 15);
		this.pointLight.position.set(-1.6, 0.7, 1.7);
		this.scene.add(this.pointLight);
	}

	setupBloom() {
		// Create bloom uniforms for the controls
		const bloomStrengthUniform = uniform(0.5);
		const bloomRadiusUniform = uniform(0.5);
		const bloomThresholdUniform = uniform(0.85);
		const bloomColorUniform = uniform(new THREE.Color('#29c4ce')); // Cyan color
		const bloomIntensityUniform = uniform(3.0);

		this.uniforms.bloomStrength = bloomStrengthUniform;
		this.uniforms.bloomRadius = bloomRadiusUniform;
		this.uniforms.bloomThreshold = bloomThresholdUniform;
		this.uniforms.bloomColor = bloomColorUniform;
		this.uniforms.bloomIntensity = bloomIntensityUniform;

		// Create scene pass with MRT (Multiple Render Targets) for output and emissive
		const scenePass = pass(this.scene, this.camera);
		scenePass.setMRT(
			mrt({
				output,
				emissive
			})
		);

		// Get the output and emissive textures
		const outputPass = scenePass.getTextureNode();
		const emissivePass = scenePass.getTextureNode('emissive');

		// Create bloom pass using the emissive channel
		this.bloomPass = bloom(
			emissivePass,
			bloomStrengthUniform,
			bloomRadiusUniform
		);

		// Initialize post-processing
		this.postProcessing = new THREE.PostProcessing(this.renderer);
		this.postProcessing.outputNode = outputPass.add(this.bloomPass);
	}

	createGroup() {
		this.group = new THREE.Group();
		this.group.position.set(10, 0, 0); // Start off-screen
		this.scene.add(this.group);
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

	createText() {
		const loader = new FontLoader();
		loader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
			this.font = font;
			this.updateText();

			const newText = new TextGeometry('I am a', {
				font: this.font,
				size: this.textOptions.fontSize,
				depth: 0.05,
				curveSegments: 12,
				bevelEnabled: true,
				bevelThickness: 0.02,
				bevelSize: 0.01,
				bevelOffset: 0,
				bevelSegments: 5
			});

			const newTextMaterial = new THREE.MeshStandardMaterial({
				color: this.textOptions.textColor,
				metalness: 0.1,
				roughness: 0.3,
				transparent: true,
				opacity: 1
			});

			const newTextMesh = new THREE.Mesh(newText, newTextMaterial);
			newTextMesh.position.set(-3, -0.2, 0);
			this.scene.add(newTextMesh);
		});
	}

	updateText() {
		if (!this.font) return;

		// Remove existing text
		if (this.text) {
			this.group.remove(this.text);
			if (this.textGeometry) this.textGeometry.dispose();
			if (this.textMaterial) this.textMaterial.dispose();
		}

		// Create new text geometry
		this.textGeometry = new TextGeometry(this.textOptions.currentText, {
			font: this.font,
			size: this.textOptions.fontSize,
			depth: 0.05,
			curveSegments: 12,
			bevelEnabled: true,
			bevelThickness: 0.02,
			bevelSize: 0.01,
			bevelOffset: 0,
			bevelSegments: 5
		});

		// Center the text
		this.textGeometry.computeBoundingBox();
		const textWidth =
			this.textGeometry.boundingBox!.max.x -
			this.textGeometry.boundingBox!.min.x;
		const textHeight =
			this.textGeometry.boundingBox!.max.y -
			this.textGeometry.boundingBox!.min.y;
		const textDepth =
			this.textGeometry.boundingBox!.max.z -
			this.textGeometry.boundingBox!.min.z;

		const centerOffsetX = -0.5 * textWidth;
		const centerOffsetY = -0.5 * textHeight;
		const centerOffsetZ = -0.5 * textDepth;

		// Update box geometry to fit text with padding
		const boxWidth = textWidth + this.textOptions.padding * 2;
		const boxHeight = Math.max(textHeight + this.textOptions.padding * 2, 1); // Minimum height of 1
		const boxDepth = Math.max(textDepth + this.textOptions.padding * 2, 1); // Minimum depth of 1

		// Remove old geometry and create new one
		if (this.geometry) this.geometry.dispose();
		this.geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
		this.mesh.geometry = this.geometry;

		// Create material
		this.textMaterial = new THREE.MeshStandardMaterial({
			color: this.textOptions.textColor,
			metalness: 0.1,
			roughness: 0.3,
			transparent: true,
			opacity: 1
		});

		// Create mesh
		this.text = new THREE.Mesh(this.textGeometry, this.textMaterial);
		this.text.position.set(centerOffsetX, centerOffsetY, centerOffsetZ); // Center inside the box
		this.group.add(this.text); // Add to group instead of scene
	}

	nextText() {
		this.textOptions.currentIndex =
			(this.textOptions.currentIndex + 1) % this.textOptions.texts.length;
		this.textOptions.currentText =
			this.textOptions.texts[this.textOptions.currentIndex];
		this.updateText();
	}

	createMesh() {
		// Start with a default box size - this will be adjusted when text is loaded
		this.geometry = new THREE.BoxGeometry(2.5, 1, 1);
		this.material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide
		});

		const frequencyUniform = uniform(2.5);
		const amplitudeUniform = uniform(1);
		const progressUniform = uniform(0);

		this.uniforms.progress = progressUniform;
		this.uniforms.frequency = frequencyUniform;
		this.uniforms.amplitude = amplitudeUniform;

		// Alternative hash
		const hash32: any = Fn(([p]: any) => {
			const p3 = fract(p.mul(0.1031));
			const dotted = p3.add(dot(p3, p3.yzx.add(33.33)));
			return fract(dotted.mul(dotted.add(dotted.yzx)))
				.mul(2.0)
				.sub(1.0);
		});

		// Gradient noise (better than value noise)
		const gradientNoise: any = Fn(([p]: any) => {
			const i = floor(p);
			const f = fract(p);

			// Quintic interpolation (smoother than cubic)
			const u = f
				.mul(f)
				.mul(f)
				.mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0));

			// Generate gradients for 8 corners
			const grad000 = hash32(i.add(vec3(0.0, 0.0, 0.0)));
			const grad100 = hash32(i.add(vec3(1.0, 0.0, 0.0)));
			const grad010 = hash32(i.add(vec3(0.0, 1.0, 0.0)));
			const grad110 = hash32(i.add(vec3(1.0, 1.0, 0.0)));
			const grad001 = hash32(i.add(vec3(0.0, 0.0, 1.0)));
			const grad101 = hash32(i.add(vec3(1.0, 0.0, 1.0)));
			const grad011 = hash32(i.add(vec3(0.0, 1.0, 1.0)));
			const grad111 = hash32(i.add(vec3(1.0, 1.0, 1.0)));

			// Compute dot products with distance vectors
			const d000 = f.sub(vec3(0.0, 0.0, 0.0));
			const d100 = f.sub(vec3(1.0, 0.0, 0.0));
			const d010 = f.sub(vec3(0.0, 1.0, 0.0));
			const d110 = f.sub(vec3(1.0, 1.0, 0.0));
			const d001 = f.sub(vec3(0.0, 0.0, 1.0));
			const d101 = f.sub(vec3(1.0, 0.0, 1.0));
			const d011 = f.sub(vec3(0.0, 1.0, 1.0));
			const d111 = f.sub(vec3(1.0, 1.0, 1.0));

			const v000 = dot(grad000, d000);
			const v100 = dot(grad100, d100);
			const v010 = dot(grad010, d010);
			const v110 = dot(grad110, d110);
			const v001 = dot(grad001, d001);
			const v101 = dot(grad101, d101);
			const v011 = dot(grad011, d011);
			const v111 = dot(grad111, d111);

			// Trilinear interpolation
			const x1 = mix(v000, v100, u.x);
			const x2 = mix(v010, v110, u.x);
			const x3 = mix(v001, v101, u.x);
			const x4 = mix(v011, v111, u.x);

			const y1 = mix(x1, x2, u.y);
			const y2 = mix(x3, x4, u.y);

			return mix(y1, y2, u.z);
		});

		// Fractal noise with multiple octaves
		const fractalNoise: any = Fn(([p]: any) => {
			let value: any = float(0.0);
			let amplitude: any = float(1.0);
			let frequency: any = float(1.0);

			// 4 octaves
			for (let i = 0; i < 4; i++) {
				value = value.add(gradientNoise(p.mul(frequency)).mul(amplitude));
				amplitude = amplitude.mul(0.5);
				frequency = frequency.mul(2.0);
			}

			return value;
		});

		const disintegrateShader = Fn(() => {
			const localPos = positionLocal.xyz;
			const scaledPos = localPos.mul(frequencyUniform);

			// Try different noise functions:

			// Option 1: Gradient noise
			const noiseValue = gradientNoise(scaledPos);

			// Option 2: Fractal noise (comment out line above, uncomment this)
			// const noiseValue = fractalNoise(scaledPos);

			const scaledNoise = noiseValue.mul(amplitudeUniform); // [0, amplitude]
			const finalNoise = scaledNoise.add(progressUniform.mul(2.0)).sub(1.0);

			const isOutOfRange = finalNoise.greaterThan(0.0);
			const cornerRadius = 0.1; // Adjust as needed
			const isCorner = finalNoise
				.lessThan(0.0)
				.and(finalNoise.greaterThan(-cornerRadius));

			const finalColor = vec3(0.05).toVar();
			const edgeColor = vec3(5.0, 2.0, 0.3).toVar(); // Very bright orange for bloom-like effect
			const bloomIntensity = float(8.0); // Much higher values for stronger glow

			If(isOutOfRange, () => {
				Discard();
			}).ElseIf(isCorner, () => {
				// Create a more intense bloom-like edge effect
				const edgeAlpha = smoothstep(-cornerRadius, 0.0, finalNoise);
				const bloomColor = edgeColor.mul(bloomIntensity);

				// Create a more gradual falloff for bloom-like effect
				const falloff = smoothstep(
					-cornerRadius * 2.0,
					-cornerRadius * 0.5,
					finalNoise
				);
				const finalBloomColor = bloomColor.mul(falloff);

				finalColor.rgb = mix(finalColor, finalBloomColor, edgeAlpha);
			});

			return finalColor;
		});

		// The correct way to assign the node to the material
		this.material.colorNode = disintegrateShader();

		// For bloom effect, we need to output bright edges to the emissive channel
		const emissiveShader = Fn(() => {
			const localPos = positionLocal.xyz;
			const scaledPos = localPos.mul(frequencyUniform);
			const noiseValue = gradientNoise(scaledPos);
			const scaledNoise = noiseValue.mul(amplitudeUniform);
			const finalNoise = scaledNoise.add(progressUniform.mul(2.0)).sub(1.0);

			const isOutOfRange = finalNoise.greaterThan(0.0);
			const cornerRadius = 0.1;
			const isCorner = finalNoise
				.lessThan(0.0)
				.and(finalNoise.greaterThan(-cornerRadius));

			const emissiveOutput = vec3(0.0).toVar();

			If(isOutOfRange, () => {
				// Don't output anything for discarded fragments
			}).ElseIf(isCorner, () => {
				// Output bright colors for bloom on edges using uniform color
				const edgeAlpha = smoothstep(-cornerRadius, 0.0, finalNoise);
				const bloomColor = this.uniforms.bloomColor.rgb.mul(
					this.uniforms.bloomIntensity
				);
				emissiveOutput.assign(bloomColor.mul(edgeAlpha));
			});

			return emissiveOutput;
		});

		this.material.emissiveNode = emissiveShader();

		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.mesh.position.set(0, 0, 0); // Reset position since group handles positioning
		this.group.add(this.mesh); // Add to group instead of scene
	}

	setUpSettings() {
		this.pane = new Pane();
		(document.querySelector('.tp-dfwv') as HTMLElement)!.style.zIndex = '1000';

		// this.pane.addBinding(this.uniforms.progress, 'value', {
		// 	min: 0,
		// 	max: 1,
		// 	step: 0.01,
		// 	label: 'DisintegrateProgress'
		// });

		// const btn = this.pane.addButton({
		// 	title: 'Animate progress'
		// });

		// btn.on('click', () => {
		// 	const animateTo = this.uniforms.progress.value <= 0.5 ? 1 : 0;
		// 	const duration = 8; // seconds
		// 	gsap.to(this.uniforms.progress, {
		// 		value: animateTo,
		// 		duration: duration,
		// 		ease: 'linear',
		// 		onUpdate: () => {
		// 			this.pane.refresh();
		// 		}
		// 	});
		// });

		this.pane.addBinding(this.uniforms.frequency, 'value', {
			min: 0,
			max: 10,
			step: 0.1,
			label: 'Frequency'
		});

		// Bloom controls
		const bloomFolder = this.pane.addFolder({
			title: 'Bloom Settings',
			expanded: true
		});

		bloomFolder.addBinding(this.bloomPass.strength, 'value', {
			min: 0,
			max: 1,
			step: 0.01,
			label: 'Bloom Strength'
		});

		// bloomFolder.addBinding(this.bloomPass.radius, 'value', {
		// 	min: 0,
		// 	max: 0.25,
		// 	step: 0.01,
		// 	label: 'Bloom Radius'
		// });

		bloomFolder
			.addBinding(this.bloomOptions, 'color', {
				label: 'Bloom Color'
			})
			.on('change', () => {
				this.uniforms.bloomColor.value.setHex(
					this.bloomOptions.color.replace('#', '0x')
				);
			});

		bloomFolder
			.addBinding(this.bloomOptions, 'intensity', {
				min: 0,
				max: 10,
				step: 0.1,
				label: 'Bloom Intensity'
			})
			.on('change', () => {
				this.uniforms.bloomIntensity.value = this.bloomOptions.intensity;
			});

		// this.pane.addBinding(this.uniforms.amplitude, 'value', {
		// 	min: 0,
		// 	max: 10,
		// 	step: 0.1,
		// 	label: 'Amplitude'
		// });

		// Text controls
		const textFolder = this.pane.addFolder({
			title: 'Text Settings',
			expanded: false
		});

		textFolder
			.addBinding(this.textOptions, 'currentText', {
				label: 'Current Text'
			})
			.on('change', () => {
				this.updateText();
			});

		textFolder
			.addBinding(this.textOptions, 'fontSize', {
				min: 0.1,
				max: 1,
				step: 0.05,
				label: 'Font Size'
			})
			.on('change', () => {
				this.updateText();
			});

		textFolder
			.addBinding(this.textOptions, 'textColor', {
				label: 'Text Color'
			})
			.on('change', () => {
				if (this.textMaterial) {
					this.textMaterial.color.set(this.textOptions.textColor);
				}
			});

		textFolder
			.addBinding(this.textOptions, 'padding', {
				min: 0.1,
				max: 1,
				step: 0.05,
				label: 'Box Padding'
			})
			.on('change', () => {
				this.updateText();
			});

		const nextTextBtn = textFolder.addButton({
			title: 'Next Text'
		});

		nextTextBtn.on('click', () => {
			this.nextText();
		});

		// setupCameraPane({
		// 	camera: this.camera,
		// 	pane: this.pane,
		// 	controls: this.controls,
		// 	scene: this.scene,
		// 	defaultOpen: false,
		// });

		// setupLightPane({
		// 	pane: this.pane,
		// 	light: this.pointLight,
		// 	name: 'Point Light',
		// 	scene: this.scene,
		// 	positionRange: { min: -15, max: 15 },
		// 	targetRange: { min: -15, max: 15 }
		// });
	}

	startCycleAnimation() {
		this.cycleTimeline = gsap.timeline({ repeat: -1 });

		this.cycleTimeline
			.to(this.group.position, {
				x: 0,
				duration: 2,
				ease: 'power4.inOut'
			})
			.to(
				this.uniforms.progress,
				{
					value: 1,
					duration: 2.5,
					ease: 'none',
					onUpdate: () => {
						this.pane.refresh();
					}
				},
				'-=0.6'
			) // Start at the same time as position animation
			.call(() => {
				// Fade out the current text
				if (this.textMaterial) {
					gsap.to(this.textMaterial, {
						opacity: 0,
						duration: 0.3,
						ease: 'power2.inOut'
					});
				}
			})
			.to({}, { duration: 0.3 }) // Wait for fade out to complete
			.call(() => {
				this.nextText(); // Change text after fade out
			})
			.set(this.group.position, { x: 10 })
			.call(() => {
				// Reset opacity for next text
				if (this.textMaterial) {
					this.textMaterial.opacity = 1;
				}
			})
			.set(this.uniforms.progress, { value: 0 });
	}

	async render() {
		if (!this.isPlaying) return;

		this.controls.update();

		// Use the PostProcessing system for bloom effect
		this.postProcessing.render();

		requestAnimationFrame(() => this.render());
	}

	stop() {
		this.isPlaying = false;
		window.removeEventListener('resize', this.resize.bind(this));
		if (this.cycleTimeline) this.cycleTimeline.kill();

		// Dispose of text resources
		if (this.text) {
			this.group.remove(this.text);
			if (this.textGeometry) this.textGeometry.dispose();
			if (this.textMaterial) this.textMaterial.dispose();
		}

		// Dispose of group
		if (this.group) {
			this.scene.remove(this.group);
		}

		// Dispose of post-processing
		if (this.postProcessing) this.postProcessing.dispose();

		this.renderer.dispose();
		if (this.pane) this.pane.dispose();
		if (this.recordingControls) this.recordingControls.destroy();
	}
}

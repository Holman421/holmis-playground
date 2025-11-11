import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane } from '$lib/utils/tweakpaneUtils/utils';
import {
	Fn,
	uniform,
	vec2,
	vec3,
	mix,
	float,
	positionLocal,
	uv,
	smoothstep,
	sin,
	cos,
	dot,
	fract,
	length,
	abs,
	step,
	clamp,
	log,
	atan2
} from 'three/tsl';
import { simplexNoise3d } from '$lib/utils/webGPU/simplexNoise3d';
import { snoise } from '$lib/utils/webGPU/simplexNoise2d';
import gsap from 'gsap';
import { PostProcessing } from 'three/webgpu';
import { pass } from 'three/tsl';
import CameraWobble from '$lib/utils/cameraWobble';

// Import ScrollTrigger dynamically to avoid SSR issues
let ScrollTrigger: any;
const scrollTriggerPromise = typeof window !== 'undefined' 
	? import('gsap/ScrollTrigger').then((module) => {
		ScrollTrigger = module.ScrollTrigger;
		gsap.registerPlugin(ScrollTrigger);
		return ScrollTrigger;
	})
	: Promise.resolve(null);

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
	geometry!: THREE.PlaneGeometry;
	mesh!: THREE.Mesh;
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	pointLight!: THREE.PointLight;
	clock: THREE.Clock;
	postProcessing!: PostProcessing;

	// Scroll progress
	scrollProgress: { value: number };
	scrollProgressUniform: any;
	scrollTriggerInstance: ScrollTrigger | null = null;

	// Gradient colors
	colors: THREE.Color[] = [];
	colorUniforms: any[] = [];
	timeUniform: any;

	// Shader uniforms
	amplitudeUniform: any;
	timeScaleUniform: any;
	colorTimeScaleUniform: any;
	deformationScaleUniform: any;
	colorScaleUniform: any;

	// SDF sphere postprocessing uniforms
	sdfSphereRadiusUniform: any;
	sdfSphereTransitionUniform: any;
	sdfWiggleAmplitudeUniform: any;
	sdfWiggleFrequencyUniform: any;
	sdfWiggleSpeedUniform: any;

	// Color schemes
	colorSchemes = {
		sunset: [
			new THREE.Color(0x66a5f9), // rgba(102,165,249,1)
			new THREE.Color(0x000000), // rgba(60,32,39,1)
			new THREE.Color(0xba5e32) // rgba(186,94,50,1)
		],
		pink: [
			new THREE.Color(0xe97c65),
			new THREE.Color(0xefd2cc),
			new THREE.Color(0xfccbc2)
		]
	};

	// Mouse wobble for camera interaction
	mouseWobbleTarget!: THREE.Vector2;
	mouseWobbleSmoothed!: THREE.Vector2;
	cameraWobble!: CameraWobble;
	wobblePosStrength: number = 0.25;
	wobbleLerp: number = 0.02;

	// Store both schemes for interpolation
	sunsetColors: THREE.Color[] = [];
	pinkColors: THREE.Color[] = [];
	sunsetColorUniforms: any[] = [];
	pinkColorUniforms: any[] = [];

	// GUI debug object for color controls
	debugColors: { [key: string]: string } = {};
	debugParams = {
		amplitude: 0.35,
		timeScale: 0.25,
		colorTimeScale: 0.9,
		deformationScale: 6.0,
		colorScale: 12.0,
		sdfSphereRadius: 0.0,
		sdfSphereTransition: 0.0, // Start at 0, will animate to 0.6
		sdfWiggleAmplitude: 0.06,
		sdfWiggleFrequency: 2.5,
		sdfWiggleSpeed: 0.2
	};

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
			35,
			this.width / this.height,
			0.01,
			1000
		);
		this.camera.position.set(-1.13, -0.1, 1.85);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.enabled = false;

		this.clock = new THREE.Clock();
		this.isPlaying = true;

		// Initialize mouse wobble
		this.mouseWobbleTarget = new THREE.Vector2(0, 0);
		this.mouseWobbleSmoothed = new THREE.Vector2(0, 0);

		// Initialize scroll progress tracking
		this.scrollProgress = { value: 0 };
		this.scrollProgressUniform = uniform(0);

		// Initialize random gradient colors
		this.initializeColors();

		this.setupLights();
		this.createMesh();
		this.resize();
		this.setUpSettings();
		this.setupCameraWobble();
		this.setupMouseListener();
		this.init();
	}

	async init() {
		await this.renderer.init();
		this.setupPostProcessing();
		
		// Setup ScrollTrigger after everything else is ready
		await this.setupScrollTrigger();
		
		// Animate sdfSphereTransition on page load
		this.animateSdfSphereTransition();
		
		this.render();
	}

	async setupScrollTrigger() {
		if (typeof window === 'undefined') return;
		
		// Wait for ScrollTrigger to be loaded
		await scrollTriggerPromise;
		if (!ScrollTrigger) return;

		this.scrollTriggerInstance = ScrollTrigger.create({
			trigger: 'body',
			start: 'top top',
			end: 'bottom bottom',
			scrub: true,
			onUpdate: (self: any) => {
				// Raw scroll progress (0 to 1)
				const rawProgress = self.progress;
				
				// Remap: No transition from 0 to 0.33, then transition from 0.33 to 1
				// When rawProgress < 0.33: colorProgress = 0
				// When rawProgress >= 0.33: colorProgress = (rawProgress - 0.33) / (1 - 0.33)
				const transitionStart = 0.75;
				const transitionEnd = 0.9;
				const colorProgress = rawProgress < transitionStart 
					? 0 
					: (rawProgress - transitionStart) / (transitionEnd - transitionStart);
				
				this.scrollProgress.value = rawProgress;
				this.scrollProgressUniform.value = colorProgress;
				
				// Update sdfSphereTransition: base animated value + (scroll progress * 2)
				this.sdfSphereTransitionUniform.value = this.debugParams.sdfSphereTransition + (rawProgress * 2);
				
				console.log('Raw:', rawProgress.toFixed(3), 'Color:', colorProgress.toFixed(3), 'Uniform:', this.scrollProgressUniform);
			}
		});
	}

	animateSdfSphereTransition() {
		gsap.to(this.debugParams, {
			sdfSphereTransition: 0.5,
			duration: 2.0,
			ease: 'power2.inOut',
			onUpdate: () => {
				this.sdfSphereTransitionUniform.value = this.debugParams.sdfSphereTransition;
			}
		});
	}

	setupCameraWobble() {
		this.cameraWobble = new CameraWobble({
			mouseWobbleTarget: this.mouseWobbleTarget,
			mouseWobbleSmoothed: this.mouseWobbleSmoothed,
			wobblePosStrength: this.wobblePosStrength,
			wobbleLerp: this.wobbleLerp,
			camera: this.camera,
			scene: this.scene,
			controls: this.controls,
			isEnabled: true,
			addTweakpane: true,
			pane: this.pane,
			wobbleXCompensation: 1.4 // Boost left side to compensate for camera angle
		});
		
		// Update the base camera frame to capture the current position
		this.cameraWobble.updateBaseCameraFrame();
	}

	setupMouseListener() {
		this.container.addEventListener('mousemove', (event: MouseEvent) => {
			const rect = this.container.getBoundingClientRect();
			const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
			this.mouseWobbleTarget.set(x, y);
		});
	}

	initializeColors() {
		// Initialize sunset colors
		const sunsetScheme = this.colorSchemes.sunset;
		for (let i = 0; i < 3; i++) {
			const color = sunsetScheme[i].clone();
			this.sunsetColors.push(color);
			this.sunsetColorUniforms.push(uniform(color));
		}

		// Initialize pink colors
		const pinkScheme = this.colorSchemes.pink;
		for (let i = 0; i < 3; i++) {
			const color = pinkScheme[i].clone();
			this.pinkColors.push(color);
			this.pinkColorUniforms.push(uniform(color));
		}

		// Set initial colors to sunset (for Tweakpane display)
		for (let i = 0; i < 3; i++) {
			this.colors.push(sunsetScheme[i].clone());
			this.colorUniforms.push(uniform(sunsetScheme[i]));
			this.debugColors[`color${i + 1}`] = '#' + sunsetScheme[i].getHexString();
		}
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
		this.scene.add(this.ambientLight);

		this.pointLight = new THREE.PointLight(0xffffff, 10);
		this.pointLight.position.set(1, 0.5, 7);
		this.scene.add(this.pointLight);
	}

	setupPostProcessing() {
		// Create postprocessing with TSL
		this.postProcessing = new PostProcessing(this.renderer);

		// Initialize SDF sphere uniforms
		this.sdfSphereRadiusUniform = uniform(this.debugParams.sdfSphereRadius);
		this.sdfSphereTransitionUniform = uniform(this.debugParams.sdfSphereTransition);
		this.sdfWiggleAmplitudeUniform = uniform(this.debugParams.sdfWiggleAmplitude);
		this.sdfWiggleFrequencyUniform = uniform(this.debugParams.sdfWiggleFrequency);
		this.sdfWiggleSpeedUniform = uniform(this.debugParams.sdfWiggleSpeed);

		// Get the scene pass
		const scenePass = pass(this.scene, this.camera);
		const sceneColor = scenePass.getTextureNode();

		// Create dot screen effect using TSL (applied first)
		const dotScreenEffect = Fn(() => {
			const uvCoord = uv();
			
			// Random noise function
			const random = Fn(([p]: [any]) => {
				const k1 = vec2(23.14069263277926, 2.665144142690225);
				return fract(cos(dot(p, k1)).mul(12345.6789));
			});

			// Sample the scene color
			const color = vec3(sceneColor);
			
			// Add noise
			const uvRandom = uvCoord.toVar();
			uvRandom.y.assign(uvRandom.y.mul(random(vec2(uvRandom.y, 0.4))));
			
			const noise = random(uvRandom).mul(0.025);
			const finalColor = color.add(noise);
			
			return vec3(finalColor);
		})();

		// Create SDF sphere mask effect using TSL (applied second)
		const sdfSphereMask = Fn(() => {
			const uvCoord = uv();
			
			// Apply noise-based distortion to UV coordinates
			const noiseInput1 = vec2(
				uvCoord.x.mul(this.sdfWiggleFrequencyUniform).add(this.timeUniform.mul(this.sdfWiggleSpeedUniform)),
				uvCoord.y.mul(this.sdfWiggleFrequencyUniform)
			).toVar();
			
			const noiseInput2 = vec2(
				uvCoord.x.mul(this.sdfWiggleFrequencyUniform),
				uvCoord.y.mul(this.sdfWiggleFrequencyUniform).add(this.timeUniform.mul(this.sdfWiggleSpeedUniform))
			).toVar();
			
			// Sample noise for X and Y distortion
			const noiseX = (snoise as any)(noiseInput1).mul(this.sdfWiggleAmplitudeUniform).toVar();
			const noiseY = (snoise as any)(noiseInput2).mul(this.sdfWiggleAmplitudeUniform).toVar();
			
			// Apply distortion to UV coordinates
			const distortedUV = uvCoord.add(vec2(noiseX, noiseY)).toVar();
			
			// Center the distorted UV coordinates
			const centeredUV = distortedUV.sub(vec2(0.5, 0.5)).toVar();
			
			// Calculate distance from center (SDF sphere in 2D)
			const dist = length(centeredUV).toVar();
			
			// Create smooth linear transition from inside (show content) to outside (black)
			const mask = smoothstep(
				this.sdfSphereRadiusUniform,
				this.sdfSphereRadiusUniform.add(this.sdfSphereTransitionUniform),
				dist
			).toVar();
			
			// Sample the color from previous pass (dots effect)
			const color = vec3(dotScreenEffect);
			
			// Mix between scene color (inside sphere) and black (outside)
			const finalColor = mix(color, vec3(0.0), mask);
			
			return vec3(finalColor);
		})();

		this.postProcessing.outputNode = sdfSphereMask;
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

	createMesh() {
		// Create plane geometry with high segmentation for smooth displacement
		this.geometry = new THREE.PlaneGeometry(6, 6, 300, 300);

		this.timeUniform = uniform(0);
		this.amplitudeUniform = uniform(this.debugParams.amplitude);
		this.timeScaleUniform = uniform(this.debugParams.timeScale);
		this.colorTimeScaleUniform = uniform(this.debugParams.colorTimeScale);
		this.deformationScaleUniform = uniform(this.debugParams.deformationScale);
		this.colorScaleUniform = uniform(this.debugParams.colorScale);

		// Create material with TSL shader nodes
		this.material = new THREE.MeshStandardNodeMaterial({
			side: THREE.DoubleSide
		});

		// Build the shader using TSL
		this.material.positionNode = this.createPositionShader();
		this.material.colorNode = this.createColorShader();

		this.mesh = new THREE.Mesh(this.geometry, this.material);
		// Position and rotate the plane to match original setup
		this.mesh.position.set(0.0, 0.2, 0.0);
		this.mesh.rotation.set(-0.5, 0.0, 0.0);
		this.scene.add(this.mesh);
	}

	createPositionShader() {
		return Fn(() => {
			const uvCoord = uv().toVar();
			const noiseCoord = uvCoord.mul(this.deformationScaleUniform).toVar();
			const tilt = uvCoord.y.mul(0.8).toVar();
			const incline = uvCoord.x.mul(0.8).toVar();
			const offset = incline.mul(mix(-0.5, 0.5, uvCoord.y)).toVar();

			// Calculate noise with time animation
			const noiseInput = vec3(
				noiseCoord.x.add(this.timeUniform.mul(this.timeScaleUniform)),
				noiseCoord.y,
				this.timeUniform.mul(this.timeScaleUniform).mul(0.3)
			).toVar();
			const noise = (simplexNoise3d as any)(noiseInput).toVar();

			// Calculate displaced position
			const zPos = positionLocal.z
				.add(noise.mul(this.amplitudeUniform))
				.sub(tilt)
				.add(incline)
				.add(offset);

			return vec3(positionLocal.x, positionLocal.y, zPos);
		})();
	}

	createColorShader() {
		return Fn(() => {
			const uvCoord = uv().toVar();
			const noiseCoord = uvCoord.mul(this.colorScaleUniform).toVar();

			// Interpolate between sunset and pink color schemes based on scroll progress
			const sunsetColor1 = vec3(this.sunsetColorUniforms[0]).toVar();
			const sunsetColor2 = vec3(this.sunsetColorUniforms[1]).toVar();
			const sunsetColor3 = vec3(this.sunsetColorUniforms[2]).toVar();

			const pinkColor1 = vec3(this.pinkColorUniforms[0]).toVar();
			const pinkColor2 = vec3(this.pinkColorUniforms[1]).toVar();
			const pinkColor3 = vec3(this.pinkColorUniforms[2]).toVar();

			// Mix colors based on scroll progress
			const color1 = mix(sunsetColor1, pinkColor1, this.scrollProgressUniform).toVar();
			const color2 = mix(sunsetColor2, pinkColor2, this.scrollProgressUniform).toVar();
			const color3 = mix(sunsetColor3, pinkColor3, this.scrollProgressUniform).toVar();

			// Start with first color and build up the gradient
			const vColor = vec3(color1).toVar();

		// Layer 1
		const noiseFlow1 = float(0.1 + 1 * 0.02).toVar();
		const noiseSpeed1 = float(0.1 + 1 * 0.02).toVar();
		const noiseSeed1 = float(1.0 + 1 * 11.4).toVar();
		const noiseFreq1 = vec2(0.3, 0.4).toVar();
		const noiseFloor1 = float(-0.1).toVar();
		const noiseCeil1 = float(0.6).toVar();
			const colorNoiseInput1 = vec3(
				noiseCoord.x.mul(noiseFreq1.x).add(this.timeUniform.mul(this.colorTimeScaleUniform).mul(noiseFlow1)),
				noiseCoord.y.mul(noiseFreq1.y),
				this.timeUniform.mul(this.colorTimeScaleUniform).mul(noiseSpeed1).add(noiseSeed1)
			).toVar();
			const colorNoise1 = smoothstep(
				noiseFloor1,
				noiseCeil1,
				(simplexNoise3d as any)(colorNoiseInput1)
			).toVar();
			vColor.assign(mix(vColor, color2, colorNoise1));

	// Layer 2
	const noiseFlow2 = float(0.1 + 2 * 0.02).toVar();
	const noiseSpeed2 = float(0.1 + 2 * 0.02).toVar();
	const noiseSeed2 = float(1.0 + 2 * 11.4).toVar();
	const noiseFreq2 = vec2(0.3, 0.4).toVar();
	const noiseFloor2 = float(-0.3).toVar();
	const noiseCeil2 = float(0.6).toVar();
			const colorNoiseInput2 = vec3(
				noiseCoord.x.mul(noiseFreq2.x).add(this.timeUniform.mul(this.colorTimeScaleUniform).mul(noiseFlow2)),
				noiseCoord.y.mul(noiseFreq2.y),
				this.timeUniform.mul(this.colorTimeScaleUniform).mul(noiseSpeed2).add(noiseSeed2)
			).toVar();
			const colorNoise2 = smoothstep(
				noiseFloor2,
				noiseCeil2,
				(simplexNoise3d as any)(colorNoiseInput2)
			).toVar();
			vColor.assign(mix(vColor, color3, colorNoise2));

			return vec3(vColor);
		})();
	}

	setUpSettings() {
		this.pane = new Pane();
		(document.querySelector('.tp-dfwv') as HTMLElement)!.style.zIndex = '1000';
		(document.querySelector('.tp-dfwv') as HTMLElement)!.style.position =
			'fixed';

		// Add scroll progress monitor
		const scrollFolder = this.pane.addFolder({
			title: 'Scroll Progress',
			expanded: true
		});

		scrollFolder.addBinding(this.scrollProgress, 'value', {
			label: 'Progress',
			readonly: true,
			min: 0,
			max: 1
		});

		// Add color scheme selector
		const colorFolder = this.pane.addFolder({
			title: 'Gradient Colors',
			expanded: true
		});

		// Sunset color scheme
		const sunsetFolder = colorFolder.addFolder({
			title: 'Sunset Colors',
			expanded: true
		});

		const sunsetDebugColors = {
			color1: '#' + this.sunsetColors[0].getHexString(),
			color2: '#' + this.sunsetColors[1].getHexString(),
			color3: '#' + this.sunsetColors[2].getHexString()
		};

		sunsetFolder
			.addBinding(sunsetDebugColors, 'color1', {
				label: 'Color 1'
			})
			.on('change', ({ value }) => {
				this.sunsetColors[0].set(value);
				this.sunsetColorUniforms[0].value = this.sunsetColors[0];
			});

		sunsetFolder
			.addBinding(sunsetDebugColors, 'color2', {
				label: 'Color 2'
			})
			.on('change', ({ value }) => {
				this.sunsetColors[1].set(value);
				this.sunsetColorUniforms[1].value = this.sunsetColors[1];
			});

		sunsetFolder
			.addBinding(sunsetDebugColors, 'color3', {
				label: 'Color 3'
			})
			.on('change', ({ value }) => {
				this.sunsetColors[2].set(value);
				this.sunsetColorUniforms[2].value = this.sunsetColors[2];
			});

		// Pink color scheme
		const pinkFolder = colorFolder.addFolder({
			title: 'Pink Colors',
			expanded: true
		});

		const pinkDebugColors = {
			color1: '#' + this.pinkColors[0].getHexString(),
			color2: '#' + this.pinkColors[1].getHexString(),
			color3: '#' + this.pinkColors[2].getHexString()
		};

		pinkFolder
			.addBinding(pinkDebugColors, 'color1', {
				label: 'Color 1'
			})
			.on('change', ({ value }) => {
				this.pinkColors[0].set(value);
				this.pinkColorUniforms[0].value = this.pinkColors[0];
			});

		pinkFolder
			.addBinding(pinkDebugColors, 'color2', {
				label: 'Color 2'
			})
			.on('change', ({ value }) => {
				this.pinkColors[1].set(value);
				this.pinkColorUniforms[1].value = this.pinkColors[1];
			});

		pinkFolder
			.addBinding(pinkDebugColors, 'color3', {
				label: 'Color 3'
			})
			.on('change', ({ value }) => {
				this.pinkColors[2].set(value);
				this.pinkColorUniforms[2].value = this.pinkColors[2];
			});

		// Add shader parameters
		const paramsFolder = this.pane.addFolder({
			title: 'Shader Parameters',
			expanded: true
		});

		paramsFolder
			.addBinding(this.debugParams, 'amplitude', {
				label: 'Amplitude',
				min: 0,
				max: 1,
				step: 0.01
			})
			.on('change', ({ value }) => {
				this.amplitudeUniform.value = value;
			});

		paramsFolder
			.addBinding(this.debugParams, 'timeScale', {
				label: 'Time Scale',
				min: 0,
				max: 1,
				step: 0.01
			})
			.on('change', ({ value }) => {
				this.timeScaleUniform.value = value;
			});

		paramsFolder
			.addBinding(this.debugParams, 'colorTimeScale', {
				label: 'Color Time Scale',
				min: 0,
				max: 1,
				step: 0.01
			})
			.on('change', ({ value }) => {
				this.colorTimeScaleUniform.value = value;
			});

		paramsFolder
			.addBinding(this.debugParams, 'deformationScale', {
				label: 'Deformation Scale',
				min: 0.5,
				max: 10,
				step: 0.1
			})
			.on('change', ({ value }) => {
				this.deformationScaleUniform.value = value;
			});

		paramsFolder
			.addBinding(this.debugParams, 'colorScale', {
				label: 'Color Scale',
				min: 0.5,
				max: 20,
				step: 0.1
			})
			.on('change', ({ value }) => {
				this.colorScaleUniform.value = value;
			});

		// Add SDF sphere postprocessing controls
		const sdfFolder = this.pane.addFolder({
			title: 'SDF Sphere Mask',
			expanded: true
		});

		sdfFolder
			.addBinding(this.debugParams, 'sdfSphereRadius', {
				label: 'Radius',
				min: -1.0,
				max: 1.0,
				step: 0.01
			})
			.on('change', ({ value }) => {
				this.sdfSphereRadiusUniform.value = value;
			});

		sdfFolder
			.addBinding(this.debugParams, 'sdfSphereTransition', {
				label: 'Transition Length',
				min: 0.0,
				max: 2.0,
				step: 0.01
			})
			.on('change', ({ value }) => {
				this.sdfSphereTransitionUniform.value = value;
			});

		sdfFolder.addButton({
			title: 'Animate Transition'
		}).on('click', () => {
			// Reset to 0 first
			this.debugParams.sdfSphereTransition = 0;
			this.sdfSphereTransitionUniform.value = 0;
			// Then animate
			this.animateSdfSphereTransition();
		});

		sdfFolder
			.addBinding(this.debugParams, 'sdfWiggleAmplitude', {
				label: 'Wiggle Amplitude',
				min: 0.0,
				max: 0.2,
				step: 0.001
			})
			.on('change', ({ value }) => {
				this.sdfWiggleAmplitudeUniform.value = value;
			});

		sdfFolder
			.addBinding(this.debugParams, 'sdfWiggleFrequency', {
				label: 'Wiggle Frequency',
				min: 1.0,
				max: 20.0,
				step: 0.1
			})
			.on('change', ({ value }) => {
				this.sdfWiggleFrequencyUniform.value = value;
			});

		sdfFolder
			.addBinding(this.debugParams, 'sdfWiggleSpeed', {
				label: 'Wiggle Speed',
				min: 0.0,
				max: 2.0,
				step: 0.01
			})
			.on('change', ({ value }) => {
				this.sdfWiggleSpeedUniform.value = value;
			});

		// setupCameraPane({
		// 	camera: this.camera,
		// 	pane: this.pane,
		// 	controls: this.controls,
		// 	scene: this.scene,
		// 	defaultOpen: true
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

	async render() {
		if (!this.isPlaying) return;

		// Update time uniform for animation
		this.timeUniform.value = this.clock.getElapsedTime();

		// Update camera wobble based on mouse position
		if (this.cameraWobble) {
			this.cameraWobble.render();
		} else {
			this.controls.update();
		}

		await this.postProcessing.renderAsync();
		requestAnimationFrame(() => this.render());
	}

	stop() {
		this.isPlaying = false;
		window.removeEventListener('resize', this.resize.bind(this));
		if (this.scrollTriggerInstance) {
			this.scrollTriggerInstance.kill();
		}
		this.renderer.dispose();
		if (this.pane) this.pane.dispose();
	}
}

import * as THREE from 'three/webgpu';
import {
	pass,
	mrt,
	output,
	emissive,
	time,
	instanceIndex,
	hash,
	sin,
	deltaTime,
	min,
	vec4,
	uv
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import {
	setupCameraPane,
	setupLightPane
} from '$lib/utils/tweakpaneUtils/utils';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import {
	float,
	Fn,
	mix,
	vec3,
	uniform,
	positionLocal,
	If,
	Discard,
	smoothstep,
	texture,
	instancedArray
} from 'three/tsl';
import { simplexNoise3d } from '$lib/utils/webGPU/simplexNoise3d';
import gsap from 'gsap';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { portfolioColors } from '$lib/utils/colors/portfolioColors';

interface SketchOptions {
	dom: HTMLElement;
}

// Configuration constants
const CONFIG = {
	ANIMATION: {
		CYCLE_DURATION: 2,
		DISINTEGRATE_DURATION: 1.75,
		FADE_DURATION: 0.3,
		POSITION_OFFSET: 10
	},
	DEFAULTS: {
		FREQUENCY: 2.5,
		AMPLITUDE: 1,
		PROGRESS: 0,
		CORNER_RADIUS: 0.1,
		PARTICLE_COUNT: 10000,
		PARTICLE_SCALE: 0.95,
		MIN_BOX_SIZE: 1
	},
	COLORS: {
		PRIMARY: '#29c4ce',
		BACKGROUND: '#000000',
		TEXT: '#29c4ce',
		BOX: '#222222'
	}
} as const;

// Uniform configuration type
interface UniformConfig<T = number> {
	value: T;
	min?: number;
	max?: number;
	step?: number;
}

// Bloom configuration
interface BloomConfig {
	color: string;
	intensity: number;
	edgeWidth: number;
}

// Text configuration
interface TextConfig {
	currentText: string;
	texts: string[];
	currentIndex: number;
	fontSize: number;
	textColor: string;
	padding: number;
}

export default class Sketch {
	// Core Three.js objects
	scene: THREE.Scene;
	container: HTMLElement;
	width: number;
	height: number;
	renderer!: THREE.WebGPURenderer;
	camera!: THREE.PerspectiveCamera;
	controls!: OrbitControls;
	isPlaying: boolean;
	
	// Mesh objects
	material!: THREE.MeshStandardNodeMaterial;
	geometry!: THREE.BoxGeometry;
	mesh!: THREE.Mesh;
	group!: THREE.Group;
	
	// UI and lighting
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	pointLight!: THREE.PointLight;
	cycleTimeline!: gsap.core.Timeline;
	
	// Text objects
	text!: THREE.Mesh;
	textGeometry!: TextGeometry;
	textMaterial!: THREE.MeshStandardMaterial;
	font!: any;
	
	// Configuration objects
	textOptions: TextConfig = {
		currentText: 'Frontend Developer',
		texts: [
			'Frontend Developer',
			'WebGPU Explorer',
			'Creative Coder',
			'Three.js Specialist'
		],
		currentIndex: 0,
		fontSize: 0.3,
		textColor: CONFIG.COLORS.TEXT,
		padding: 0.25
	};
	
	bloomOptions: BloomConfig = {
		color: CONFIG.COLORS.PRIMARY,
		intensity: 3.0,
		edgeWidth: 0.1
	};
	
	particleBloomOptions: BloomConfig = {
		color: CONFIG.COLORS.PRIMARY,
		intensity: 3.0,
		edgeWidth: 0.1
	};
	
	// Uniforms with proper typing
	uniforms = {
		progress: null as any,
		frequency: null as any,
		amplitude: null as any,
		bloomStrength: null as any,
		bloomRadius: null as any,
		bloomThreshold: null as any,
		bloomColor: null as any,
		bloomIntensity: null as any,
		bloomEdgeWidth: null as any,
		particleBloomColor: null as any,
		particleBloomIntensity: null as any,
		particleBloomEdgeWidth: null as any
	};

	particlesUniforms = {
		decay: null as any,
		speed: null as any,
		windStrength: null as any,
		windFrequency: null as any,
		turbulence: null as any
	};

	// Particle system buffers
	particlesBasePositionsBuffer: any;
	particlesPositionsBuffer: any;
	particlesVelocitiesBuffer: any;
	particlesLifeBuffer: any;

	// Particle system objects
	particlesMesh!: THREE.InstancedMesh;
	particlesMaterial!: THREE.SpriteNodeMaterial;
	particleCount = 10000;

	// Particle system sampler
	sampler!: MeshSurfaceSampler;

	// Bloom effect properties
	postProcessing!: THREE.PostProcessing;
	bloomPass: any;

	constructor(options: SketchOptions) {
		this.scene = new THREE.Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		
		this.initRenderer();
		this.initCamera();
		this.initControls();
		
		this.isPlaying = true;
		this.setupLights();
		this.createGroup();
		this.createMesh();
		this.createText();
		this.setupBloom();
		this.resize();
		this.particleSystem();
		this.setUpSettings();
		// this.startCycleAnimation();

		this.init();
	}

	private initRenderer(): void {
		this.renderer = new THREE.WebGPURenderer();
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(new THREE.Color(CONFIG.COLORS.BACKGROUND), 1);
		this.container.appendChild(this.renderer.domElement);
	}

	private initCamera(): void {
		this.camera = new THREE.PerspectiveCamera(
			70,
			this.width / this.height,
			0.01,
			1000
		);
		this.camera.position.set(0, 0, 3);
	}

	private initControls(): void {
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
	}

	// Helper method to create uniforms with consistent pattern
	private createUniform<T>(value: T): any {
		return uniform(value);
	}

	// Helper method to create bloom uniforms
	private createBloomUniforms(): void {
		this.uniforms.bloomStrength = this.createUniform(0.5);
		this.uniforms.bloomRadius = this.createUniform(0.5);
		this.uniforms.bloomThreshold = this.createUniform(0.85);
		this.uniforms.bloomColor = this.createUniform(new THREE.Color(CONFIG.COLORS.PRIMARY));
		this.uniforms.bloomIntensity = this.createUniform(1.0);
		this.uniforms.bloomEdgeWidth = this.createUniform(0.20);
		this.uniforms.particleBloomColor = this.createUniform(new THREE.Color(CONFIG.COLORS.PRIMARY));
		this.uniforms.particleBloomIntensity = this.createUniform(1.0);
		this.uniforms.particleBloomEdgeWidth = this.createUniform(0.20);
	}

	// Helper method to create particle uniforms
	private createParticleUniforms(): void {
		this.particlesUniforms.decay = this.createUniform(1);
		this.particlesUniforms.speed = this.createUniform(0.5);
		this.particlesUniforms.windStrength = this.createUniform(0.3);
		this.particlesUniforms.windFrequency = this.createUniform(2.0);
		this.particlesUniforms.turbulence = this.createUniform(0.5);
	}

	// Shared shader logic for disintegration effect
	private createDisintegrationLogic(progressUniform: any, frequencyUniform: any, amplitudeUniform: any) {
		return {
			getNoiseValue: (position: any) => (simplexNoise3d as any)(position.mul(frequencyUniform)),
			getScaledNoise: (noiseValue: any) => noiseValue.mul(amplitudeUniform),
			getAdjustedProgress: (progress: any) => progress.mul(2.2).sub(1.1),
			getProgressThreshold: (scaledNoise: any, adjustedProgress: any) => scaledNoise.add(adjustedProgress),
			getIsCorner: (progressThreshold: any, cornerRadius: any) => 
				progressThreshold.lessThan(0.0).and(progressThreshold.greaterThan(cornerRadius.negate())),
			getEdgeAlpha: (progressThreshold: any, cornerRadius: any) => 
				smoothstep(cornerRadius.negate(), float(0.0), progressThreshold)
		};
	}

	async init() {
		await this.renderer.init();
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
		this.createBloomUniforms();

		const scenePass = pass(this.scene, this.camera);
		scenePass.setMRT(
			mrt({
				output,
				emissive
			})
		);

		const outputPass = scenePass.getTextureNode();
		const emissivePass = scenePass.getTextureNode('emissive');

		this.bloomPass = bloom(
			emissivePass,
			this.uniforms.bloomStrength.value,
			this.uniforms.bloomRadius.value
		);

		this.postProcessing = new THREE.PostProcessing(this.renderer);
		this.postProcessing.outputNode = outputPass.add(this.bloomPass);
	}

	createGroup() {
		if (!this.group) {
			this.group = new THREE.Group();
			this.group.position.set(10, 0, 0);
			this.scene.add(this.group);
		}
	}

	resize() {
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
		});
	}

	updateText() {
		if (!this.font) return;

		this.disposeExistingText();
		this.createNewTextGeometry();
		
		const { centerOffsets, boxDimensions } = this.calculateTextDimensions();
		this.updateBoxGeometry(boxDimensions);
		this.refreshParticlesIfNeeded();
		
		this.createTextMaterial();
		this.createTextMesh(centerOffsets);
	}

	private disposeExistingText(): void {
		if (this.text) {
			this.group.remove(this.text);
			if (this.textGeometry) this.textGeometry.dispose();
			if (this.textMaterial) this.textMaterial.dispose();
		}
	}

	private createNewTextGeometry(): void {
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
		this.textGeometry.computeBoundingBox();
	}

	private calculateTextDimensions() {
		const bbox = this.textGeometry.boundingBox!;
		const textWidth = bbox.max.x - bbox.min.x;
		const textHeight = bbox.max.y - bbox.min.y;
		const textDepth = bbox.max.z - bbox.min.z;

		const centerOffsets = {
			x: -0.5 * textWidth,
			y: -0.5 * textHeight,
			z: -0.5 * textDepth
		};

		const boxDimensions = {
			width: textWidth + this.textOptions.padding * 2,
			height: Math.max(textHeight + this.textOptions.padding * 2, CONFIG.DEFAULTS.MIN_BOX_SIZE),
			depth: Math.max(textDepth + this.textOptions.padding * 2, CONFIG.DEFAULTS.MIN_BOX_SIZE)
		};

		return { centerOffsets, boxDimensions };
	}

	private updateBoxGeometry(dimensions: { width: number; height: number; depth: number }): void {
		if (this.geometry) this.geometry.dispose();
		this.geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
		this.mesh.geometry = this.geometry;
	}

	private refreshParticlesIfNeeded(): void {
		if (this.particlesMesh) {
			this.refreshParticles();
		}
	}

	private createTextMaterial(): void {
		this.textMaterial = new THREE.MeshStandardMaterial({
			color: this.textOptions.textColor,
			metalness: 0.1,
			roughness: 0.3,
			transparent: true,
			opacity: 1
		});
	}

	private createTextMesh(centerOffsets: { x: number; y: number; z: number }): void {
		this.text = new THREE.Mesh(this.textGeometry, this.textMaterial);
		this.text.position.set(centerOffsets.x, centerOffsets.y, centerOffsets.z);
		this.group.add(this.text);
	}

	nextText() {
		this.textOptions.currentIndex =
			(this.textOptions.currentIndex + 1) % this.textOptions.texts.length;
		this.textOptions.currentText =
			this.textOptions.texts[this.textOptions.currentIndex];
		this.updateText();
	}

	particleSystem() {
		this.createParticleUniforms();
		const { particlesMaterial, particlesMesh } = this.createParticleMaterial();
		this.setupParticleBuffers(particlesMesh);
		this.setupParticleShaders(particlesMaterial);
		
		this.particlesMesh = particlesMesh;
		this.particlesMaterial = particlesMaterial;
		this.group.add(particlesMesh);
	}

	private createParticleMaterial() {
		const textureLoader = new THREE.TextureLoader();
		const particleTexture = textureLoader.load('/particles/1.png');

		const particlesMaterial = new THREE.SpriteNodeMaterial({
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			transparent: true,
			map: particleTexture
		}) as THREE.SpriteNodeMaterial & { emissiveNode?: any };

		const particlesMesh = new THREE.InstancedMesh(
			new THREE.PlaneGeometry(),
			particlesMaterial,
			this.particleCount
		);

		return { particlesMaterial, particlesMesh };
	}

	private setupParticleBuffers(particlesMesh: THREE.InstancedMesh) {
		this.sampler = new MeshSurfaceSampler(this.mesh).build();
		
		const position = new THREE.Vector3();
		const positions = new Float32Array(this.particleCount * 3);

		for (let i = 0; i < this.particleCount; i++) {
			this.sampler.sample(position);
			positions[i * 3] = position.x;
			positions[i * 3 + 1] = position.y;
			positions[i * 3 + 2] = position.z;
		}

		this.particlesBasePositionsBuffer = instancedArray(positions, 'vec3');
		this.particlesPositionsBuffer = instancedArray(positions, 'vec3');
		this.particlesVelocitiesBuffer = instancedArray(this.particleCount * 3, 'vec3');
		this.particlesLifeBuffer = instancedArray(this.particleCount, 'float');

		// Initialize particle system
		this.renderer.computeAsync(
			Fn(() => {
				this.particlesVelocitiesBuffer.element(instanceIndex).assign(vec3(0));
				this.particlesLifeBuffer.element(instanceIndex).assign(hash(instanceIndex));
			})().compute(this.particleCount)
		);
	}

	private setupParticleShaders(particlesMaterial: THREE.SpriteNodeMaterial & { emissiveNode?: any }) {
		particlesMaterial.positionNode = this.createParticlePositionShader();
		particlesMaterial.scaleNode = this.createParticleScaleShader();
		particlesMaterial.colorNode = this.createParticleColorShader(particlesMaterial);
		particlesMaterial.emissiveNode = this.createParticleEmissiveShader(particlesMaterial);
	}

	private createParticlePositionShader() {
		return Fn(() => {
			const life = this.particlesLifeBuffer.element(instanceIndex);
			const velocity = this.particlesVelocitiesBuffer.element(instanceIndex);
			const basePosition = this.particlesBasePositionsBuffer.element(instanceIndex);
			const position = this.particlesPositionsBuffer.element(instanceIndex);

			const newPosition = position.toVar('newPosition');
			const newLife = life.toVar('newLife');
			const newVelocity = velocity.toVar('newVelocity');

			// Calculate velocity forces
			const velocityForces = this.calculateParticleVelocity(newPosition);
			newVelocity.addAssign(velocityForces.mul(deltaTime.mul(this.particlesUniforms.speed).div(100.0)));
			newPosition.addAssign(newVelocity);

			// Handle particle life cycle
			this.updateParticleLife(newLife, newPosition, newVelocity, basePosition);

			// Write values back to buffers
			position.assign(newPosition);
			velocity.assign(newVelocity);
			life.assign(newLife);

			return position;
		})().compute(this.particleCount);
	}

	private calculateParticleVelocity(position: any) {
		// Original wave motion
		const xwave1 = sin(position.y.mul(20)).mul(0.8);
		const xwave2 = sin(position.y.mul(50)).mul(0.7);

		// Wind disturbance using 3D noise
		const windTime = time.mul(0.5);
		const windPos = position.mul(this.particlesUniforms.windFrequency).add(vec3(windTime, windTime.mul(0.7), windTime.mul(0.3)));
		const windNoise = (simplexNoise3d as any)(windPos);
		
		// Create wind vector with turbulence
		const windX = windNoise.mul(this.particlesUniforms.windStrength);
		const windY = (simplexNoise3d as any)(windPos.add(vec3(100, 0, 0))).mul(this.particlesUniforms.windStrength).mul(0.3);
		const windZ = (simplexNoise3d as any)(windPos.add(vec3(0, 100, 0))).mul(this.particlesUniforms.windStrength).mul(0.5);
		
		// Add turbulence for more chaotic movement
		const turbulencePos = position.mul(this.particlesUniforms.windFrequency.mul(3.0)).add(vec3(windTime.mul(2.0)));
		const turbulenceNoise = (simplexNoise3d as any)(turbulencePos);
		const turbulenceForce = vec3(
			turbulenceNoise,
			(simplexNoise3d as any)(turbulencePos.add(vec3(50, 0, 0))),
			(simplexNoise3d as any)(turbulencePos.add(vec3(0, 50, 0)))
		).mul(this.particlesUniforms.turbulence);

		// Combine all forces
		const totalWind = vec3(windX.add(turbulenceForce.x), windY.add(turbulenceForce.y), windZ.add(turbulenceForce.z));
		const baseVelocity = vec3(xwave1.add(xwave2), 1, 0);
		
		return baseVelocity.add(totalWind);
	}

	private updateParticleLife(newLife: any, newPosition: any, newVelocity: any, basePosition: any) {
		const distanceDecay = basePosition.distance(newPosition).remapClamp(0, 1, this.particlesUniforms.decay, 1);
		newLife.assign(newLife.add(deltaTime.mul(distanceDecay)));

		If(newLife.greaterThan(1), () => {
			newPosition.assign(basePosition);
			newVelocity.assign(vec3(0));
		});

		newLife.assign(newLife.mod(1));
	}

	private createParticleScaleShader() {
		return Fn(() => {
			const life = this.particlesLifeBuffer.element(instanceIndex);
			return float(0.05)
				.mul(CONFIG.DEFAULTS.PARTICLE_SCALE)
				.mul(hash(instanceIndex).mul(0.4).add(0.6))
				.mul(min(life.smoothstep(0, 0.1), life.smoothstep(0.5, 1).oneMinus()));
		})();
	}

	private createParticleColorShader(particlesMaterial: any) {
		const mixColorUniform = uniform(portfolioColors.primaryVec3);
		
		return Fn(() => {
			const disintegration = this.createDisintegrationLogic(
				this.uniforms.progress,
				this.uniforms.frequency,
				this.uniforms.amplitude
			);

			const basePos = this.particlesBasePositionsBuffer.element(instanceIndex);
			const noiseValue = disintegration.getNoiseValue(basePos);
			const scaledNoise = disintegration.getScaledNoise(noiseValue);
			const adjustedProgress = disintegration.getAdjustedProgress(this.uniforms.progress);
			const progressThreshold = disintegration.getProgressThreshold(scaledNoise, adjustedProgress);
			
			const isCorner = disintegration.getIsCorner(progressThreshold, this.uniforms.particleBloomEdgeWidth);
			
			If(isCorner.not(), () => {
				Discard();
			});
			
			const edgeAlpha = disintegration.getEdgeAlpha(progressThreshold, this.uniforms.particleBloomEdgeWidth);
			const samplerColor = texture(particlesMaterial.map!, uv()).toVar();

			const tintedRGB = samplerColor.rgb.mul(mixColorUniform).mul(edgeAlpha);
			const outAlpha = samplerColor.a.mul(edgeAlpha);

			return vec4(tintedRGB, outAlpha);
		})();
	}

	private createParticleEmissiveShader(particlesMaterial: any) {
		return Fn(() => {
			const disintegration = this.createDisintegrationLogic(
				this.uniforms.progress,
				this.uniforms.frequency,
				this.uniforms.amplitude
			);

			const basePos = this.particlesBasePositionsBuffer.element(instanceIndex);
			const noiseValue = disintegration.getNoiseValue(basePos);
			const scaledNoise = disintegration.getScaledNoise(noiseValue);
			const adjustedProgress = disintegration.getAdjustedProgress(this.uniforms.progress);
			const progressThreshold = disintegration.getProgressThreshold(scaledNoise, adjustedProgress);
			
			const isCorner = disintegration.getIsCorner(progressThreshold, this.uniforms.particleBloomEdgeWidth);
			const emissiveOutput = vec3(0.0).toVar();

			If(isCorner, () => {
				const edgeAlpha = disintegration.getEdgeAlpha(progressThreshold, this.uniforms.particleBloomEdgeWidth);
				const samplerColor = texture(particlesMaterial.map!, uv());
				const bloomColor = this.uniforms.particleBloomColor.rgb.mul(this.uniforms.particleBloomIntensity);
				emissiveOutput.assign(samplerColor.mul(bloomColor).mul(edgeAlpha));
			});

			return emissiveOutput;
		})();
	}

	private refreshParticles() {
		// Dispose old instanced mesh & related GPU resources
		if (this.particlesMesh) {
			// Remove from group (was added there for alignment)
			this.group.remove(this.particlesMesh);
			this.particlesMesh.geometry.dispose();
			(this.particlesMesh.material as any).dispose?.();
		}
		// Rebuild particles for updated geometry
		this.particleSystem();
	}

	createMesh() {
		// Start with a default box size - this will be adjusted when text is loaded
		this.geometry = new THREE.BoxGeometry(2.5, 1, 1);
		this.material = new THREE.MeshStandardNodeMaterial({
			color: CONFIG.COLORS.BOX,
			side: THREE.DoubleSide
		});

		// Create uniforms
		this.uniforms.frequency = this.createUniform(CONFIG.DEFAULTS.FREQUENCY);
		this.uniforms.amplitude = this.createUniform(CONFIG.DEFAULTS.AMPLITUDE);
		this.uniforms.progress = this.createUniform(CONFIG.DEFAULTS.PROGRESS);

		// Create shaders using shared logic
		this.material.colorNode = this.createDisintegrateColorShader();
		this.material.emissiveNode = this.createDisintegrateEmissiveShader();

		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.mesh.position.set(0, 0, 0);
		this.group.add(this.mesh);
	}

	private createDisintegrateColorShader() {
		return Fn(() => {
			const disintegration = this.createDisintegrationLogic(
				this.uniforms.progress,
				this.uniforms.frequency,
				this.uniforms.amplitude
			);

			const localPos = positionLocal.xyz;
			const noiseValue = disintegration.getNoiseValue(localPos);
			const scaledNoise = disintegration.getScaledNoise(noiseValue);
			const adjustedProgress = disintegration.getAdjustedProgress(this.uniforms.progress);
			const progressThreshold = disintegration.getProgressThreshold(scaledNoise, adjustedProgress);
			
			const isOutOfRange = progressThreshold.greaterThan(0.0);
			const isCorner = disintegration.getIsCorner(progressThreshold, float(CONFIG.DEFAULTS.CORNER_RADIUS));
			
			const finalColor = vec3(0.05).toVar();
			const edgeColor = vec3(5.0, 2.0, 0.3).toVar();
			const bloomIntensity = float(8.0);
			
			If(isOutOfRange, () => {
				Discard();
			}).ElseIf(isCorner, () => {
				const edgeAlpha = disintegration.getEdgeAlpha(progressThreshold, float(CONFIG.DEFAULTS.CORNER_RADIUS));
				const bloomColor = edgeColor.mul(bloomIntensity);
				const falloff = smoothstep(
					float(-CONFIG.DEFAULTS.CORNER_RADIUS * 2.0),
					float(-CONFIG.DEFAULTS.CORNER_RADIUS * 0.5),
					progressThreshold
				);
				const finalBloomColor = bloomColor.mul(falloff);
				finalColor.rgb = mix(finalColor, finalBloomColor, edgeAlpha);
			});
			
			return finalColor;
		})();
	}

	private createDisintegrateEmissiveShader() {
		return Fn(() => {
			const disintegration = this.createDisintegrationLogic(
				this.uniforms.progress,
				this.uniforms.frequency,
				this.uniforms.amplitude
			);

			const localPos = positionLocal.xyz;
			const noiseValue = disintegration.getNoiseValue(localPos);
			const scaledNoise = disintegration.getScaledNoise(noiseValue);
			const adjustedProgress = disintegration.getAdjustedProgress(this.uniforms.progress);
			const progressThreshold = disintegration.getProgressThreshold(scaledNoise, adjustedProgress);
			
			const isOutOfRange = progressThreshold.greaterThan(0.0);
			const isCorner = disintegration.getIsCorner(progressThreshold, this.uniforms.bloomEdgeWidth);
			const emissiveOutput = vec3(0.0).toVar();
			
			If(isOutOfRange, () => {}).ElseIf(isCorner, () => {
				const edgeAlpha = disintegration.getEdgeAlpha(progressThreshold, this.uniforms.bloomEdgeWidth);
				const bloomColor = this.uniforms.bloomColor.rgb.mul(this.uniforms.bloomIntensity);
				emissiveOutput.assign(bloomColor.mul(edgeAlpha));
			});
			
			return emissiveOutput;
		})();
	}

	setUpSettings() {
		this.pane = new Pane();
		(document.querySelector('.tp-dfwv') as HTMLElement)!.style.zIndex = '1000';

		this.setupAnimationControls();
		this.setupMainControls();
		this.setupBloomControls();
		this.setupParticleControls();
	}

	private setupAnimationControls() {
		const animateBtn = this.pane.addButton({
			title: 'Animate Progress'
		});

		animateBtn.on('click', () => {
			const animateTo = this.uniforms.progress.value <= 0.5 ? 1 : 0;
			gsap.to(this.uniforms.progress, {
				value: animateTo,
				duration: CONFIG.ANIMATION.DISINTEGRATE_DURATION,
				ease: 'linear',
				onUpdate: () => this.pane.refresh()
			});
		});
	}

	private setupMainControls() {
		this.addSliderControl(this.uniforms.progress, 'value', {
			min: 0,
			max: 1,
			step: 0.01,
			label: 'Progress'
		});

		this.addSliderControl(this.uniforms.frequency, 'value', {
			min: 0,
			max: 10,
			step: 0.1,
			label: 'Frequency'
		});
	}

	private setupBloomControls() {
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

		this.setupBloomSubControls('Cube Bloom', this.bloomOptions, {
			colorUniform: this.uniforms.bloomColor,
			intensityUniform: this.uniforms.bloomIntensity,
			edgeWidthUniform: this.uniforms.bloomEdgeWidth
		});

		this.setupBloomSubControls('Particle Bloom', this.particleBloomOptions, {
			colorUniform: this.uniforms.particleBloomColor,
			intensityUniform: this.uniforms.particleBloomIntensity,
			edgeWidthUniform: this.uniforms.particleBloomEdgeWidth
		});
	}

	private setupBloomSubControls(
		title: string, 
		options: BloomConfig, 
		uniforms: { colorUniform: any; intensityUniform: any; edgeWidthUniform: any }
	) {
		const folder = this.pane.addFolder({
			title,
			expanded: true
		});

		folder
			.addBinding(options, 'color', { label: `${title.split(' ')[0]} Bloom Color` })
			.on('change', () => {
				uniforms.colorUniform.value.setHex(options.color.replace('#', '0x'));
			});

		folder
			.addBinding(options, 'intensity', {
				min: 0,
				max: 10,
				step: 0.1,
				label: `${title.split(' ')[0]} Bloom Intensity`
			})
			.on('change', () => {
				uniforms.intensityUniform.value = options.intensity;
			});

		folder
			.addBinding(options, 'edgeWidth', {
				min: 0.01,
				max: 0.5,
				step: 0.01,
				label: `${title.split(' ')[0]} Bloom Edge Width`
			})
			.on('change', () => {
				uniforms.edgeWidthUniform.value = options.edgeWidth;
			});
	}

	private setupParticleControls() {
		const particleFolder = this.pane.addFolder({
			title: 'Particle Settings',
			expanded: true
		});

		this.addSliderControl(this.particlesUniforms.decay, 'value', {
			min: 0,
			max: 2,
			step: 0.01,
			label: 'Decay'
		}, particleFolder);

		this.addSliderControl(this.particlesUniforms.speed, 'value', {
			min: 0.01,
			max: 1.0,
			step: 0.01,
			label: 'Speed'
		}, particleFolder);
	}

	private addSliderControl(target: any, property: string, config: any, folder?: any) {
		const container = folder || this.pane;
		container.addBinding(target, property, config);
	}

	startCycleAnimation() {
		this.cycleTimeline = gsap.timeline({ repeat: -1 });

		this.cycleTimeline
			.to(this.group.position, {
				x: 0,
				duration: CONFIG.ANIMATION.CYCLE_DURATION,
				ease: 'power4.inOut'
			})
			.to(
				this.uniforms.progress,
				{
					value: 1,
					duration: CONFIG.ANIMATION.DISINTEGRATE_DURATION,
					ease: 'none',
					onUpdate: () => this.pane.refresh()
				},
				'-=0.6'
			)
			.add(() => this.handleTextTransition())
			.to({}, { duration: CONFIG.ANIMATION.FADE_DURATION })
			.call(() => this.nextText())
			.set(this.group.position, { x: CONFIG.ANIMATION.POSITION_OFFSET })
			.call(() => this.resetTextOpacity())
			.set(this.uniforms.progress, { value: 0 });
	}

	private handleTextTransition() {
		if (this.textMaterial) {
			gsap.to(this.textMaterial, {
				opacity: 0,
				duration: CONFIG.ANIMATION.FADE_DURATION,
				ease: 'power2.inOut'
			});
		}
	}

	private resetTextOpacity() {
		if (this.textMaterial) {
			this.textMaterial.opacity = 1;
		}
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
	}
}

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
	uv,
	renderOutput
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
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
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { portfolioColors } from '$lib/utils/colors/portfolioColors';

type Props = {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGPURenderer;
	progress: number;
	position: THREE.Vector3;
	boxSize: { x: number; y: number; z: number };
	rotation?: { x: number; y: number; z: number } | undefined;
	showHelpers?: boolean;
	fxaaEnabled?: boolean;
};

interface BloomConfig {
	color: string;
	intensity: number;
	edgeWidth: number;
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

export default class DisintegrateMesh {
	scene!: THREE.Scene;
	camera!: THREE.PerspectiveCamera;
	renderer!: THREE.WebGPURenderer;

	material!: THREE.MeshStandardNodeMaterial;
	geometry!: THREE.BoxGeometry;
	mesh!: THREE.Mesh;
	position!: THREE.Vector3;
	boxSize!: { x: number; y: number; z: number };
	progress!: number;
	rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
	showHelpers: boolean = false;
	fxaaEnabled: boolean = false;

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

	particlesBasePositionsBuffer: any;
	particlesPositionsBuffer: any;
	particlesVelocitiesBuffer: any;
	particlesLifeBuffer: any;

	particlesUniforms = {
		decay: null as any,
		speed: null as any,
		windStrength: null as any,
		windFrequency: null as any,
		turbulence: null as any
	};

	particlesMesh!: THREE.InstancedMesh;
	particlesMaterial!: THREE.SpriteNodeMaterial;
	particleCount = 10000;
	sampler!: MeshSurfaceSampler;

	postProcessing!: THREE.PostProcessing;
	bloomPass: any;

	constructor(props: Props) {
		this.scene = props.scene;
		this.camera = props.camera;
		this.renderer = props.renderer;
		this.position = props.position;
		this.boxSize = props.boxSize;
		this.progress = props.progress;
		this.showHelpers = !!props.showHelpers;
		this.fxaaEnabled = !!props.fxaaEnabled;

		if (props.rotation) {
			this.rotation = props.rotation;
		}

		this.createMesh();
		this.setupBloom();
		this.particleSystem();
	}

	private createUniform<T>(value: T): any {
		return uniform(value);
	}

	private createBloomUniforms(): void {
		this.uniforms.bloomStrength = this.createUniform(0.5);
		this.uniforms.bloomRadius = this.createUniform(0.5);
		this.uniforms.bloomThreshold = this.createUniform(0.85);
		this.uniforms.bloomColor = this.createUniform(
			new THREE.Color(CONFIG.COLORS.PRIMARY)
		);
		this.uniforms.bloomIntensity = this.createUniform(1.0);
		this.uniforms.bloomEdgeWidth = this.createUniform(0.2);
		this.uniforms.particleBloomColor = this.createUniform(
			new THREE.Color(CONFIG.COLORS.PRIMARY)
		);
		this.uniforms.particleBloomIntensity = this.createUniform(1.0);
		this.uniforms.particleBloomEdgeWidth = this.createUniform(0.2);
	}

	// Helper method to create particle uniforms
	private createParticleUniforms(): void {
		this.particlesUniforms.decay = this.createUniform(1);
		this.particlesUniforms.speed = this.createUniform(0.5);
		this.particlesUniforms.windStrength = this.createUniform(0.3);
		this.particlesUniforms.windFrequency = this.createUniform(2.0);
		this.particlesUniforms.turbulence = this.createUniform(0.5);
	}

	private createDisintegrationLogic(
		frequencyUniform: any,
		amplitudeUniform: any
	) {
		return {
			getNoiseValue: (position: any) =>
				(simplexNoise3d as any)(position.mul(frequencyUniform)),
			getScaledNoise: (noiseValue: any) => noiseValue.mul(amplitudeUniform),
			getAdjustedProgress: (progress: any) => progress.mul(2.2).sub(1.1),
			getProgressThreshold: (scaledNoise: any, adjustedProgress: any) =>
				scaledNoise.add(adjustedProgress),
			getIsCorner: (progressThreshold: any, cornerRadius: any) =>
				progressThreshold
					.lessThan(0.0)
					.and(progressThreshold.greaterThan(cornerRadius.negate())),
			getEdgeAlpha: (progressThreshold: any, cornerRadius: any) =>
				smoothstep(cornerRadius.negate(), float(0.0), progressThreshold)
		};
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

		// Create the base bloom + output combination
		const bloomOutput = outputPass.add(this.bloomPass);
		
		// Apply FXAA if enabled
		let finalOutput;
		if (this.fxaaEnabled) {
			// FXAA must be computed in sRGB color space (after tone mapping and color space conversion)
			const renderOutputPass = renderOutput(bloomOutput);
			finalOutput = fxaa(renderOutputPass);
		} else {
			finalOutput = bloomOutput;
		}

		this.postProcessing = new THREE.PostProcessing(this.renderer);
		
		// Disable default output color transform when using FXAA
		if (this.fxaaEnabled) {
			this.postProcessing.outputColorTransform = false;
		}
		
		this.postProcessing.outputNode = finalOutput;
	}

	particleSystem() {
		this.createParticleUniforms();
		const { particlesMaterial, particlesMesh } = this.createParticleMaterial();
		this.setupParticleBuffers(particlesMesh);
		this.setupParticleShaders(particlesMaterial);

		this.particlesMesh = particlesMesh;
		this.particlesMaterial = particlesMaterial;
		
		// Apply the same position and rotation as the main mesh
		this.particlesMesh.position.set(this.position.x, this.position.y, this.position.z);
		this.particlesMesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
		
		this.scene.add(this.particlesMesh);
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
		this.particlesVelocitiesBuffer = instancedArray(
			this.particleCount * 3,
			'vec3'
		);
		this.particlesLifeBuffer = instancedArray(this.particleCount, 'float');

		// Initialize particle system
		this.renderer.computeAsync(
			Fn(() => {
				this.particlesVelocitiesBuffer.element(instanceIndex).assign(vec3(0));
				this.particlesLifeBuffer
					.element(instanceIndex)
					.assign(hash(instanceIndex));
			})().compute(this.particleCount)
		);
	}

	private setupParticleShaders(
		particlesMaterial: THREE.SpriteNodeMaterial & { emissiveNode?: any }
	) {
		particlesMaterial.positionNode = this.createParticlePositionShader();
		particlesMaterial.scaleNode = this.createParticleScaleShader();
		particlesMaterial.colorNode =
			this.createParticleColorShader(particlesMaterial);
		particlesMaterial.emissiveNode =
			this.createParticleEmissiveShader(particlesMaterial);
	}

	private createParticlePositionShader() {
		return Fn(() => {
			const life = this.particlesLifeBuffer.element(instanceIndex);
			const velocity = this.particlesVelocitiesBuffer.element(instanceIndex);
			const basePosition =
				this.particlesBasePositionsBuffer.element(instanceIndex);
			const position = this.particlesPositionsBuffer.element(instanceIndex);

			const newPosition = position.toVar('newPosition');
			const newLife = life.toVar('newLife');
			const newVelocity = velocity.toVar('newVelocity');

			// Calculate velocity forces
			const velocityForces = this.calculateParticleVelocity(newPosition);
			newVelocity.addAssign(
				velocityForces.mul(
					deltaTime.mul(this.particlesUniforms.speed).div(100.0)
				)
			);
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
		const windPos = position
			.mul(this.particlesUniforms.windFrequency)
			.add(vec3(windTime, windTime.mul(0.7), windTime.mul(0.3)));
		const windNoise = (simplexNoise3d as any)(windPos);

		// Create wind vector with turbulence
		const windX = windNoise.mul(this.particlesUniforms.windStrength);
		const windY = (simplexNoise3d as any)(windPos.add(vec3(100, 0, 0)))
			.mul(this.particlesUniforms.windStrength)
			.mul(0.3);
		const windZ = (simplexNoise3d as any)(windPos.add(vec3(0, 100, 0)))
			.mul(this.particlesUniforms.windStrength)
			.mul(0.5);

		// Add turbulence for more chaotic movement
		const turbulencePos = position
			.mul(this.particlesUniforms.windFrequency.mul(3.0))
			.add(vec3(windTime.mul(2.0)));
		const turbulenceNoise = (simplexNoise3d as any)(turbulencePos);
		const turbulenceForce = vec3(
			turbulenceNoise,
			(simplexNoise3d as any)(turbulencePos.add(vec3(50, 0, 0))),
			(simplexNoise3d as any)(turbulencePos.add(vec3(0, 50, 0)))
		).mul(this.particlesUniforms.turbulence);

		// Combine all forces
		const totalWind = vec3(
			windX.add(turbulenceForce.x),
			windY.add(turbulenceForce.y),
			windZ.add(turbulenceForce.z)
		);
		const baseVelocity = vec3(xwave1.add(xwave2), 1, 0);

		return baseVelocity.add(totalWind);
	}

	private updateParticleLife(
		newLife: any,
		newPosition: any,
		newVelocity: any,
		basePosition: any
	) {
		const distanceDecay = basePosition
			.distance(newPosition)
			.remapClamp(0, 1, this.particlesUniforms.decay, 1);
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
				this.uniforms.frequency,
				this.uniforms.amplitude
			);

			const basePos = this.particlesBasePositionsBuffer.element(instanceIndex);
			const noiseValue = disintegration.getNoiseValue(basePos);
			const scaledNoise = disintegration.getScaledNoise(noiseValue);
			const adjustedProgress = disintegration.getAdjustedProgress(
				this.uniforms.progress
			);
			const progressThreshold = disintegration.getProgressThreshold(
				scaledNoise,
				adjustedProgress
			);

			const isCorner = disintegration.getIsCorner(
				progressThreshold,
				this.uniforms.particleBloomEdgeWidth
			);

			If(isCorner.not(), () => {
				Discard();
			});

			const edgeAlpha = disintegration.getEdgeAlpha(
				progressThreshold,
				this.uniforms.particleBloomEdgeWidth
			);
			const samplerColor = texture(particlesMaterial.map!, uv()).toVar();

			const tintedRGB = samplerColor.rgb.mul(mixColorUniform).mul(edgeAlpha);
			const outAlpha = samplerColor.a.mul(edgeAlpha);

			return vec4(tintedRGB, outAlpha);
		})();
	}

	private createParticleEmissiveShader(particlesMaterial: any) {
		return Fn(() => {
			const disintegration = this.createDisintegrationLogic(
				this.uniforms.frequency,
				this.uniforms.amplitude
			);

			const basePos = this.particlesBasePositionsBuffer.element(instanceIndex);
			const noiseValue = disintegration.getNoiseValue(basePos);
			const scaledNoise = disintegration.getScaledNoise(noiseValue);
			const adjustedProgress = disintegration.getAdjustedProgress(
				this.uniforms.progress
			);
			const progressThreshold = disintegration.getProgressThreshold(
				scaledNoise,
				adjustedProgress
			);

			const isCorner = disintegration.getIsCorner(
				progressThreshold,
				this.uniforms.particleBloomEdgeWidth
			);
			const emissiveOutput = vec3(0.0).toVar();

			If(isCorner, () => {
				const edgeAlpha = disintegration.getEdgeAlpha(
					progressThreshold,
					this.uniforms.particleBloomEdgeWidth
				);
				const samplerColor = texture(particlesMaterial.map!, uv());
				const bloomColor = this.uniforms.particleBloomColor.rgb.mul(
					this.uniforms.particleBloomIntensity
				);
				emissiveOutput.assign(samplerColor.mul(bloomColor).mul(edgeAlpha));
			});

			return emissiveOutput;
		})();
	}

	createMesh() {
		// Start with a default box size - this will be adjusted when text is loaded
		this.geometry = new THREE.BoxGeometry(this.boxSize.x, this.boxSize.y, this.boxSize.z);
		this.material = new THREE.MeshStandardNodeMaterial({
			color: CONFIG.COLORS.BOX,
			side: THREE.DoubleSide
		});

		// Create uniforms
		this.uniforms.frequency = this.createUniform(CONFIG.DEFAULTS.FREQUENCY);
		this.uniforms.amplitude = this.createUniform(CONFIG.DEFAULTS.AMPLITUDE);
		this.uniforms.progress = this.createUniform(this.progress);

		// Create shaders using shared logic
		this.material.colorNode = this.createDisintegrateColorShader();
		this.material.emissiveNode = this.createDisintegrateEmissiveShader();

		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.mesh.position.set(this.position.x, this.position.y, this.position.z);
		this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);

        this.scene.add(this.mesh);
	}

	private createDisintegrateColorShader() {
		return Fn(() => {
			const disintegration = this.createDisintegrationLogic(
				this.uniforms.frequency,
				this.uniforms.amplitude
			);

			const localPos = positionLocal.xyz;
			const noiseValue = disintegration.getNoiseValue(localPos);
			const scaledNoise = disintegration.getScaledNoise(noiseValue);
			const adjustedProgress = disintegration.getAdjustedProgress(
				this.uniforms.progress
			);
			const progressThreshold = disintegration.getProgressThreshold(
				scaledNoise,
				adjustedProgress
			);

			const isOutOfRange = progressThreshold.greaterThan(0.0);
			const isCorner = disintegration.getIsCorner(
				progressThreshold,
				float(CONFIG.DEFAULTS.CORNER_RADIUS)
			);

			const finalColor = vec3(0.05).toVar();
			const edgeColor = vec3(5.0, 2.0, 0.3).toVar();
			const bloomIntensity = float(8.0);

			If(isOutOfRange, () => {
				Discard();
			}).ElseIf(isCorner, () => {
				const edgeAlpha = disintegration.getEdgeAlpha(
					progressThreshold,
					float(CONFIG.DEFAULTS.CORNER_RADIUS)
				);
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
				this.uniforms.frequency,
				this.uniforms.amplitude
			);

			const localPos = positionLocal.xyz;
			const noiseValue = disintegration.getNoiseValue(localPos);
			const scaledNoise = disintegration.getScaledNoise(noiseValue);
			const adjustedProgress = disintegration.getAdjustedProgress(
				this.uniforms.progress
			);
			const progressThreshold = disintegration.getProgressThreshold(
				scaledNoise,
				adjustedProgress
			);

			const isOutOfRange = progressThreshold.greaterThan(0.0);
			const isCorner = disintegration.getIsCorner(
				progressThreshold,
				this.uniforms.bloomEdgeWidth
			);
			const emissiveOutput = vec3(0.0).toVar();

			If(isOutOfRange, () => {}).ElseIf(isCorner, () => {
				const edgeAlpha = disintegration.getEdgeAlpha(
					progressThreshold,
					this.uniforms.bloomEdgeWidth
				);
				const bloomColor = this.uniforms.bloomColor.rgb.mul(
					this.uniforms.bloomIntensity
				);
				emissiveOutput.assign(bloomColor.mul(edgeAlpha));
			});

			return emissiveOutput;
		})();
	}

	updateProgress(newProgress: number) {
		this.progress = newProgress;
		if (this.uniforms.progress) {
			this.uniforms.progress.value = newProgress;
		}
	}

	updatePosition(newPosition: THREE.Vector3) {
		this.position.copy(newPosition);
		if (this.mesh) {
			this.mesh.position.copy(this.position);
		}
		if (this.particlesMesh) {
			this.particlesMesh.position.copy(this.position);
		}
	}

	updateRotation(newRotation: { x: number; y: number; z: number }) {
		this.rotation = { ...newRotation };
		if (this.mesh) {
			this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
		}
		if (this.particlesMesh) {
			this.particlesMesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
		}
	}

	setFXAAEnabled(enabled: boolean) {
		if (this.fxaaEnabled === enabled) return; // No change needed
		
		this.fxaaEnabled = enabled;
		
		// Recreate the postprocessing pipeline with/without FXAA
		this.setupBloom();
	}

	async render() {
		this.postProcessing.render();
	}
}

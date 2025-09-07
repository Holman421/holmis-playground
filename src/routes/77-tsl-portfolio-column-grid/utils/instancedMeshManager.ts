import * as THREE from 'three/webgpu';
import {
	attribute,
	float,
	Fn,
	mix,
	positionLocal,
	time,
	uniform,
	varying,
	vec2,
	vec3,
	vec4
} from 'three/tsl';
import { snoise } from '$lib/utils/webGPU/simplexNoise2d';
import { portfolioColors } from '$lib/utils/colors/portfolioColors';
import { RectangleState } from './animationSystem';

interface InstancedMeshManagerOptions {
	scene: THREE.Scene;
	targetPosition: THREE.Vector3;
	numCols?: number;
	numRows?: number;
	onUniformsCreated?: (uniforms: any) => void;
	onInteractionAttributesCreated?: (attributes: any) => void;
}

export default class InstancedMeshManager {
	private scene: THREE.Scene;
	private targetPosition: THREE.Vector3;
	private numCols: number;
	private numRows: number;
	private onUniformsCreated?: (uniforms: any) => void;
	private onInteractionAttributesCreated?: (attributes: any) => void;

	public instancedMesh!: THREE.InstancedMesh;
	public interactionAttributes!: {
		hover: THREE.InstancedBufferAttribute;
		timestamp: THREE.InstancedBufferAttribute;
		state: THREE.InstancedBufferAttribute;
		animationProgress: THREE.InstancedBufferAttribute;
		targetPosition: THREE.InstancedBufferAttribute;
		queuePosition: THREE.InstancedBufferAttribute;
		animStartTime: THREE.InstancedBufferAttribute;
	};
	public uniforms: any = {};
	private isDisposed: boolean = false;

	constructor(options: InstancedMeshManagerOptions) {
		this.scene = options.scene;
		this.targetPosition = options.targetPosition;
		this.numCols = options.numCols || 15;
		this.numRows = options.numRows || 40;
		this.onUniformsCreated = options.onUniformsCreated;
		this.onInteractionAttributesCreated =
			options.onInteractionAttributesCreated;
	}

	createInstancedMesh(): THREE.InstancedMesh {
		const count = this.numCols * this.numRows;
		const geometry = new THREE.BoxGeometry(1, 1, 5);

		// All instance attributes
		const instanceColRow = new Float32Array(count * 2);
		const instanceHoverState = new Float32Array(count);
		const instanceTimestamp = new Float32Array(count);
		const instanceState = new Float32Array(count);
		const instanceAnimationProgress = new Float32Array(count);
		const instanceAnimStartTime = new Float32Array(count);
		const instanceTargetPosition = new Float32Array(count * 3);
		const instanceQueuePosition = new Float32Array(count);

		const material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide,
			transparent: true
		});

		const spacing = 1.5;
		const gridWidth = (this.numCols - 1) * spacing;
		const gridHeight = (this.numRows - 1) * spacing;
		const centeringOffsetX = -gridWidth / 2;
		const centeringOffsetY = -gridHeight / 2;

		// Create and store uniforms
		this.createUniforms(centeringOffsetX, centeringOffsetY);

		this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);

		// Setup shaders
		this.setupShaders(
			material,
			spacing,
			gridWidth,
			gridHeight,
			centeringOffsetX,
			centeringOffsetY
		);

		// Initialize instance data
		this.initializeInstances(
			instanceColRow,
			instanceHoverState,
			instanceTimestamp,
			instanceState,
			instanceAnimationProgress,
			instanceAnimStartTime,
			instanceTargetPosition,
			instanceQueuePosition,
			spacing,
			centeringOffsetX,
			centeringOffsetY
		);

		// Set geometry attributes
		this.setGeometryAttributes(
			instanceColRow,
			instanceHoverState,
			instanceTimestamp,
			instanceState,
			instanceAnimationProgress,
			instanceAnimStartTime,
			instanceTargetPosition,
			instanceQueuePosition
		);

		// Store interaction attributes references
		this.createInteractionAttributesReferences();

		// Add to scene
		this.instancedMesh.instanceMatrix.needsUpdate = true;
		this.scene.add(this.instancedMesh);

		// Notify callbacks
		if (this.onUniformsCreated) {
			this.onUniformsCreated(this.uniforms);
		}
		if (this.onInteractionAttributesCreated) {
			this.onInteractionAttributesCreated(this.interactionAttributes);
		}

		return this.instancedMesh;
	}

	private createUniforms(centeringOffsetX: number, centeringOffsetY: number) {
		// Uniforms
		const frequencyUniform = uniform(0.5);
		const amplitudeUniform = uniform(3.0);
		const zOffsetUniform = uniform(0.3);
		const scaleUniform = uniform(0.075);
		const transitionSpeedUniform = uniform(8.0);
		const currentTimeUniform = uniform(0.0);

		// Final orientation for cubes at AT_TARGET
		const atTargetRotXUniform = uniform(0.0);
		const atTargetRotYUniform = uniform(Math.PI * (30 / 180));
		// const atTargetRotYUniform = uniform(0.0);
		const atTargetRotZUniform = uniform(0.0);

		// Color uniforms for different states
		const idleColorUniform = uniform(new THREE.Color(0x222222)); // Dark gray
		const mainColorUniform = uniform(portfolioColors.primaryVec3); // Blue wave peaks
		const hoverColorUniform = uniform(new THREE.Color(1.5, 0.1, 0.1)); // Orange hover
		const selectedColorUniform = uniform(new THREE.Color(0.15, 0.35, 0.1)); // Green selected
		const targetColorUniform = uniform(new THREE.Color(0x222222)); // Dark gray at target

		// Store uniforms for external access
		this.uniforms = {
			frequency: frequencyUniform,
			amplitude: amplitudeUniform,
			zOffset: zOffsetUniform,
			scale: scaleUniform,
			currentTime: currentTimeUniform,
			atTargetRotX: atTargetRotXUniform,
			atTargetRotY: atTargetRotYUniform,
			atTargetRotZ: atTargetRotZUniform,
			transitionSpeed: transitionSpeedUniform,
			idleColor: idleColorUniform,
			mainColor: mainColorUniform,
			hoverColor: hoverColorUniform,
			selectedColor: selectedColorUniform,
			targetColor: targetColorUniform,
			centeringOffsetX: uniform(centeringOffsetX),
			centeringOffsetY: uniform(centeringOffsetY)
		};
	}

	private setupShaders(
		material: THREE.MeshStandardNodeMaterial,
		spacing: number,
		gridWidth: number,
		gridHeight: number,
		centeringOffsetX: number,
		centeringOffsetY: number
	) {
		// Varying variables for shader communication
		const vWaveHeight = varying(float());
		const vStateInfo = varying(vec4()); // x: state, y: hover transition, z: animation progress, w: unused
		const vFinalColor = varying(vec3()); // Final per-instance color computed in vertex
		const colorOpacity = varying(float(1.0)); // Opacity for fragment shader

		// Attribute references
		const colRowAttr = attribute('instanceColRow', 'vec2');
		const hoverStateAttr = attribute('instanceHoverState', 'float');
		const timestampAttr = attribute('instanceTimestamp', 'float');
		const stateAttr = attribute('instanceState', 'float');
		const animationProgressAttr = attribute(
			'instanceAnimationProgress',
			'float'
		);
		const targetPositionAttr = attribute('instanceTargetPosition', 'vec3');

		// Uniform constants
		const centeringOffsetXUniform = this.uniforms.centeringOffsetX;
		const centeringOffsetYUniform = this.uniforms.centeringOffsetY;
		const scaleUniform = this.uniforms.scale;
		const frequencyUniform = this.uniforms.frequency;
		const amplitudeUniform = this.uniforms.amplitude;
		const zOffsetUniform = this.uniforms.zOffset;
		const currentTimeUniform = this.uniforms.currentTime;
		const transitionSpeedUniform = this.uniforms.transitionSpeed;
		const atTargetRotXUniform = this.uniforms.atTargetRotX;
		const atTargetRotYUniform = this.uniforms.atTargetRotY;
		const atTargetRotZUniform = this.uniforms.atTargetRotZ;
		const idleColorUniform = this.uniforms.idleColor;
		const mainColorUniform = this.uniforms.mainColor;
		const hoverColorUniform = this.uniforms.hoverColor;
		const selectedColorUniform = this.uniforms.selectedColor;
		const targetColorUniform = this.uniforms.targetColor;

		const animateZ = Fn(() => {
			const position = positionLocal;
			const col = colRowAttr.x;
			const row = colRowAttr.y;
			const hoverState = hoverStateAttr;
			const timestamp = timestampAttr;
			const currentState = stateAttr;
			const animProgress = animationProgressAttr;
			const targetPos = targetPositionAttr;
			const staticBaseZ = float(0.0); // No wave movement for selected states

			// Calculate base grid position (this should match your for loop positioning)
			const baseGridX = col.mul(spacing).add(centeringOffsetXUniform);
			const baseGridY = float(this.numRows - 1)
				.sub(row)
				.mul(spacing)
				.add(centeringOffsetYUniform);

			// Calculate wave effect for Z position
			const normX = baseGridX.div(gridWidth * 0.325);
			const normY = baseGridY.div(gridHeight * 0.275);
			const distanceFromCenter = normX.mul(normX).add(normY.mul(normY)).sqrt();
			const maxDistance = float(2.0);
			const radialMultiplier = maxDistance
				.sub(distanceFromCenter)
				.div(maxDistance)
				.max(0.0);

			const noiseInput = vec2(
				baseGridX.mul(scaleUniform),
				baseGridY.mul(scaleUniform).add(time.mul(frequencyUniform))
			);
			const noiseValue = snoise(noiseInput);
			const normalizedNoise = noiseValue.add(1.0).mul(0.5);
			const baseWaveZ = normalizedNoise
				.mul(amplitudeUniform)
				.mul(radialMultiplier)
				.add(zOffsetUniform);

			// Smooth hover transition
			const timeSinceChange = currentTimeUniform.sub(timestamp);
			const transitionProgress = float(1.0)
				.sub(float(-1.0).mul(timeSinceChange.mul(transitionSpeedUniform)).exp())
				.clamp(0.0, 1.0);

			const hoverTransition = hoverState
				.equal(1.0)
				.select(transitionProgress, float(1.0).sub(transitionProgress));

			// Enhanced easing function for smoother animation
			const easedProgress = animProgress.mul(animProgress).mul(animProgress); // Ease in cubic

			// Calculate movement direction and distance for rotation
			// Use a hover-independent origin to avoid target path mismatch and shifts
			const originalCenter = vec3(baseGridX, baseGridY, staticBaseZ.add(2.0));
			const movementVector = targetPos.sub(originalCenter);
			const movementDirection = movementVector.normalize();

			// Create a rotation curve that starts at 0, peaks in middle, returns to 0
			// Using sin wave: 0 -> 1 -> 0 over the animation progress
			const rotationCurve = float(3.14159).mul(easedProgress).sin(); // Sine wave from 0 to PI

			// Calculate rotation angles based on movement direction
			const maxRotation = float(1.5); // Maximum rotation in radians (about 85 degrees)

			// Rotate around X axis based on Y movement (up/down)
			const rotationX = movementDirection.y
				.mul(maxRotation)
				.mul(rotationCurve)
				.negate();

			// Reduce roll around Z to keep motion feeling horizontal
			const rotationZ = movementDirection.x
				.mul(maxRotation)
				.mul(0.15)
				.mul(rotationCurve);

			// Stronger horizontal yaw towards the travel direction (left/right)
			const rotationY = movementDirection.x
				.mul(maxRotation)
				.mul(0.8)
				.mul(rotationCurve);

			// Create rotation matrices
			const cosX = rotationX.cos();
			const sinX = rotationX.sin();
			const cosY = rotationY.cos();
			const sinY = rotationY.sin();
			const cosZ = rotationZ.cos();
			const sinZ = rotationZ.sin();

			// Apply rotations to the local position (step by step)
			// Only apply rotation during animation
			const shouldRotate = currentState.equal(float(RectangleState.ANIMATING));

			// Step 1: Rotation around X axis
			const rotatedPosX = vec3(
				position.x,
				position.y.mul(cosX).sub(position.z.mul(sinX)),
				position.y.mul(sinX).add(position.z.mul(cosX))
			);

			// Step 2: Rotation around Y axis
			const rotatedPosY = vec3(
				rotatedPosX.x.mul(cosY).add(rotatedPosX.z.mul(sinY)),
				rotatedPosX.y,
				rotatedPosX.x.mul(sinY.negate()).add(rotatedPosX.z.mul(cosY))
			);

			// Step 3: Rotation around Z axis
			const rotatedPosZ = vec3(
				rotatedPosY.x.mul(cosZ).sub(rotatedPosY.y.mul(sinZ)),
				rotatedPosY.x.mul(sinZ).add(rotatedPosY.y.mul(cosZ)),
				rotatedPosY.z
			);

			// Build a rotation from uniforms for AT_TARGET state
			const atCosX = atTargetRotXUniform.cos();
			const atSinX = atTargetRotXUniform.sin();
			const atCosY = atTargetRotYUniform.cos();
			const atSinY = atTargetRotYUniform.sin();
			const atCosZ = atTargetRotZUniform.cos();
			const atSinZ = atTargetRotZUniform.sin();

			// Apply AT_TARGET rotation to local position
			const atRotX = vec3(
				position.x,
				position.y.mul(atCosX).sub(position.z.mul(atSinX)),
				position.y.mul(atSinX).add(position.z.mul(atCosX))
			);
			const atRotY = vec3(
				atRotX.x.mul(atCosY).add(atRotX.z.mul(atSinY)),
				atRotX.y,
				atRotX.x.mul(atSinY.negate()).add(atRotX.z.mul(atCosY))
			);
			const atRotZ = vec3(
				atRotY.x.mul(atCosZ).sub(atRotY.y.mul(atSinZ)),
				atRotY.x.mul(atSinZ).add(atRotY.y.mul(atCosZ)),
				atRotY.z
			);
			const isAtTargetState = currentState.equal(
				float(RectangleState.AT_TARGET)
			);

			// Use rotated position during animation; otherwise original
			const baseRotPos = shouldRotate.select(rotatedPosZ, position);

			const blendStart = float(0.8); // start blending at 80% progress
			const blendWidth = float(0.2); // reach full blend by 100%
			const rawBlend = animationProgressAttr
				.sub(blendStart)
				.div(blendWidth)
				.clamp(0.0, 1.0);
			// Smoothstep-like easing: b*b*(3 - 2*b)
			const blendEased = rawBlend
				.mul(rawBlend)
				.mul(float(3.0).sub(rawBlend.mul(2.0)));

			// While animating: blend from current animated rotation to the final at-target rotation
			const blendedDuringAnim = mix(baseRotPos, atRotZ, blendEased);
			// When state is AT_TARGET, use full at-target rotation
			const finalRotatedPos = isAtTargetState.select(atRotZ, blendedDuringAnim);
			// Smaller selected Z offset
			const selectedZBase = float(1.5); // Reduced from 2.0

			// For animating: calculate offset from original position to target with easing
			const offsetToTarget = targetPos.sub(originalCenter);
			const queuedRestingPos = vec3(
				float(0.0),
				float(0.0),
				staticBaseZ.add(selectedZBase)
			);
			// Hover effects - only for interactive states
			const canHover = currentState
				.equal(float(RectangleState.IDLE))
				.or(currentState.equal(float(RectangleState.HOVERED)))
				.or(currentState.equal(float(RectangleState.QUEUED)));

			const staticHoverLift = hoverTransition.mul(1.5);
			const effectiveHoverOffset = canHover.select(staticHoverLift, float(0.0));

			const finalOffset = currentState
				.equal(float(RectangleState.IDLE))
				.or(currentState.equal(float(RectangleState.HOVERED)))
				.select(
					// IDLE/HOVERED → use waves
					vec3(float(0.0), float(0.0), baseWaveZ.add(effectiveHoverOffset)),
					currentState.equal(float(RectangleState.QUEUED)).select(
						// QUEUED → smoothly move from wave/hover to queued resting pos
						mix(
							vec3(float(0.0), float(0.0), baseWaveZ.add(effectiveHoverOffset)),
							queuedRestingPos,
							transitionProgress
						),
						currentState.equal(float(RectangleState.ANIMATING)).select(
							// ANIMATING → also blend the start, then add movement towards target
							mix(
								vec3(
									float(0.0),
									float(0.0),
									baseWaveZ.add(effectiveHoverOffset)
								),
								queuedRestingPos,
								transitionProgress
							).add(offsetToTarget.mul(easedProgress)),
							// Fallback (same as above)
							mix(
								vec3(
									float(0.0),
									float(0.0),
									baseWaveZ.add(effectiveHoverOffset)
								),
								queuedRestingPos,
								transitionProgress
							).add(offsetToTarget.mul(easedProgress))
						)
					)
				);

			// Apply offset to the rotated vertex position
			const finalPosition = finalRotatedPos.add(finalOffset);

			// Pass data to fragment shader
			vWaveHeight.assign(baseWaveZ);
			vStateInfo.assign(
				vec4(currentState, hoverTransition, easedProgress, transitionProgress)
			);

			// Compute final color in vertex to avoid per-fragment divergence
			const stateRounded = currentState.add(0.5).floor();
			const isQueued = stateRounded.equal(float(RectangleState.QUEUED));
			const isAnimating = stateRounded.equal(float(RectangleState.ANIMATING));
			const isAtTarget = stateRounded.equal(float(RectangleState.AT_TARGET));
			const isClicked = stateRounded.greaterThan(float(RectangleState.HOVERED));

			const maxZOffset = 3.5;
				const colorMixFactor = (baseWaveZ.div(maxZOffset)).sub(0.10).clamp(0.0, 1.0);
			const baseWaveColor = mix(
				idleColorUniform,
				mainColorUniform,
				colorMixFactor
			);
			const hoveredColor = mix(
				baseWaveColor,
				hoverColorUniform,
				hoverTransition.mul(0.6)
			);

			const startColor = hoveredColor; // source before selection
			// Stage 1: move to selected color while queued (from startColor)
			const selectedStageMix = isQueued.select(transitionProgress, float(1.0));
			const preAnimColor = mix(
				startColor,
				selectedColorUniform,
				selectedStageMix
			);
			// Stage 2: during animation move from selected to target (faster transition at 75%)
			const colorTransitionProgress = animProgress.div(0.75).clamp(0.0, 1.0);
			const duringAnimColor = mix(
				preAnimColor,
				targetColorUniform,
				colorTransitionProgress
			);

			const finalVertexColor = isClicked
				.select(
					// clicked path
					isAtTarget.select(
						targetColorUniform,
						isAnimating.select(duringAnimColor, preAnimColor)
					),
					// not clicked: idle/hovered path
					hoveredColor
				)
				.toVar();

			vFinalColor.assign(finalVertexColor);
			colorOpacity.assign(isAtTarget.select(float(0.0), float(1.0))); // Full opacity for now

			return finalPosition;
		});

		// Color shader
		const animateColor = Fn(() => {
			return vec4(vFinalColor, colorOpacity);
		});

		// Apply the shaders
		material.positionNode = animateZ();
		material.colorNode = animateColor();
	}

	private initializeInstances(
		instanceColRow: Float32Array,
		instanceHoverState: Float32Array,
		instanceTimestamp: Float32Array,
		instanceState: Float32Array,
		instanceAnimationProgress: Float32Array,
		instanceAnimStartTime: Float32Array,
		instanceTargetPosition: Float32Array,
		instanceQueuePosition: Float32Array,
		spacing: number,
		centeringOffsetX: number,
		centeringOffsetY: number
	) {
		const dummy = new THREE.Object3D();
		let instanceIndex = 0;
		const centeringOffsetZ = 9.05;

		for (let row = 0; row < this.numRows; row++) {
			for (let col = 0; col < this.numCols; col++) {
				dummy.position.x = col * spacing + centeringOffsetX;
				dummy.position.y =
					(this.numRows - 1 - row) * spacing + centeringOffsetY;
				dummy.position.z = 0 + centeringOffsetZ;
				dummy.updateMatrix();
				this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);

				// Set all instance attributes
				instanceColRow[instanceIndex * 2] = col;
				instanceColRow[instanceIndex * 2 + 1] = row;
				instanceHoverState[instanceIndex] = 0;
				instanceTimestamp[instanceIndex] = 0;
				instanceState[instanceIndex] = RectangleState.IDLE;
				instanceAnimationProgress[instanceIndex] = 0.0;
				instanceTargetPosition[instanceIndex * 3] = this.targetPosition.x;
				instanceTargetPosition[instanceIndex * 3 + 1] = this.targetPosition.y;
				instanceTargetPosition[instanceIndex * 3 + 2] = this.targetPosition.z;
				instanceQueuePosition[instanceIndex] = -1;
				instanceAnimStartTime[instanceIndex] = 0.0;

				instanceIndex++;
			}
		}
	}

	private setGeometryAttributes(
		instanceColRow: Float32Array,
		instanceHoverState: Float32Array,
		instanceTimestamp: Float32Array,
		instanceState: Float32Array,
		instanceAnimationProgress: Float32Array,
		instanceAnimStartTime: Float32Array,
		instanceTargetPosition: Float32Array,
		instanceQueuePosition: Float32Array
	) {
		// Set all geometry attributes
		this.instancedMesh.geometry.setAttribute(
			'instanceColRow',
			new THREE.InstancedBufferAttribute(instanceColRow, 2)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceHoverState',
			new THREE.InstancedBufferAttribute(instanceHoverState, 1)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceTimestamp',
			new THREE.InstancedBufferAttribute(instanceTimestamp, 1)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceState',
			new THREE.InstancedBufferAttribute(instanceState, 1)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceAnimationProgress',
			new THREE.InstancedBufferAttribute(instanceAnimationProgress, 1)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceTargetPosition',
			new THREE.InstancedBufferAttribute(instanceTargetPosition, 3)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceQueuePosition',
			new THREE.InstancedBufferAttribute(instanceQueuePosition, 1)
		);
		this.instancedMesh.geometry.setAttribute(
			'instanceAnimStartTime',
			new THREE.InstancedBufferAttribute(instanceAnimStartTime, 1)
		);
	}

	private createInteractionAttributesReferences() {
		this.interactionAttributes = {
			hover: this.instancedMesh.geometry.attributes
				.instanceHoverState as THREE.InstancedBufferAttribute,
			timestamp: this.instancedMesh.geometry.attributes
				.instanceTimestamp as THREE.InstancedBufferAttribute,
			state: this.instancedMesh.geometry.attributes
				.instanceState as THREE.InstancedBufferAttribute,
			animationProgress: this.instancedMesh.geometry.attributes
				.instanceAnimationProgress as THREE.InstancedBufferAttribute,
			targetPosition: this.instancedMesh.geometry.attributes
				.instanceTargetPosition as THREE.InstancedBufferAttribute,
			queuePosition: this.instancedMesh.geometry.attributes
				.instanceQueuePosition as THREE.InstancedBufferAttribute,
			animStartTime: this.instancedMesh.geometry.attributes
				.instanceAnimStartTime as THREE.InstancedBufferAttribute
		};
	}

	updateAllTargetPositions() {
		if (
			!this.interactionAttributes ||
			!this.interactionAttributes.targetPosition
		)
			return;

		const attr = this.interactionAttributes.targetPosition;
		const arr = attr.array as Float32Array;
		for (let i = 0; i < attr.count; i++) {
			const j = i * 3;
			arr[j] = this.targetPosition.x;
			arr[j + 1] = this.targetPosition.y;
			arr[j + 2] = this.targetPosition.z;
		}
		attr.needsUpdate = true;
	}

	dispose() {
		if (this.isDisposed) return; // Already disposed
		this.isDisposed = true;

		if (this.instancedMesh) {
			// Remove from scene first
			this.scene.remove(this.instancedMesh);

			// Dispose geometry
			if (this.instancedMesh.geometry) {
				this.instancedMesh.geometry.dispose();
			}

			// Dispose material(s) safely
			if (this.instancedMesh.material) {
				try {
					if (Array.isArray(this.instancedMesh.material)) {
						this.instancedMesh.material.forEach((material) => {
							if (material && typeof material.dispose === 'function') {
								material.dispose();
							}
						});
					} else {
						if (typeof this.instancedMesh.material.dispose === 'function') {
							this.instancedMesh.material.dispose();
						}
					}
				} catch (error) {
					console.warn('Error disposing instanced mesh material:', error);
				}
			}

			// Clear references
			this.instancedMesh = undefined as any;
		}

		// Clear other references
		this.interactionAttributes = undefined as any;
		this.uniforms = {};
	}
}

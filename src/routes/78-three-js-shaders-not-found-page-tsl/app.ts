import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI, { Controller } from 'lil-gui';
import gsap from 'gsap';
import {
	pass,
	time,
	instanceIndex,
	vertexIndex,
	sin,
	cos,
	vec2,
	vec3,
	vec4,
	float,
	Fn,
	mix,
	uniform,
	smoothstep,
	instancedArray,
	length,
	atan,
	normalize,
	abs,
	pow,
	add,
	sub,
	If,
	fract
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { simplexNoise3d } from '$lib/utils/webGPU/simplexNoise3d';

interface SketchOptions {
	dom: HTMLElement;
}

export default class Sketch {
	scene: THREE.Scene;
	container: HTMLElement;
	width: number;
	height: number;
	pixelRatio: number;
	renderer: THREE.WebGPURenderer;
	camera: THREE.PerspectiveCamera;
	controls: OrbitControls;
	isPlaying: boolean;
	raycaster: THREE.Raycaster;
	pointer: THREE.Vector2;

	dummy!: THREE.Mesh;
	targetMouse: THREE.Vector3;
	size: number;
	count: number;

	uniforms!: { [key: string]: any };
	particlesPositionsBuffer!: THREE.StorageBufferNode;
	particlesInfoBuffer!: THREE.StorageBufferNode;

	material!: THREE.PointsNodeMaterial;
	points!: THREE.Points;

	gui!: GUI;
	controllers!: { [key: string]: Controller };

	computeNode!: THREE.ComputeNode;

	circleCount: number;
	streamCount: number;

	postProcessing!: THREE.PostProcessing;
	bloomPass!: THREE.Node;
	clock!: THREE.Clock;

	constructor(options: SketchOptions) {
		this.clock = new THREE.Clock();
		this.scene = new THREE.Scene();
		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);

		this.renderer = new THREE.WebGPURenderer();
		this.renderer.setPixelRatio(this.pixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(new THREE.Color(0x000000), 1);
		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(
			70,
			this.width / this.height,
			0.01,
			1000
		);
		this.camera.position.set(0.0, 0.0, 4.0);
		this.camera.lookAt(0, 0, 0);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enabled = false;

		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.targetMouse = new THREE.Vector3(0, 0, 0);

		this.size = 256;
		this.circleCount = this.size ** 2;
		this.streamCount = 40000;
		this.count = this.circleCount + this.streamCount;

		this.uniforms = {
			currentMouse: uniform(new THREE.Vector2(0, 0)),
			mouseMode: uniform(1.0),
			noiseScale: uniform(4.0),
			noiseStrength: uniform(0.15),
			circularForce: uniform(0.7),
			rotationSpeed: uniform(0.15),
			attractionStrength: uniform(0.1),
			progress: uniform(0.0),
			bloomStrength: uniform(0.2),
			bloomRadius: uniform(0.25),
			bloomThreshold: uniform(0.1),
			simTime: uniform(0.0),
			fadingSpeed: uniform(0.25)
		};

		this.isPlaying = true;
		this.setupLights();
		this.setUpCompute();
		this.addObjects();
		this.setupBloom();
		this.setUpResize();
		this.setupRaycaster();
		this.setUpSettings();
		this.setupButtonHover();

		this.computeNode = this.createComputeShader();

		this.init();
	}

	async init() {
		await this.renderer.init();
		this.render();
	}

	setupLights() {
		const ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
		directionalLight.position.set(1, 1, 1);
		this.scene.add(directionalLight);
	}

	setUpCompute() {
		const positions = new Float32Array(this.count * 3);
		const infoArray = new Float32Array(this.count * 4);

		// SETUP CIRCLE
		for (let i = 0; i < this.size; i++) {
			for (let j = 0; j < this.size; j++) {
				const index = i + j * this.size;
				const theta = Math.random() * Math.PI * 2;
				const r = 0.5 + Math.random() * 0.5;
				positions[index * 3 + 0] = Math.cos(theta) * r;
				positions[index * 3 + 1] = Math.sin(theta) * r;
				positions[index * 3 + 2] = 0;

				infoArray[index * 4 + 0] = 0.5 + Math.random();
				infoArray[index * 4 + 1] = 0.5 + Math.random();
				infoArray[index * 4 + 2] = 1;
				infoArray[index * 4 + 3] = 1;
			}
		}

		// SETUP STREAM
		for (let i = 0; i < this.streamCount; i++) {
			const index = this.circleCount + i;

			positions[index * 3 + 0] = 0;
			positions[index * 3 + 1] = 0;
			positions[index * 3 + 2] = 0;

			infoArray[index * 4 + 0] = 0.2 + Math.random() * 0.3; // Speed
			infoArray[index * 4 + 1] = i % 2; // Stream Type (0: Straight, 1: Bent)
			infoArray[index * 4 + 2] = Math.floor(i / 2) % 2; // System Index (0: Left, 1: Right)
			infoArray[index * 4 + 3] = Math.random(); // Random offset
		}

		this.particlesPositionsBuffer = instancedArray(positions, 'vec3');
		this.particlesInfoBuffer = instancedArray(infoArray, 'vec4');
	}

	private createComputeShader() {
		const computeFn = Fn(() => {
			const pos = this.particlesPositionsBuffer.element(instanceIndex);
			const info = this.particlesInfoBuffer.element(instanceIndex);

			const newPos = pos.toVar();
			const mouse = this.uniforms.currentMouse;
			const uCircularForce = this.uniforms.circularForce;
			const uAttractionStrength = this.uniforms.attractionStrength;
			const uNoiseScale = this.uniforms.noiseScale;
			const uNoiseStrength = this.uniforms.noiseStrength;
			const uMouseMode = this.uniforms.mouseMode;
			const uRotationSpeed = this.uniforms.rotationSpeed;
			const uProgress = this.uniforms.progress;

			// ---------- CIRCLE LOGIC ----------
			If(instanceIndex.lessThan(this.circleCount), () => {
				const radius = float(length(newPos.xy)).mul(0.25).add(0.75).toVar();

				const distToRadius = abs(newPos.x.sub(radius));
				const circularForce = float(1.0)
					.sub(smoothstep(0.0, 0.4, distToRadius))
					.toVar();

				const rotMix = mix(
					float(0.7),
					float(0.8),
					circularForce.mul(uCircularForce)
				);
				const angle = atan(newPos.y, newPos.x)
					.sub(info.y.mul(uRotationSpeed).mul(rotMix))
					.toVar();

				const targetRadius = mix(info.x, float(0.9), float(1.65));
				const radiusMix = mix(
					float(0.2),
					float(0.5),
					circularForce.mul(uCircularForce)
				);
				radius.addAssign(targetRadius.sub(radius).mul(radiusMix));

				const targetPos = vec3(cos(angle), sin(angle), float(0.0)).mul(radius);

				newPos.xy.addAssign(
					targetPos.xy.sub(newPos.xy).mul(uAttractionStrength)
				);

				const scaledRandom = pow(abs(info.x.sub(0.25)), 10.0);
				const scaledProgress = pow(uProgress, 2.0);
				const zVal = scaledRandom
					.mul(scaledProgress)
					.mul(50.0)
					.add(scaledProgress.mul(5.0));
				newPos.z.assign(zVal);

				// ---------- STREAM LOGIC ----------
			}).Else(() => {
				const targetPos2D = vec2(0.0).toVar();
				const simTime = this.uniforms.simTime;
				const life = fract(simTime.mul(info.x).add(info.w)).toVar();

				const scale = float(2.1);
				const startP = vec2(0.0, 0.475).mul(scale);
				const endVertical = vec2(0.0, -0.525).mul(scale);

				const turnPoint = vec2(-0.4, 0.1).mul(scale);
				const endBent = vec2(0.4, 0.1).mul(scale);

				If(info.y.lessThan(0.5), () => {
					targetPos2D.assign(mix(startP, endVertical, life));
				}).Else(() => {
					const split = float(0.41);
					If(life.lessThan(split), () => {
						const t = life.div(split);
						targetPos2D.assign(mix(startP, turnPoint, t));
					}).Else(() => {
						const t = life.sub(split).div(float(1.0).sub(split));
						targetPos2D.assign(mix(turnPoint, endBent, t));
					});
				});

				If(info.z.lessThan(0.5), () => {
					targetPos2D.x.addAssign(-2.0);
				}).Else(() => {
					targetPos2D.x.addAssign(2.25);
				});

				// 1. DIFFERENT ATTRACTION POINTS (Parallel Lanes)
				// We use their unique random seed to assign them a permanent, dedicated offset from the center.
				const laneOffset = vec2(
					sin(info.w.mul(132.5)),
					cos(info.w.mul(452.1))
				).mul(0.065); // Controls the total width of the stream

				// This is the particle's unique target coordinate
				const personalTarget = targetPos2D.add(laneOffset);
				const zBase = sin(info.w.mul(0.01)).mul(0.05);

				If(life.lessThan(0.05), () => {
					newPos.xy.assign(personalTarget);
					newPos.z.assign(zBase);
				}).Else(() => {
					// 2. THE "SLACK LEASH" FIX
					const distToTarget = length(personalTarget.sub(newPos.xy));

					// If they are within 0.08 units of their lane, attraction drops to 0.
					// This creates a "dead zone" where the curl noise can freely group and clump them
					// without the jitter fiercely fighting to separate them again!
					const freedomMask = smoothstep(0.0, 0.08, distToTarget);

					// Mouse Interaction Mask (same as before)
					const distToMouse = length(newPos.xy.sub(mouse));
					const interactionMask = smoothstep(0.0, 0.3, distToMouse);

					const effectiveAttraction = uAttractionStrength
						.mul(0.4)
						.mul(freedomMask)
						.mul(interactionMask);

					newPos.xy.addAssign(
						personalTarget.sub(newPos.xy).mul(effectiveAttraction)
					);
					newPos.z.assign(zBase);
				});
			});

			// ---------- COMMON PHYSICS ----------

			const simTime = this.uniforms.simTime;
			const noiseTime = simTime.mul(0.25);

			// Use projected 2D position (Z=0) for noise sampling to ensure all particles
			// (streams and circle) flow in identical coherent lines, avoiding lack of clumping.
			const noisePos = vec3(newPos.xy, float(0.0)).mul(uNoiseScale);
			const noisePosTime = vec3(
				noisePos.x,
				noisePos.y,
				noisePos.z.add(noiseTime)
			);

			const noiseFn = simplexNoise3d as unknown as (
				v: THREE.Node
			) => THREE.Node;
			const dx = sub(
				noiseFn(add(noisePosTime, vec3(0.1, 0, 0))),
				noiseFn(sub(noisePosTime, vec3(0.1, 0, 0)))
			);
			const dy = sub(
				noiseFn(add(noisePosTime, vec3(0, 0.1, 0))),
				noiseFn(sub(noisePosTime, vec3(0, 0.1, 0)))
			);

			// Cross gradient approximating curl noise
			const curlVec = vec2(dy.negate(), dx).mul(10.0);

			// Apply noise force - unified strength
			If(instanceIndex.lessThan(this.circleCount), () => {
				newPos.xy.addAssign(curlVec.mul(uNoiseStrength).div(100.0));
			}).Else(() => {
				newPos.xy.addAssign(curlVec.mul(uNoiseStrength).div(125.0));
			});

			const dist = length(newPos.xy.sub(mouse)).sub(0.1);
			const dir = normalize(newPos.xy.sub(mouse));
			const mouseForce = dir
				.mul(0.1)
				.mul(smoothstep(0.05, 0.0, dist))
				.mul(uMouseMode);
			newPos.xy.addAssign(mouseForce);

			return pos.assign(newPos);
		});

		return computeFn().compute(this.count);
	}

	setupStreamData() {
		// Removed
	}

	createStreamComputeShader() {
		// Removed
	}

	addStreamObjects() {
		// Removed
	}

	addObjects() {
		this.material = new THREE.PointsNodeMaterial({
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			sizeAttenuation: true
		});

		const uTime = time;
		const uProgress = this.uniforms.progress;

		// Use vertexIndex to access the buffer for points
		const bufferIndex = vertexIndex;

		this.material.positionNode = Fn(() => {
			return this.particlesPositionsBuffer.element(bufferIndex);
		})();

		this.material.sizeNode = Fn(() => {
			return float(0.0075);
		})();

		this.material.colorNode = Fn(() => {
			const finalColor = vec4(0.0).toVar();
			const info = this.particlesInfoBuffer.element(bufferIndex);

			If(bufferIndex.lessThan(this.circleCount), () => {
				const pos = this.particlesPositionsBuffer.element(bufferIndex);
				const angle = atan(pos.y, pos.x);
				const scaledAngle = smoothstep(
					-0.5,
					0.75,
					sin(angle.add(uTime.mul(0.6)))
				);
				const baseVal = float(0.05).add(float(0.5).mul(scaledAngle));
				const baseColor = vec4(baseVal);
				const scaledProgress = smoothstep(0.0, 0.25, uProgress);
				finalColor.assign(mix(baseColor, vec4(1.0), scaledProgress));
			}).Else(() => {
				const simTime = this.uniforms.simTime;
				const life = fract(simTime.mul(info.x).add(info.w));

				// Create a moving wave of opacity along the stream
				// life (0-1) acts as the spatial coordinate along the path
				const wave = sin(life.mul(4.5).sub(simTime.mul(2.0)));
				const animatedAlpha = float(0.03).add(
					float(0.9).mul(smoothstep(-0.6, 0.7, wave))
				);

				// Fade in/out at ends: much sharper fade out
				const edgeFade = smoothstep(0.0, 0.2, life).mul(
					smoothstep(1.0, 0.7, life)
				);

				const fadeOut = float(1.0).sub(uProgress.mul(7.5));

				// White color
				finalColor.assign(vec4(1.0, 1.0, 1.0, animatedAlpha.mul(edgeFade).mul(fadeOut)));
			});

			return finalColor;
		})();

		// Create a geometry with enough vertices to match the particle count
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute(
			'position',
			new THREE.BufferAttribute(new Float32Array(this.count * 3), 3)
		);

		this.points = new THREE.Points(geometry, this.material);
		this.scene.add(this.points);
	}

	setupBloom() {
		const scenePass = pass(this.scene, this.camera);
		const outputPass = scenePass.getTextureNode();

		this.bloomPass = bloom(
			outputPass,
			this.uniforms.bloomStrength as unknown as number,
			this.uniforms.bloomRadius as unknown as number,
			this.uniforms.bloomThreshold as unknown as number
		);

		this.postProcessing = new THREE.PostProcessing(this.renderer);
		this.postProcessing.outputNode = outputPass.add(this.bloomPass);
	}

	setupRaycaster() {
		this.dummy = new THREE.Mesh(
			new THREE.PlaneGeometry(100, 100, 1, 1),
			new THREE.MeshBasicMaterial({ visible: false })
		);

		window.addEventListener('pointermove', (e) => {
			this.pointer.x = (e.clientX / this.width) * 2 - 1;
			// 56px offset because of header
			this.pointer.y = -((e.clientY - 56) / this.height) * 2 + 1;
			this.raycaster.setFromCamera(this.pointer, this.camera);

			const intersects = this.raycaster.intersectObject(this.dummy);

			if (intersects.length > 0) {
				this.targetMouse.copy(intersects[0].point);
			}
		});

		window.addEventListener('mousedown', () => {
			this.uniforms.mouseMode.value = -1.0;
		});

		window.addEventListener('mouseup', () => {
			this.uniforms.mouseMode.value = 1.0;
		});
	}

	setUpResize() {
		window.addEventListener('resize', this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		// Include subtraction if container needs it
		this.height = this.container.offsetHeight;
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);

		this.renderer.setSize(this.width, this.height);
		this.renderer.setPixelRatio(this.pixelRatio);

		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	setUpSettings() {
		this.gui = new GUI();
		this.controllers = {};

		const simulationFolder = this.gui.addFolder('Simulation');
		this.controllers.noiseScale = simulationFolder
			.add(this.uniforms.noiseScale, 'value', 0.1, 10.0)
			.name('Noise Scale');
		this.controllers.noiseStrength = simulationFolder
			.add(this.uniforms.noiseStrength, 'value', 0.0, 0.75)
			.name('Noise Strength');
		this.controllers.circularForce = simulationFolder
			.add(this.uniforms.circularForce, 'value', 0.0, 2.0)
			.name('Circular Force');
		this.controllers.attractionStrength = simulationFolder
			.add(this.uniforms.attractionStrength, 'value', 0.01, 0.5)
			.name('Attraction Strength');
		simulationFolder.open();

		const bloomFolder = this.gui.addFolder('Bloom');
		bloomFolder
			.add(this.uniforms.bloomStrength, 'value', 0.0, 3.0)
			.name('Strength');
		bloomFolder
			.add(this.uniforms.bloomRadius, 'value', 0.0, 1.0)
			.name('Radius');
		bloomFolder
			.add(this.uniforms.bloomThreshold, 'value', 0.0, 1.0)
			.name('Threshold');

		this.controllers.progress = this.gui
			.add(this.uniforms.progress, 'value', 0.0, 1.0)
			.min(0)
			.max(1)
			.step(0.01)
			.name('Progress');

		const params = {
			toggleProgress: () => {
				const currentProgress = this.uniforms.progress.value as number;
				const targetProgress = currentProgress < 0.5 ? 1 : 0;

				gsap.to(this.uniforms.progress, {
					value: targetProgress,
					duration: 4,
					ease: 'none',
					onUpdate: () => {
						this.controllers.progress.updateDisplay();
					}
				});
			}
		};

		this.gui.add(params, 'toggleProgress').name('Toggle Progress');
	}

	setupButtonHover() {
		const button = document.getElementById('explore-btn');
		if (!button) return;

		button.addEventListener('click', () => {
			const currentProgress = this.uniforms.progress.value as number;
			const targetProgress = currentProgress < 0.5 ? 1 : 0;

			gsap.to(this.uniforms.progress, {
				value: targetProgress,
				duration: 4,
				ease: 'none',
				onUpdate: () => {
					this.controllers.progress.updateDisplay();
				}
			});
		});

		const hoverModes = [
			{ type: 'noise', value: 0 },
			{ type: 'noise', value: 0.6 },
			{ type: 'rotation', value: 0.7 },
			{ type: 'combined', noiseScale: 10, rotationSpeed: 0.04 }
		];
		let currentModeIndex = Math.floor(Math.random() * hoverModes.length);

		const updateGUI = () => {
			Object.values(this.controllers).forEach((controller: Controller) =>
				controller.updateDisplay()
			);
		};

		button.addEventListener('mouseenter', () => {
			const mode = hoverModes[currentModeIndex];
			if (mode.type === 'noise') {
				gsap.to(this.uniforms.noiseStrength, {
					value: mode.value,
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: updateGUI
				});
			} else if (mode.type === 'rotation') {
				gsap.to(this.uniforms.rotationSpeed, {
					value: mode.value,
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: updateGUI
				});
			} else if (mode.type === 'combined') {
				// We assume mode.noiseScale and mode.rotationSpeed exist for combined mode
				gsap.to(this.uniforms.noiseScale, {
					value: mode.noiseScale || 10,
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: updateGUI
				});
				gsap.to(this.uniforms.rotationSpeed, {
					value: mode.rotationSpeed || 0.04,
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: updateGUI
				});
			}
			currentModeIndex = (currentModeIndex + 1) % hoverModes.length;
		});

		button.addEventListener('mouseleave', () => {
			gsap.to(this.uniforms.noiseStrength, {
				value: 0.15,
				duration: 0.5,
				ease: 'power2.out',
				onUpdate: updateGUI
			});
			gsap.to(this.uniforms.rotationSpeed, {
				value: 0.15,
				duration: 0.5,
				ease: 'power2.out',
				onUpdate: updateGUI
			});
			gsap.to(this.uniforms.noiseScale, {
				value: 4.0,
				duration: 0.5,
				ease: 'power2.out',
				onUpdate: updateGUI
			});
		});
	}

	async render() {
		if (!this.isPlaying) return;

		const currentMouse = this.uniforms.currentMouse.value as THREE.Vector2;
		currentMouse.x += (this.targetMouse.x - currentMouse.x) * 0.5;
		currentMouse.y += (this.targetMouse.y - currentMouse.y) * 0.5;

		const dt = this.clock.getDelta();
		const attractionStrength = this.uniforms.attractionStrength.value as number;
		// Base factor 8.0 tuned to match original speed when strength is ~0.1-0.15
		// Previous speed was time * 1.0. With attr=0.1, we need factor 10.0 to match.
		(this.uniforms.simTime.value as number) += dt * attractionStrength * 5.0;

		this.controls.update();

		this.renderer.compute(this.computeNode);
		this.postProcessing.render();

		requestAnimationFrame(this.render.bind(this));
	}

	stop() {
		this.isPlaying = false;
		if (this.gui) this.gui.destroy();
	}
}

import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupCameraPane, setupLightPane } from '$lib/utils/tweakpaneUtils/utils';
import {
	attribute,
	float,
	Fn,
	instancedArray,
	instanceIndex,
	mat4,
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
	pane!: Pane;
	ambientLight!: THREE.AmbientLight;
	pointLight!: THREE.PointLight;
	pointLight2!: THREE.PointLight;
	pointLight3!: THREE.PointLight;
	pointLight4!: THREE.PointLight;
	instancedMesh!: THREE.InstancedMesh;
	uniforms: {
		frequency: any;
		amplitude: any;
		zOffset: any;
		scale: any;
	} = {
		frequency: null,
		amplitude: null,
		zOffset: null,
		scale: null
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
			70,
			this.width / this.height,
			0.01,
			1000
		);
		this.camera.position.set(10, 0, 40);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.isPlaying = true;
		this.setupLights();
		this.createColumn();
		this.createInstancedMesh();
		this.resize();
		this.setUpSettings();
		this.init();
	}

	async init() {
		await this.renderer.init();
		this.render();
	}

	setupLights() {
		this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
		this.scene.add(this.ambientLight);

		// Point Light 1
		this.pointLight = new THREE.PointLight(0xffffff, 500);
		this.pointLight.position.set(-1, 5.0, 20.5);
		this.scene.add(this.pointLight);

		// Point Light 2
		this.pointLight2 = new THREE.PointLight(0xffffff, 75);
		this.pointLight2.position.set(-14.1, 26.2, 15.2);
		this.scene.add(this.pointLight2);

		// Point Light 3
		this.pointLight3 = new THREE.PointLight(0xffffff, 75);
		this.pointLight3.position.set(-16.1, 3.3, 0.0);
		this.scene.add(this.pointLight3);

		// Point Light 4
		this.pointLight4 = new THREE.PointLight(0xffffff, 75);
		this.pointLight4.position.set(-13, -20.7, 16.3);
		this.scene.add(this.pointLight4);
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

	createColumn() {
		const columnWidth = 23;
		const columnHeight = 150;
		this.geometry = new THREE.BoxGeometry(
			columnWidth,
			columnHeight,
			columnWidth
		);
		this.material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide
		});
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.scene.add(this.mesh);
	}

	createInstancedMesh() {
		const positionArray = [
			[0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1],
			[0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1],
			[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
			[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
			[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
			[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0],
			[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0],
			[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0],
			[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0]
		];

		// Calculate count from number of 1s in positionArray
		const count = positionArray.reduce(
			(acc, row) => acc + row.filter((v) => v === 1).length,
			0
		);
		const geometry = new THREE.BoxGeometry(1, 1, 5);
		// Add per-instance row/col attributes (as vec2 for TSL compatibility)
		const instanceColRow = new Float32Array(count * 2);
		const material = new THREE.MeshStandardNodeMaterial({
			color: '#222222',
			side: THREE.DoubleSide
		});

		// Dynamic centering for any column and row count
		const numCols = positionArray[0].length;
		const numRows = positionArray.length;
		const spacing = 1.5; // matches col * 2
		const gridWidth = (numCols - 1) * spacing;
		const gridHeight = (numRows - 1) * spacing;
		const centeringOffsetX = -gridWidth / 2;
		const centeringOffsetY = -gridHeight / 2;

		const frequencyUniform = uniform(0.5);
		const amplitudeUniform = uniform(3.0);
		const zOffsetUniform = uniform(-0.2);
		const scaleUniform = uniform(0.075);
		const secondaryColorUniform = uniform(new THREE.Color(0.02, 0.02, 0.02));
		const mainColorUniform = uniform(portfolioColors.primaryVec3);

		this.uniforms.frequency = frequencyUniform;
		this.uniforms.amplitude = amplitudeUniform;
		this.uniforms.zOffset = zOffsetUniform;
		this.uniforms.scale = scaleUniform;

		this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);

		// Declare the varying outside both functions
		const vWaveHeight = varying(float());

		// Use TSL attribute() for per-instance attributes
		const colRowAttr = attribute('instanceColRow', 'vec2');

		// Pass centeringOffsetX/Y and numCols/Rows as uniforms for TSL
		const centeringOffsetXUniform = uniform(centeringOffsetX);
		const centeringOffsetYUniform = uniform(centeringOffsetY);
		const numColsUniform = uniform(numCols);
		const numRowsUniform = uniform(numRows);

		const animateZ = Fn(() => {
			const position = positionLocal;
			// Use per-instance row/col attributes
			const col = colRowAttr.x;
			const row = colRowAttr.y;

			// Dynamic centering for any column and row count
			const instanceWorldX = col.mul(spacing).add(centeringOffsetXUniform);
			const instanceWorldY = float(numRows - 1)
				.sub(row)
				.mul(spacing)
				.add(centeringOffsetYUniform);
			// Normalize X and Y to [-1, 1] range for perfect circle
			const normX = instanceWorldX.div(gridWidth * 0.95);
			const normY = instanceWorldY.div(gridHeight * 0.5);
			const distanceFromCenter = normX.mul(normX).add(normY.mul(normY)).sqrt();
			const maxDistance = float(1.0);
			const radialMultiplier = maxDistance
				.sub(distanceFromCenter)
				.div(maxDistance)
				.max(0.0);

			// Use simplex noise for organic movement
			const noiseInput = vec2(
				instanceWorldX.mul(scaleUniform),
				instanceWorldY.mul(scaleUniform).add(time.mul(frequencyUniform))
			);
			const noiseValue = snoise(noiseInput);
			// Optionally, remap noiseValue from [-1,1] to [0,1] if you want only positive offsets
			const normalizedNoise = noiseValue.add(1.0).mul(0.5);
			// Apply amplitude and radial multiplier
			const zOffset = normalizedNoise
				.mul(amplitudeUniform)
				.mul(radialMultiplier)
				.add(zOffsetUniform);
			vWaveHeight.assign(zOffset);
			return vec3(position.x, position.y, position.z.add(zOffset));
		});

		const animateColor = Fn(() => {
			// Read from the varying
			const waveHeight = vWaveHeight;

			// Normalize to 0-1 range for color mixing - made more sensitive
			const maxZOffset = 3.0; // Adjust as needed for your effect
			const colorMixFactor = waveHeight.div(maxZOffset).clamp(0.0, 1.0);

			// Define colors from portfolioColors
			const baseColor = secondaryColorUniform;
			const mainColor = mainColorUniform;
			const finalColor = mix(baseColor, mainColor, colorMixFactor);
			return vec4(finalColor, 1.0);
		});

		material.positionNode = animateZ();
		material.colorNode = animateColor();

		// Set up per-instance attributes and instance transforms
		const dummy = new THREE.Object3D();
		let instanceIndex = 0;
		const centeringOffsetZ = 9.05;
		for (let row = 0; row < positionArray.length; row++) {
			for (let col = 0; col < positionArray[row].length; col++) {
				if (positionArray[row][col] === 1) {
					// Flip Y axis for correct visual orientation
					dummy.position.x = col * spacing + centeringOffsetX;
					dummy.position.y =
						(positionArray.length - 1 - row) * spacing + centeringOffsetY;
					dummy.position.z = 0 + centeringOffsetZ;
					dummy.updateMatrix();
					this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
					// Set per-instance attributes (col, row)
					instanceColRow[instanceIndex * 2] = col;
					instanceColRow[instanceIndex * 2 + 1] = row;
					instanceIndex++;
				}
			}
		}

		// Attach per-instance attributes to geometry
		this.instancedMesh.geometry.setAttribute(
			'instanceColRow',
			new THREE.InstancedBufferAttribute(instanceColRow, 2)
		);

		this.instancedMesh.instanceMatrix.needsUpdate = true;
		this.scene.add(this.instancedMesh);
	}

	animateInstancedMesh() {}

	setUpSettings() {
		this.pane = new Pane();
		(document.querySelector('.tp-dfwv') as HTMLElement)!.style.zIndex = '1000';

		const xyz = new THREE.AxesHelper(50);
		this.scene.add(xyz);
		xyz.visible = false;

		// Add frequency, amplitude, zOffset, and scale controls
		// this.pane.addBinding(this.uniforms.frequency, 'value', {
		// 	min: 0,
		// 	max: 2,
		// 	step: 0.1,
		// 	label: 'Frequency'
		// });
		// this.pane.addBinding(this.uniforms.amplitude, 'value', {
		// 	min: 0,
		// 	max: 5,
		// 	step: 0.1,
		// 	label: 'Amplitude'
		// });
		// this.pane.addBinding(this.uniforms.zOffset, 'value', {
		// 	min: -10,
		// 	max: 10,
		// 	step: 0.1,
		// 	label: 'Z Offset'
		// });
		// this.pane.addBinding(this.uniforms.scale, 'value', {
		// 	min: 0.01,
		// 	max: 0.5,
		// 	step: 0.01,
		// 	label: 'Noise Scale'
		// });

		setupCameraPane({
			camera: this.camera,
			pane: this.pane,
			controls: this.controls,
			scene: this.scene,
			defaultOpen: false,
			helperSize: 1.5,
			isActive: false
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight,
			name: 'Point Light',
			scene: this.scene,
			positionRange: { min: -15, max: 15 },
			targetRange: { min: -15, max: 15 },
			showHelper: true,
			isActive: false
		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight2,
			name: 'Point Light 2',
			scene: this.scene,
			positionRange: { min: -50, max: 50 },
			targetRange: { min: -50, max: 50 },
			showHelper: true,
			isActive: false

		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight3,
			name: 'Point Light 3',
			scene: this.scene,
			positionRange: { min: -50, max: 50 },
			targetRange: { min: -50, max: 50 },
			showHelper: true,
			isActive: false

		});

		setupLightPane({
			pane: this.pane,
			light: this.pointLight4,
			name: 'Point Light 4',
			scene: this.scene,
			positionRange: { min: -50, max: 50 },
			targetRange: { min: -50, max: 50 },
			showHelper: true,
			isActive: false

		});
	}

	async render() {
		if (!this.isPlaying) return;
		this.controls.update();
		await this.renderer.renderAsync(this.scene, this.camera);
		requestAnimationFrame(() => this.render());
	}

	stop() {
		this.isPlaying = false;
		window.removeEventListener('resize', this.resize.bind(this));
		this.renderer.dispose();
		if (this.pane) this.pane.dispose();
	}
}

<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { DRACOLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
	import { setupCamera, setupRenderer, setupResizeListener, setupSizes } from './utils';
	import simVertex from './shaders/simVertex.glsl';
	import simFragment from './shaders/simFragment.glsl';
	import parVertex from './shaders/parVertex.glsl';
	import parFragment from './shaders/parFragment.glsl';

	$effect(() => {
		// Setup
		const gui = new GUI({ width: 325 });
		const debugObject: any = {};
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const sizes = setupSizes(window);
		const camera = setupCamera(scene, sizes);
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;
		const renderer = setupRenderer(canvas, sizes);
		setupResizeListener(camera, renderer, sizes);
		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		scene.add(directionalLight);

		// // Plane
		// const plane = new THREE.Mesh(
		// 	new THREE.PlaneGeometry(2, 2, 2),
		// 	new THREE.MeshStandardMaterial({ color: '#aaaaaa' })
		// );
		// scene.add(plane);

		const getRenderTarget = () => {
			const renderTarget = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat
			});
			return renderTarget;
		};

		// SETUP FBO
		const size = 128;
		let fbo = getRenderTarget();
		let fbo1 = getRenderTarget();

		const fboScene = new THREE.Scene();
		const fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
		fboCamera.position.set(0, 0, 0.5);
		fboCamera.lookAt(0, 0, 0);
		let geometry = new THREE.PlaneGeometry(2, 2);

		const data = new Float32Array(size * size * 4);

		for (let i = 0; i < data.length; i++) {
			for (let j = 0; j < 4; j++) {
				let index = (i + j * size) * 4;
				let theta = Math.random() * Math.PI * 2;
				let r = 0.5 + 0.5 * Math.random();
				data[index] = Math.cos(theta) * r;
				data[index + 1] = Math.sin(theta) * r;
				data[index + 2] = 1;
				data[index + 3] = 1;
			}
		}

		const fboTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
		fboTexture.needsUpdate = true;
		fboTexture.magFilter = THREE.NearestFilter;
		fboTexture.minFilter = THREE.NearestFilter;

		const fboMaterial = new THREE.ShaderMaterial({
			vertexShader: simVertex,
			fragmentShader: simFragment,
			uniforms: {
				uPositions: { value: fboTexture },
				uTime: { value: 0 },
				resolution: { value: new THREE.Vector4() }
			}
		});

		const fboMesh = new THREE.Mesh(geometry, fboMaterial);
		fboScene.add(fboMesh);

		// ADD OBJECTS
		const material = new THREE.ShaderMaterial({
			side: THREE.DoubleSide,
			uniforms: {
				uTime: { value: 0 },
				uPositions: { value: null },
				uTexture: { value: new THREE.Vector4() }
			},

			vertexShader: parVertex,
			fragmentShader: parFragment
		});

		const count = size ** 2;
		let geometry2 = new THREE.BufferGeometry();
		let positions = new Float32Array(count * 3);
		let uv = new Float32Array(count * 2);

		for (let i = 0; i < size; i++) {
			for (let j = 0; j < size; j++) {
				let index = i + j * size;
				positions[index * 3] = Math.random();
				positions[index * 3 + 1] = Math.random();
				positions[index * 3 + 2] = 0;
				uv[index * 2] = i / size;
				uv[index * 2 + 1] = j / size;
			}
		}

		geometry2.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry2.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

		material.uniforms.uPositions.value = fboTexture;
		const points = new THREE.Points(geometry2, material);
		scene.add(points);

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update material
			material.uniforms.uTime.value = elapsedTime;
			fboMaterial.uniforms.uTime.value = elapsedTime;

			controls.update();

			fboMaterial.uniforms.uPositions.value = fbo1.texture;
			material.uniforms.uPositions.value = fbo.texture;

			// Render
			renderer.setRenderTarget(fbo);
			renderer.render(fboScene, fboCamera);
			renderer.setRenderTarget(null);
			renderer.render(scene, camera);

			// Swap FBOs
			let temp = fbo;
			fbo = fbo1;
			fbo1 = temp;

			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

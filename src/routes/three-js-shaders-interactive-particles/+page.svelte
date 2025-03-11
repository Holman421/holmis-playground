<script lang="ts">
	import * as THREE from 'three';
	import GUI from 'lil-gui';
	import fboFragment from './shaders/fbo/fboFragment.glsl';
	import fboVertex from './shaders/fbo/fboVertex.glsl';
	import parFragment from './shaders/particles/parFragment.glsl';
	import parVertex from './shaders/particles/parVertex.glsl';
	import {
		addCamera,
		addControls,
		addLight,
		addRenderer,
		getSizes,
		resizeRenderer
	} from './utils/utils';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {};
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();
		const sizes = getSizes(window);
		const size = 128;
		const count = 128 * 128;

		const addObject = (fboTexture: any) => {
			const geometry = new THREE.BufferGeometry();
			const positions = new Float32Array(count * 3);
			const uv = new Float32Array(count * 2);

			for (let i = 0; i < size; i++) {
				for (let j = 0; j < size; j++) {
					let index = i + j * size;
					positions[index * 3 + 0] = Math.random();
					positions[index * 3 + 1] = Math.random();
					positions[index * 3 + 2] = 0;
					uv[index * 2 + 0] = i / size;
					uv[index * 2 + 1] = j / size;
				}
			}

			geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

			const material = new THREE.ShaderMaterial({
				side: THREE.DoubleSide,
				uniforms: {
					uTime: { value: 0 },
					uResolution: { value: new THREE.Vector4() },
					uPositions: { value: new THREE.DataTexture() }
				},
				vertexShader: parVertex,
				fragmentShader: parFragment
			});
			material.uniforms.uPositions.value = fboTexture;
			const points = new THREE.Points(geometry, material);
			scene.add(points);

			return { geometry, material };
		};

		const getRenderTarget = () => {
			const renderTarget = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType
			});
			return renderTarget;
		};

		const setupFBO = () => {
			let fbo1 = getRenderTarget();
			let fbo2 = getRenderTarget();

			const fboScene = new THREE.Scene();
			const fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
			fboCamera.position.set(0, 0, 0.5);
			fboCamera.lookAt(0, 0, 0);
			let geometry = new THREE.PlaneGeometry(2, 2);

			const data = new Float32Array(4 * sizes.width * sizes.height);
			for (let i = 0; i < size; i++) {
				for (let j = 0; j < size; j++) {
					const index = (i + j * size) * 4;
					let theta = Math.random() * Math.PI * 2;
					let r = 0.5 + 0.5 * Math.random();
					data[index + 0] = r * Math.cos(theta);
					data[index + 1] = r * Math.sin(theta);
					data[index + 2] = 0;
					data[index + 3] = 0;
				}
			}

			const fboTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
			fboTexture.magFilter = THREE.NearestFilter;
			fboTexture.minFilter = THREE.NearestFilter;
			fboTexture.needsUpdate = true;

			let material = new THREE.ShaderMaterial({
				uniforms: {
					uPositions: { value: fboTexture },
					uTime: { value: 0 }
				},
				vertexShader: fboVertex,
				fragmentShader: fboFragment
			});
			const fboMesh = new THREE.Mesh(geometry, material);
			fboScene.add(fboMesh);

			return { fboTexture, material, fboScene, fboCamera, fbo1, fbo2 };
		};

		addLight(scene);
		let { fboTexture, material: fboMaterial, fboScene, fboCamera, fbo1, fbo2 } = setupFBO();
		const { material: particleMaterial } = addObject(fboTexture);
		const camera = addCamera(sizes, scene);
		const renderer = addRenderer(canvas, sizes);
		const controls = addControls(camera, canvas);

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update material
			particleMaterial.uniforms.uTime.value = elapsedTime;
			fboMaterial.uniforms.uTime.value = elapsedTime;

			controls.update();

			fboMaterial.uniforms.uPositions.value = fbo2.texture;
			particleMaterial.uniforms.uPositions.value = fbo1.texture;

			renderer.setRenderTarget(fbo1);
			renderer.render(fboScene, fboCamera);
			renderer.setRenderTarget(null);
			renderer.render(scene, camera);

			// swap render targets
			let temp = fbo1;
			fbo1 = fbo2;
			fbo2 = temp;

			animationFrameId = window.requestAnimationFrame(tick);
		};

		const cleanupResize = resizeRenderer(camera, renderer, sizes);

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			cleanupResize();
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

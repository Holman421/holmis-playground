<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import particlesVertexShader from './shaders/vertex.glsl';
	import particlesFragmentShader from './shaders/fragment.glsl';

	$effect(() => {
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const textureLoader = new THREE.TextureLoader();

		/**
		 * Sizes
		 */
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Materials
			particlesMaterial.uniforms.uResolution.value.set(
				sizes.width * sizes.pixelRatio,
				sizes.height * sizes.pixelRatio
			);

			// Update camera
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		/**
		 * Camera
		 */
		// Base camera
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(0, 0, 18);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setClearColor('#181818');
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Displacement
		const displacement: any = {};
		displacement.canvas = document.createElement('canvas');
		displacement.canvas.width = 128;
		displacement.canvas.height = 128;
		displacement.canvas.style.position = 'fixed';
		displacement.canvas.style.width = '256px';
		displacement.canvas.style.height = '256px';
		displacement.canvas.style.top = '56px';
		displacement.canvas.style.left = 0;
		displacement.canvas.style.zIndex = 10;
		document.body.append(displacement.canvas);

		// Context
		displacement.context = displacement.canvas.getContext('2d');
		displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height);

		// Glow image
		displacement.glowImage = new Image();
		displacement.glowImage.src = '/particles/3.png';
		displacement.glowImage.onload = () => {
			// displacement.context.drawImage(displacement.glowImage, 20, 20, 32, 32);
		};

		// Interactive plane
		displacement.interactivePlane = new THREE.Mesh(
			new THREE.PlaneGeometry(10, 10),
			new THREE.MeshBasicMaterial()
		);
		displacement.interactivePlane.visible = false;
		scene.add(displacement.interactivePlane);

		// Raycaster
		displacement.raycaster = new THREE.Raycaster();

		displacement.screenCursor = new THREE.Vector2(9999, 9999);
		displacement.canvasCursor = new THREE.Vector2(9999, 9999);
		displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999);

		window.addEventListener('pointermove', (event) => {
			displacement.screenCursor.x = (event.clientX / sizes.width) * 2 - 1;
			displacement.screenCursor.y = -((event.clientY - 56) / sizes.height) * 2 + 1;
		});

		// Texture
		displacement.texture = new THREE.CanvasTexture(displacement.canvas);

		// Particles
		const particlesGeometry = new THREE.PlaneGeometry(10, 10, 128, 128);
		particlesGeometry.setIndex(null);
		particlesGeometry.deleteAttribute('normal');

		const intensitiesArray = new Float32Array(particlesGeometry.attributes.position.count);
		const anglesArray = new Float32Array(particlesGeometry.attributes.position.count);

		for (let i = 0; i < particlesGeometry.attributes.position.count; i++) {
			intensitiesArray[i] = Math.random();
			anglesArray[i] = Math.random() * Math.PI * 2;
		}

		particlesGeometry.setAttribute('aIntensity', new THREE.BufferAttribute(intensitiesArray, 1));
		particlesGeometry.setAttribute('aAngle', new THREE.BufferAttribute(anglesArray, 1));

		const particlesMaterial = new THREE.ShaderMaterial({
			vertexShader: particlesVertexShader,
			fragmentShader: particlesFragmentShader,
			uniforms: {
				uResolution: new THREE.Uniform(
					new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)
				),
				uPictureTexture: new THREE.Uniform(textureLoader.load('/pictures/picture-4.png')),
				uDisplacementTexture: new THREE.Uniform(displacement.texture)
			}
		});
		const particles = new THREE.Points(particlesGeometry, particlesMaterial);
		scene.add(particles);

		/**
		 * Animate
		 */
		const tick = () => {
			// Update controls
			controls.update();

			// Raycaster
			displacement.raycaster.setFromCamera(displacement.screenCursor, camera);
			const intersections = displacement.raycaster.intersectObject(displacement.interactivePlane);

			if (intersections.length) {
				const uv = intersections[0].uv;

				displacement.canvasCursor.x = uv.x * displacement.canvas.width;
				displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height;

				console.log(displacement.canvasCursor);
			}

			// Displacement
			displacement.context.globalCompositeOperation = 'source-over';
			displacement.context.globalAlpha = 0.025;
			displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height);

			// Speed aplha
			const cursorDistance = displacement.canvasCursorPrevious.distanceTo(
				displacement.canvasCursor
			);
			displacement.canvasCursorPrevious.copy(displacement.canvasCursor);
			const aplha = Math.min(cursorDistance * 0.1, 1);

			// Draw glow
			displacement.context.globalAlpha = aplha;

			// Texture
			displacement.texture.needsUpdate = true;

			const glowSize = displacement.canvas.width * 0.25;
			displacement.context.globalCompositeOperation = 'lighten';
			displacement.context.drawImage(
				displacement.glowImage,
				displacement.canvasCursor.x - glowSize * 0.5,
				displacement.canvasCursor.y - glowSize * 0.5,
				glowSize,
				glowSize
			);

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<!-- <div
		id="container"
		class="absolute left-[56px] top-[56px] z-10 w-[512px] h-[512px] bg-red text-red-500"
	>
		Bro wtf
	</div> -->
	<canvas class="webgl"></canvas>
</div>

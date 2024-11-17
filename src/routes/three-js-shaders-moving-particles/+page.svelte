<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import particlesVertexShader from './shaders/vertex.glsl';
	import particlesFragmentShader from './shaders/fragment.glsl';
	import gsap from 'gsap';

	$effect(() => {
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const gui = new GUI({ width: 340 });

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
			particles.material.uniforms.uResolution.value.set(
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
			new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
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
		const particles: any = {};

		particles.geometry = new THREE.PlaneGeometry(10, 10, 256, 256);
		// particles.geometry.setIndex(null);
		// particles.geometry.deleteAttribute('normal');

		const intensitiesArray = new Float32Array(particles.geometry.attributes.position.count);
		const anglesArray = new Float32Array(particles.geometry.attributes.position.count);

		for (let i = 0; i < particles.geometry.attributes.position.count; i++) {
			intensitiesArray[i] = Math.random();
			anglesArray[i] = Math.random() * Math.PI * 2;
		}

		particles.geometry.setAttribute('aIntensity', new THREE.BufferAttribute(intensitiesArray, 1));
		particles.geometry.setAttribute('aAngle', new THREE.BufferAttribute(anglesArray, 1));

		particles.pictures = [
			textureLoader.load('/pictures/picture-1.jpg'),
			textureLoader.load('/pictures/picture-2.png'),
			textureLoader.load('/pictures/picture-3.png'),
			textureLoader.load('/pictures/picture-4.png')
		];

		particles.uColor = new THREE.Color('#ff0000');

		particles.index = 3;
		particles.transitionSpeed = 1.5;
		particles.cursorSize = 0.25;

		particles.material = new THREE.ShaderMaterial({
			vertexShader: particlesVertexShader,
			fragmentShader: particlesFragmentShader,
			uniforms: {
				uResolution: new THREE.Uniform(
					new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)
				),
				uPictureTexture: new THREE.Uniform(particles.pictures[particles.index]),
				uPictureTextureNext: new THREE.Uniform(particles.pictures[3]),
				uDisplacementTexture: new THREE.Uniform(displacement.texture),
				uProgress: new THREE.Uniform(particles.transitionSpeed),
				uColor: new THREE.Uniform(particles.uColor)
			}
		});
		particles.points = new THREE.Points(particles.geometry, particles.material);
		scene.add(particles.points);

		particles.changeImage = (index: number) => {
			// Update uniforms
			particles.material.uniforms.uPictureTexture.value = particles.pictures[particles.index];
			particles.material.uniforms.uPictureTextureNext.value = particles.pictures[index];

			gsap.fromTo(
				particles.material.uniforms.uProgress,
				{ value: 0 },
				{ value: 1, duration: particles.transitionSpeed, ease: 'linear' }
			);

			particles.index = index;
		};

		particles.changePicture1 = () => {
			particles.changeImage(0);
		};
		particles.changePicture2 = () => {
			particles.changeImage(1);
		};
		particles.changePicture3 = () => {
			particles.changeImage(2);
		};
		particles.changePicture4 = () => {
			particles.changeImage(3);
		};

		gui.add(particles, 'transitionSpeed', 0.25, 4, 0.01).name('Transition Speed');

		gui.add(particles.material.uniforms.uProgress, 'value', 0, 1, 0.001).name('Progress').listen();

		gui.addColor(particles, 'uColor').onChange(() => {
			particles.material.uniforms.uColor.value.set(particles.uColor);
		});

		gui.add(particles, 'changePicture1').name('Picture 1');
		gui.add(particles, 'changePicture2').name('Picture 2');
		gui.add(particles, 'changePicture3').name('Picture 3');
		gui.add(particles, 'changePicture4').name('Picture 4');

		gui.add(particles, 'cursorSize', 0.1, 1, 0.01).name('Cursor size');

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

				// console.log(displacement.canvasCursor);
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

			const glowSize = displacement.canvas.width * particles.cursorSize;
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

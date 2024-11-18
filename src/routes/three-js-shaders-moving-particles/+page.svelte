<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import particlesVertexShader from './shaders/vertex.glsl';
	import particlesFragmentShader from './shaders/fragment.glsl';
	import gsap from 'gsap';

	$effect(() => {
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const canvasContainer = document.querySelector('.canvas-container') as HTMLDivElement;
		const gui = new GUI({ width: 340 });

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const textureLoader = new THREE.TextureLoader();

		/**
		 * Sizes
		 */
		const sizes = {
			// width: window.innerWidth,
			// height: window.innerHeight - 56,
			width: window.innerHeight / 1.25,
			height: window.innerHeight / 1.25,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		window.addEventListener('resize', () => {
			// Update sizes
			// sizes.width = window.innerWidth;
			// sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Materials
			if (particles.material) {
				particles.material.uniforms.uResolution.value.set(
					sizes.width * sizes.pixelRatio,
					sizes.height * sizes.pixelRatio
				);
			}

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
		// const controls = new OrbitControls(camera, canvas);
		// controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true,
			alpha: true
		});
		// renderer.setClearColor('red');
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
		displacement.canvas.style.visibility = 'hidden';
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
		// displacement.interactivePlane.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI * -0.1);
		scene.add(displacement.interactivePlane);

		// Raycaster
		displacement.raycaster = new THREE.Raycaster();
		displacement.screenCursor = new THREE.Vector2(9999, 9999);
		displacement.canvasCursor = new THREE.Vector2(9999, 9999);
		displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999);

		canvasContainer.addEventListener('pointermove', (event) => {
			const rect = canvas.getBoundingClientRect(); // Get canvas position
			displacement.screenCursor.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			displacement.screenCursor.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			console.log(displacement.screenCursor.x, displacement.screenCursor.y);
		});

		// Texture
		displacement.texture = new THREE.CanvasTexture(displacement.canvas);

		interface Particles {
			geometry: THREE.PlaneGeometry;
			uColor: THREE.Color;
			index: number;
			transitionSpeed: number;
			cursorSize: number;
			totalDisplacement: number;
			applyDisplacementTransition: boolean;
			pictures: THREE.Texture[];
			material: THREE.ShaderMaterial | null;
			points?: THREE.Points;
			changeImage: (index: number) => void;
			changePicture1: () => void;
			changePicture2: () => void;
			changePicture3: () => void;
			changePicture4: () => void;
		}

		const particles: Particles = {
			geometry: new THREE.PlaneGeometry(10, 10, 256, 256),
			uColor: new THREE.Color('#ff0000'),
			index: 3,
			transitionSpeed: 1.5,
			cursorSize: 0.25,
			totalDisplacement: 0,
			applyDisplacementTransition: false,
			pictures: [
				textureLoader.load('/pictures/picture-1.jpg'),
				textureLoader.load('/pictures/picture-2.png'),
				textureLoader.load('/pictures/picture-3.png'),
				textureLoader.load('/pictures/picture-4.png')
			],
			material: null,
			changeImage: () => {},
			changePicture1: () => {},
			changePicture2: () => {},
			changePicture3: () => {},
			changePicture4: () => {}
		};

		particles.geometry.setIndex(null);
		particles.geometry.deleteAttribute('normal');

		const intensitiesArray = new Float32Array(particles.geometry.attributes.position.count);
		const anglesArray = new Float32Array(particles.geometry.attributes.position.count);

		for (let i = 0; i < particles.geometry.attributes.position.count; i++) {
			intensitiesArray[i] = Math.random();
			anglesArray[i] = Math.random() * Math.PI * 2;
		}

		particles.geometry.setAttribute('aIntensity', new THREE.BufferAttribute(intensitiesArray, 1));
		particles.geometry.setAttribute('aAngle', new THREE.BufferAttribute(anglesArray, 1));

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
				uColor: new THREE.Uniform(particles.uColor),
				uTotalDisplacement: new THREE.Uniform(particles.totalDisplacement)
			}
		});

		particles.points = new THREE.Points(particles.geometry, particles.material);
		// particles.points.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI * -0.1);
		scene.add(particles.points);

		particles.changeImage = (index: number) => {
			if (!particles.material) return;

			// Update uniforms
			particles.material.uniforms.uPictureTexture.value = particles.pictures[particles.index];
			particles.material.uniforms.uPictureTextureNext.value = particles.pictures[index];

			gsap.fromTo(
				particles.material.uniforms.uProgress,
				{ value: 0 },
				{ value: 1, duration: particles.transitionSpeed, ease: 'linear' }
			);

			if (particles.applyDisplacementTransition) {
				gsap.fromTo(
					particles.material.uniforms.uTotalDisplacement,
					{ value: 0 },
					{
						value: 0.25,
						duration: particles.transitionSpeed / 2,
						ease: 'linear',
						repeat: 1,
						yoyo: true
					}
				);
			}

			particles.index = index;
		};

		particles.changePicture1 = () => particles.changeImage(0);
		particles.changePicture2 = () => particles.changeImage(1);
		particles.changePicture3 = () => particles.changeImage(2);
		particles.changePicture4 = () => particles.changeImage(3);

		// Add GUI controls
		gui.add(particles, 'transitionSpeed', 0.25, 4, 0.01).name('Transition Speed');
		gui.add(particles.material.uniforms.uProgress, 'value', 0, 1, 0.001).name('Progress').listen();
		gui.addColor(particles, 'uColor').onChange(() => {
			if (particles.material) {
				particles.material.uniforms.uColor.value.set(particles.uColor);
			}
		});
		gui.add(particles, 'changePicture1').name('Picture 1');
		gui.add(particles, 'changePicture2').name('Picture 2');
		gui.add(particles, 'changePicture3').name('Picture 3');
		gui.add(particles, 'changePicture4').name('Picture 4');
		gui.add(particles, 'cursorSize', 0.1, 1, 0.01).name('Cursor Size');
		gui
			.add(particles, 'totalDisplacement', 0, 2, 0.001)
			.name('Total Displacement')
			.onChange(() => {
				if (particles.material) {
					particles.material.uniforms.uTotalDisplacement.value = particles.totalDisplacement;
				}
			});
		gui.add(particles, 'applyDisplacementTransition').name('Apply Displacement Transition');

		if (particles.material) {
			gsap.fromTo(
				particles.material.uniforms.uTotalDisplacement,
				{ value: 1 },
				{
					value: 0,
					duration: particles.transitionSpeed,
					ease: 'linear',
					onUpdate: () => {
						particles.totalDisplacement = particles.material!.uniforms.uTotalDisplacement.value;
					}
				}
			);
		}

		//Animate
		const tick = () => {
			// controls.update();

			// Raycaster
			displacement.raycaster.setFromCamera(displacement.screenCursor, camera);
			const intersections = displacement.raycaster.intersectObject(displacement.interactivePlane);

			if (intersections.length) {
				const uv = intersections[0].uv;

				displacement.canvasCursor.x = uv.x * displacement.canvas.width;
				displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height;
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

			renderer.render(scene, camera);

			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div class="canvas-container h-[200vh] relative">
	<div class="fixed w-screen h-[calc(100vh-56px)]">
		<canvas class="webgl left-40 top-[50%] absolute -translate-y-1/2"></canvas>
	</div>
</div>
<div class=" mb-20"></div>

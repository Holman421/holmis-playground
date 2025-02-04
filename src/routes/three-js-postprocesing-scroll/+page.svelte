<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
	import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

	const imgArray = [
		'/pictures/planet-img.jpg',
		'/pictures/galaxy-img.jpg',
		'/pictures/galaxy-img2.jpg',
		'/pictures/universe.jpg',
		'/pictures/red-universe.jpg',
		'/pictures/green-universe.jpg',
		'/pictures/yellow-universe.jpg',
		'/pictures/purple-universe.jpg',
		'/pictures/white-universe.jpg',
		'/pictures/blue-universe.jpg',
		'/pictures/black-hole.jpg',
		'/pictures/orange-universe.jpg'
	];

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {
			offset: 0.0
		};

		// Updated scroll mechanics
		const SCROLL_SPEED = 5.0; // Adjusted for better control
		const LERP_FACTOR = 0.1;
		const DECELERATION = 0.92; // Slightly slower deceleration
		const MAX_VELOCITY = 0.5; // Increased max velocity
		const EFFECT_INTENSITY = 0.15; // Controls how quickly the effect builds up
		let targetScroll = 0;
		let currentScroll = 0;
		let velocity = 0;
		let scrollPosition = 0; // New: track absolute position

		// Add smooth effect tracking
		let currentEffect = 0;
		const EFFECT_LERP = 0.08; // Smooth effect transition

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			velocity += e.deltaY * 0.0001 * SCROLL_SPEED; // Reduced multiplier
			velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));
		};

		const handleTouchStart = (e: TouchEvent) => {
			e.preventDefault();
			lastTouchY = e.touches[0].clientY;
		};

		let lastTouchY = 0;
		const handleTouchMove = (e: TouchEvent) => {
			e.preventDefault();
			const touchY = e.touches[0].clientY;
			const deltaY = lastTouchY - touchY;
			// Apply same velocity clamping to touch events
			velocity = Math.max(
				-MAX_VELOCITY,
				Math.min(MAX_VELOCITY, velocity + deltaY * 0.0003 * SCROLL_SPEED)
			);
			lastTouchY = touchY;
		};

		// Add event listeners
		window.addEventListener('wheel', handleWheel, { passive: false });
		window.addEventListener('touchstart', handleTouchStart, { passive: false });
		window.addEventListener('touchmove', handleTouchMove, { passive: false });

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Grid configuration - updated
		const ROWS = 4;
		const COLUMNS = 3;
		const HORIZONTAL_SPACING = 1.5; // Wider horizontal gaps
		const VERTICAL_SPACING = 1.5; // Smaller vertical gaps
		const TOTAL_SETS = 8; // Increased number of sets for smoother wrapping

		// Function to create a grid of images - updated initial position
		const createImageGrid = (offsetX = 0) => {
			const planes = [];
			const itemsPerSet = imgArray.length;
			const gridWidth = COLUMNS * HORIZONTAL_SPACING;
			const gridHeight = ROWS * VERTICAL_SPACING;

			for (let i = 0; i < itemsPerSet; i++) {
				const row = Math.floor(i / COLUMNS);
				const col = i % COLUMNS;

				// Adjust initial position to center the visible sets
				const x =
					col * HORIZONTAL_SPACING -
					(COLUMNS * HORIZONTAL_SPACING - HORIZONTAL_SPACING) / 2 +
					offsetX -
					gridWidth * (TOTAL_SETS / 2 - 1); // Adjusted multiplier
				const y = row * VERTICAL_SPACING - (ROWS * VERTICAL_SPACING - VERTICAL_SPACING) / 2;

				const texture = new THREE.TextureLoader().load(imgArray[i]);
				const geometry = new THREE.PlaneGeometry(1, 1);
				const material = new THREE.MeshBasicMaterial({
					map: texture,
					transparent: true
				});
				const plane = new THREE.Mesh(geometry, material);
				plane.position.set(x, y, 0);
				scene.add(plane);
				planes.push(plane);
			}
			return planes;
		};

		// Create multiple sets of images for seamless looping
		let allPlanes: THREE.Mesh[] = [];
		const gridWidth = COLUMNS * HORIZONTAL_SPACING;

		for (let i = 0; i < TOTAL_SETS; i++) {
			const planes = createImageGrid(i * gridWidth);
			allPlanes = [...allPlanes, ...planes];
		}

		// Updated Chromatic Aberration Shader
		const ChromaticAberrationShader = {
			uniforms: {
				tDiffuse: { value: null },
				uOffset: { value: 0.0 }
			},
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform sampler2D tDiffuse;
				uniform float uOffset;
				varying vec2 vUv;

				void main() {
					float x = vUv.x * 2.0 - 1.0;
					
					// Calculate distortion strength (always positive direction)
					float distortionStrength = pow(abs(x), 5.0) * 1.25;
					distortionStrength *= abs(uOffset) * 0.1; // Use absolute value of uOffset

					// Use fixed direction regardless of scroll direction
					float direction = x < 0.0 ? 1.0 : -1.0;
					
					// Keep stretch direction consistent
					float yStretch = 1.0 + (abs(uOffset) * 0.1);
					float yOffset = (vUv.y - 0.5) * yStretch + 0.5;
					
					// Apply consistent direction warp
					vec2 offsetUV = vec2(0.0, distortionStrength * direction);
					vec2 finalUV = vec2(vUv.x, yOffset) + offsetUV;
					
					vec4 distortedColor = texture2D(tDiffuse, finalUV);
					
					gl_FragColor = distortedColor;
				}
			`
		};

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		scene.add(directionalLight);

		// Sizes
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

			// Update camera
			const aspect = sizes.width / sizes.height;
			camera.left = (frustumSize * aspect) / -2;
			camera.right = (frustumSize * aspect) / 2;
			camera.top = frustumSize / 2;
			camera.bottom = frustumSize / -2;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		// Camera setup - replace perspective with orthographic
		const frustumSize = 6; // Increased to show more of the scene
		const aspect = sizes.width / sizes.height;
		const camera = new THREE.OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			0.1,
			100
		);
		camera.position.set(0, 0, 4);
		scene.add(camera);

		// Update resize handler
		window.addEventListener('resize', () => {
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Update orthographic camera on resize
			const aspect = sizes.width / sizes.height;
			camera.left = (frustumSize * aspect) / -2;
			camera.right = (frustumSize * aspect) / 2;
			camera.top = frustumSize / 2;
			camera.bottom = frustumSize / -2;
			camera.updateProjectionMatrix();

			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		// Controls
		// const controls = new OrbitControls(camera, canvas);
		// controls.enableDamping = true;

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Post Processing
		const composer = new EffectComposer(renderer);
		const renderPass = new RenderPass(scene, camera);
		composer.addPass(renderPass);

		const chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
		composer.addPass(chromaticAberrationPass);

		// Update GUI - keep only the essential control
		const offsetController = gui
			.add(chromaticAberrationPass.uniforms.uOffset, 'value')
			.min(0)
			.max(1)
			.step(0.001)
			.name('uOffset')
			.listen();

		// Add easing function
		const easeOutCubic = (x: number): number => {
			return 1 - Math.pow(1 - x, 3);
		};

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		let scrollX = 0;
		const scrollSpeed = 0.1;
		const maxScroll = gridWidth;

		// Modified tick function
		const tick = () => {
			// Apply deceleration
			velocity *= DECELERATION;

			// Clear tiny velocities to ensure complete stop
			if (Math.abs(velocity) < 0.0001) {
				velocity = 0;
			}

			// Update scroll position
			scrollPosition += velocity;

			// Smooth movement
			currentScroll += (velocity - currentScroll) * LERP_FACTOR;

			// Update planes positions
			allPlanes.forEach((plane) => {
				const originalX = plane.position.x;
				plane.position.x -= currentScroll;

				// Simple wrapping
				const totalWidth = gridWidth * (TOTAL_SETS - 3);
				const halfWidth = totalWidth / 2;

				if (plane.position.x < -halfWidth) {
					plane.position.x += totalWidth;
				} else if (plane.position.x > halfWidth) {
					plane.position.x -= totalWidth;
				}
			});

			// Improved chromatic aberration calculation
			const velocityImpact = Math.abs(velocity) / EFFECT_INTENSITY;
			const targetEffect = Math.pow(velocityImpact, 1.5); // Non-linear scaling

			// Smooth transition of the effect
			currentEffect += (targetEffect - currentEffect) * EFFECT_LERP;

			// Apply the effect with direction
			chromaticAberrationPass.uniforms.uOffset.value = currentEffect * Math.sign(velocity);

			composer.render();
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			window.removeEventListener('wheel', handleWheel);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchmove', handleTouchMove);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

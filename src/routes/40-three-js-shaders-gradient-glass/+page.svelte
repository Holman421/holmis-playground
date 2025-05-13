<script lang="ts">
	import * as THREE from 'three';
	import { onDestroy, onMount } from 'svelte';
	import gsap from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import bigSphereFragmentShader from './shaders/bigSphere/fragment.glsl';
	import bigSpereVertexShader from './shaders/bigSphere/vertex.glsl';
	import { EffectComposer, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
	import { DotScreenShader } from './shaders/postprocessing/vertex';

	$effect(() => {
		// Register the ScrollTrigger plugin
		gsap.registerPlugin(ScrollTrigger);

		// Define colors once to keep them consistent across all sections
		const shaderColors = {
			baseFirstColor: new THREE.Color(41 / 255, 196 / 255, 206 / 255), // #29C4CE
			baseSecondColor: new THREE.Color(206 / 255, 108 / 255, 41 / 255), // #CF6C29
			accentColor: new THREE.Color(0, 0, 0) // black
		};

		// Section-specific shader configurations (without colors)
		const sectionConfigs = [
			{
				// Section 1
				noiseScale: 2.0,
				noiseSpeed: 0.3,
				patternFrequency: 5.0,
				firstOffset: 0.0,
				secondOffset: 0.5
			},
			{
				// Section 2
				noiseScale: 4.0,
				noiseSpeed: 0.4,
				patternFrequency: 10.0,
				firstOffset: 0.0,
				secondOffset: 0.25
			},
			{
				// Section 3
				noiseScale: 1.5,
				noiseSpeed: 0.3,
				patternFrequency: 5.0,
				firstOffset: 0.0,
				secondOffset: 0.0
			},
			{
				// Section 4
				noiseScale: 3.0,
				noiseSpeed: 0.2,
				patternFrequency: 20.0,
				firstOffset: 0.0,
				secondOffset: 1.5
			}
		];
		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		// Animation state tracking
		const state = {
			currentSection: 1,
			scrollProgress: 0,
			progressScale: 0
		};

		// Canvas and scene setup
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const scene = new THREE.Scene();

		// Mouse tracking for interactive effects
		const mouse = {
			x: 0,
			y: 0,
			targetX: 0,
			targetY: 0
		};

		// Create the shader material and mesh
		const createShaderPlane = () => {
			const initialConfig = sectionConfigs[0];

			const material = new THREE.ShaderMaterial({
				vertexShader: bigSpereVertexShader,
				fragmentShader: bigSphereFragmentShader,
				uniforms: {
					uTime: { value: 0 },
					uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) },
					uMouse: { value: new THREE.Vector2(0, 0) },
					uBaseFirstColor: { value: shaderColors.baseFirstColor.clone() },
					uBaseSecondColor: { value: shaderColors.baseSecondColor.clone() },
					uAccentColor: { value: shaderColors.accentColor.clone() },
					uNoiseSpeed: { value: initialConfig.noiseSpeed },
					uNoiseScale: { value: initialConfig.noiseScale },
					uPatternFrequency: { value: initialConfig.patternFrequency },
					uFirstOffset: { value: initialConfig.firstOffset },
					uSecondOffset: { value: initialConfig.secondOffset }
				},
				side: THREE.DoubleSide
			});

			const geometry = new THREE.PlaneGeometry(5, 3, 32, 32);
			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.z = -0.5;
			scene.add(mesh);

			return { material, mesh };
		};

		const { material, mesh } = createShaderPlane(); // Initialize shader with first section values
		const applyShaderConfig = (config) => {
			material.uniforms.uNoiseScale.value = config.noiseScale;
			material.uniforms.uPatternFrequency.value = config.patternFrequency;
			material.uniforms.uFirstOffset.value = config.firstOffset;
			material.uniforms.uSecondOffset.value = config.secondOffset;
			material.uniforms.uNoiseSpeed.value = config.noiseSpeed;
		};

		// Mouse movement tracking
		window.addEventListener('mousemove', (event) => {
			// Convert mouse position to normalized coordinates (-1 to 1)
			mouse.targetX = (event.clientX / sizes.width - 0.5) * 2;
			mouse.targetY = (event.clientY / sizes.height - 0.5) * 2;
		});

		// Camera and Renderer setup
		const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(0, 0, 1);
		scene.add(camera);

		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true,
			alpha: false // Prevent transparency issues
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
		renderer.setClearColor(0x000000, 1);
		// Resize handler
		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Update camera and renderer
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
			composer.setSize(sizes.width, sizes.height);

			// Update resolution uniform
			material.uniforms.uResolution.value.set(sizes.width, sizes.height);
		});

		// Post processing with simple dot screen effect
		const composer = new EffectComposer(renderer);
		composer.addPass(new RenderPass(scene, camera));
		const dotScreenEffect = new ShaderPass(DotScreenShader);
		dotScreenEffect.uniforms['scale'].value = 4;
		composer.addPass(dotScreenEffect);
		// Animation clock
		const clock = new THREE.Clock();
		let animationFrameId: number;

		// Setup initialization and scroll tracking
		onMount(() => {
			// Create a preloader
			const preloader = document.createElement('div');
			preloader.className =
				'fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black z-50';
			preloader.innerHTML = '<div class="text-white text-lg">Loading shader...</div>';
			document.body.appendChild(preloader);

			// Initialize shader
			const initializeShader = () => {
				// Apply initial shader config
				applyShaderConfig(sectionConfigs[0]);

				// Force multiple renders to ensure shader is properly initialized
				for (let i = 0; i < 5; i++) {
					renderer.render(scene, camera);
					composer.render();
				}

				// Fade out preloader
				setTimeout(() => {
					gsap.to(preloader, {
						opacity: 0,
						duration: 0.8,
						ease: 'power2.inOut',
						onComplete: () => preloader.remove()
					});
				}, 300);
			};

			// Initialize after a short delay
			setTimeout(initializeShader, 200);

			// Setup scroll tracking
			ScrollTrigger.create({
				start: 'top top',
				end: 'bottom bottom',
				onUpdate: (self) => {
					// Convert progress from 0-1 to 0-3 for the four sections
					state.progressScale = self.progress * 3;
					state.scrollProgress = self.progress;
				},
				// Ensure first section is applied on initial load
				onToggle: (self) => {
					if (self.isActive && state.progressScale === 0) {
						applyShaderConfig(sectionConfigs[0]);
					}
				}
			});
		}); // Animation loop
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update material time uniform
			material.uniforms.uTime.value = elapsedTime;

			// Smoothly update mouse position with LERP
			mouse.x = mouse.x * 0.9 + mouse.targetX * 0.1;
			mouse.y = mouse.y * 0.9 + mouse.targetY * 0.1;
			material.uniforms.uMouse.value.set(mouse.x, mouse.y);

			// Handle scroll-based shader transitions
			if (state.progressScale !== undefined) {
				// Special case for very beginning of page
				if (state.progressScale < 0.01) {
					applyShaderConfig(sectionConfigs[0]);
					state.currentSection = 1;
				}
				// Special case for very end of page
				else if (state.progressScale >= 2.8) {
					applyShaderConfig(sectionConfigs[sectionConfigs.length - 1]);
					state.currentSection = 4;
				}
				// Normal interpolation between sections
				else {
					// Calculate which sections to interpolate between
					const exactPosition = state.progressScale;
					const lowerIndex = Math.min(Math.floor(exactPosition), sectionConfigs.length - 2);
					const upperIndex = Math.min(lowerIndex + 1, sectionConfigs.length - 1);
					const fraction = exactPosition - lowerIndex;

					// Get section configs
					const lowerConfig = sectionConfigs[lowerIndex];
					const upperConfig = sectionConfigs[upperIndex];

					// Smooth easing function for transitions
					const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
					const smoothMix = easeInOutCubic(fraction);

					// Interpolate all shader parameters
					material.uniforms.uNoiseSpeed.value =
						lowerConfig.noiseSpeed + (upperConfig.noiseSpeed - lowerConfig.noiseSpeed) * smoothMix;

					material.uniforms.uNoiseScale.value =
						lowerConfig.noiseScale + (upperConfig.noiseScale - lowerConfig.noiseScale) * smoothMix;

					material.uniforms.uPatternFrequency.value =
						lowerConfig.patternFrequency +
						(upperConfig.patternFrequency - lowerConfig.patternFrequency) * smoothMix;

					material.uniforms.uFirstOffset.value =
						lowerConfig.firstOffset +
						(upperConfig.firstOffset - lowerConfig.firstOffset) * smoothMix;

					material.uniforms.uSecondOffset.value =
						lowerConfig.secondOffset +
						(upperConfig.secondOffset - lowerConfig.secondOffset) * smoothMix;

					// Update current section tracker
					state.currentSection = lowerIndex + 1;
				}
			}

			// Render
			renderer.render(scene, camera);
			composer.render();

			animationFrameId = window.requestAnimationFrame(tick);
		};

		// Start animation loop
		tick();

		// Cleanup on component destroy
		onDestroy(() => {
			window.removeEventListener('mousemove', () => {});
			window.removeEventListener('resize', () => {});
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		});
	});
</script>

<div class="relative">
	<!-- Fixed background with canvas -->
	<div class="fixed top-0 left-0 w-full h-full z-0 bg-black">
		<canvas class="webgl"></canvas>
	</div>

	<!-- Scrollable content -->
	<div class="relative z-10">
		<section id="section1" class="h-screen flex items-center justify-center">
			<div class="text-center p-8 bg-black/40 rounded-lg backdrop-blur-sm">
				<h1 class="text-5xl font-bold text-white mb-4">Section 1</h1>
				<p class="text-xl text-white">Scroll down to explore more</p>
			</div>
		</section>

		<section id="section2" class="h-screen flex items-center justify-center">
			<div class="text-center p-8 bg-black/40 rounded-lg backdrop-blur-sm">
				<h1 class="text-5xl font-bold text-white mb-4">Section 2</h1>
				<p class="text-xl text-white">Keep scrolling</p>
			</div>
		</section>

		<section id="section3" class="h-screen flex items-center justify-center">
			<div class="text-center p-8 bg-black/40 rounded-lg backdrop-blur-sm">
				<h1 class="text-5xl font-bold text-white mb-4">Section 3</h1>
				<p class="text-xl text-white">Almost there</p>
			</div>
		</section>

		<section id="section4" class="h-screen flex items-center justify-center">
			<div class="text-center p-8 bg-black/40 rounded-lg backdrop-blur-sm">
				<h1 class="text-5xl font-bold text-white mb-4">Section 4</h1>
				<p class="text-xl text-white">Final section</p>
			</div>
		</section>
	</div>
</div>

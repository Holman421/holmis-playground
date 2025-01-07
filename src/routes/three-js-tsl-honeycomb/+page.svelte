<script lang="ts">
	import * as THREE from 'three/webgpu';
	import GUI from 'lil-gui';
	import {
		abs,
		dot,
		Fn,
		max,
		texture,
		uniform,
		uv,
		vec2,
		vec4,
		smoothstep,
		step,
		sin,
		floor,
		mix,
		float,
		length,
		pow,
		remap
	} from 'three/src/nodes/TSL.js';
	import { gsap } from 'gsap';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {
			uTransition: 0.0,
			scrollProgress: 0
		};

		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		// Create all uniforms at the same scope level
		const uTransition = uniform(float(debugObject.uTransition));
		const uTime = uniform(float(0.0));
		const resolution: any = uniform(vec4(0, 0, 0, 0));
		// Remove uAspect uniform as we won't need it anymore
		// Create animation function
		let isAnimating = false;

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		const addObjects = () => {
			// Load textures with promise
			const textureLoader = new THREE.TextureLoader();
			Promise.all([
				new Promise<THREE.Texture>((resolve) =>
					textureLoader.load('/pictures/galaxy-img.jpg', (texture) => {
						texture.colorSpace = THREE.SRGBColorSpace;
						texture.minFilter = THREE.LinearFilter;
						texture.magFilter = THREE.LinearFilter;
						resolve(texture);
					})
				),
				new Promise<THREE.Texture>((resolve) =>
					textureLoader.load('/pictures/planet-img.jpg', (texture) => {
						texture.colorSpace = THREE.SRGBColorSpace;
						texture.minFilter = THREE.LinearFilter;
						texture.magFilter = THREE.LinearFilter;
						resolve(texture);
					})
				)
			]).then(([texture1, texture2]) => {
				const material = new THREE.NodeMaterial();

				const PHI = 1.61803398874989484820459; // Golden Ratio
				const goldNoise = Fn(([xy]: any) => {
					return sin(dot(xy, vec2(PHI, PHI + 1.0))).fract();
				});

				const hexDistance = Fn(([uv]: any) => {
					const s = vec2(1.0, 1.7320508075688772);
					const p = uv.toVar().abs();
					return max(dot(p, s.mul(0.5)), p.x);
				});

				const hexCoordinates = Fn(([uv]: any) => {
					const s = vec2(1.0, 1.7320508075688772);
					const hexCenter = sround(vec4(uv, uv.toVar().sub(vec2(0.5, 1.0))).div(s.xyxy));
					const offset = vec4(
						uv.sub(hexCenter.xy.mul(s)),
						uv.sub(hexCenter.zw.add(vec2(0.5)).mul(s))
					);

					const dot1 = dot(offset.xy, offset.xy);
					const dot2 = dot(offset.zw, offset.zw);
					const final1 = vec4(offset.xy, hexCenter.xy);
					const final2 = vec4(offset.zw, hexCenter.zw);
					const diff = dot1.sub(dot2);
					const final = mix(final1, final2, step(0.0, diff));
					return final;
				});

				const sround = Fn(([s]: any) => {
					return floor(s.add(0.5));
				});

				const scaleUV = Fn(([uv, scale]: any) => {
					return uv.toVar().sub(vec2(0.5)).mul(scale).add(vec2(0.5));
				});

				// Add new cover function before material.colorNode
				const coverUV = Fn(([uv]: any) => {
					return uv.toVar().sub(vec2(0.5)).mul(resolution.zw).add(vec2(0.5));
				});

				material.colorNode = Fn(() => {
					// Get texture aspect ratios
					const tex1Ratio = float(texture1.image.width).div(texture1.image.height);
					const tex2Ratio = float(texture2.image.width).div(texture2.image.height);

					// Add aspect ratio correction for hexagons
					const aspectRatio = resolution.x.div(resolution.y);
					const correctedUV = uv().mul(vec2(aspectRatio, 1.0));
					const hexUV = correctedUV.mul(20); // Now using correctedUV instead of raw uv

					// Rest of the shader code remains the same
					const hexCoords = hexCoordinates([hexUV]);

					const hexDist = hexDistance([hexCoords.xy]).add(0.03);

					const border = smoothstep(0.51, 0.51 + 0.03, hexDist);
					const y = pow(max(0.0, float(0.5).sub(hexDist).oneMinus()), 10.0).mul(1.5);
					const z = goldNoise([hexCoords.zw]);

					const offset = float(0.2);
					const bounceTransition = smoothstep(0.0, 0.5, abs(uTransition.sub(0.5))).oneMinus();

					const blendCut = smoothstep(
						uv().y.sub(offset),
						uv().y.add(offset),
						remap(
							uTransition.add(z.mul(0.08).mul(bounceTransition)),
							0.0,
							1.0,
							offset.mul(-1),
							float(1).add(offset)
						)
					);

					const merge = smoothstep(0.0, 0.5, abs(blendCut.sub(0.5))).oneMinus();

					const cut = step(uv().y, uTransition.add(y.add(z).mul(0.15).mul(bounceTransition)));

					const textureUV = uv().add(
						y
							.mul(sin(uv().y.mul(15.0).sub(uTime.mul(2.5))))
							.mul(merge)
							.mul(0.025)
					);

					// Apply aspect ratio correction to UVs - simplified
					const fromUV = coverUV(textureUV);
					const toUV = coverUV(textureUV);

					const colorBlend = merge.mul(border).mul(bounceTransition);

					const sample1 = texture(texture1, toUV);
					const sample2 = texture(texture2, fromUV);

					const final = mix(sample1, sample2, cut);

					// return vec4(colorBlend);

					// Replace addAssign with add
					return final.add(vec4(1.0, 0.4, 0.0).mul(colorBlend).mul(1.0));
				})();

				// Create a plane that fills the viewport exactly
				const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
				const mesh = new THREE.Mesh(geometry, material);
				scene.add(mesh);
			});

			// Update resolution uniform initial values
			resolution.value.x = sizes.width;
			resolution.value.y = sizes.height;
			resolution.value.z = 1;
			resolution.value.w = sizes.height / sizes.width;
		};
		addObjects();

		const addLights = () => {
			const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
			directionalLight.position.set(6.25, 3, 4);
			scene.add(directionalLight);
		};
		addLights();

		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Update camera
			camera.left = -1;
			camera.right = 1;
			camera.top = 1;
			camera.bottom = -1;
			camera.updateProjectionMatrix();

			// Update renderer

			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);

			// Update maxScroll value
			maxScroll = sizes.height;

			// Recalculate current scroll position ratio
			targetScroll = Math.min(maxScroll, targetScroll);
			currentScroll = Math.min(maxScroll, currentScroll);

			// Update resolution uniform
			resolution.value.x = sizes.width;
			resolution.value.y = sizes.height;
			resolution.value.z = 1;
			resolution.value.w = sizes.height / sizes.width;
		});

		// Camera - orthographic setup for exact viewport fitting
		const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
		camera.position.z = 1;
		scene.add(camera);

		// Remove controls setup and replace with scroll handling
		let currentScroll = 0;
		let targetScroll = 0;
		let maxScroll = sizes.height; // Change from const to let

		const updateTransition = (progress: number) => {
			if (isAnimating) return;

			gsap.to(debugObject, {
				uTransition: progress,
				duration: 1,
				ease: 'power2.out',
				onUpdate: () => {
					uTransition.value = debugObject.uTransition;
				}
			});
		};

		// Smooth scroll handler
		const handleScroll = (event: WheelEvent) => {
			event.preventDefault();

			targetScroll = Math.max(0, Math.min(maxScroll, targetScroll + event.deltaY));

			// Create a proper object to tween
			const tweenObj = { current: currentScroll };

			gsap.to(tweenObj, {
				current: targetScroll,
				duration: 1,
				ease: 'power2.out',
				onUpdate: () => {
					currentScroll = tweenObj.current;
					const progress = currentScroll / maxScroll;
					updateTransition(progress);
				}
			});
		};

		let touchStartY = 0;
		let lastTouchY = 0;

		// Add these handlers after the handleScroll function
		const handleTouchStart = (event: TouchEvent) => {
			touchStartY = event.touches[0].clientY;
			lastTouchY = touchStartY;
		};

		const handleTouchMove = (event: TouchEvent) => {
			event.preventDefault();
			const currentTouchY = event.touches[0].clientY;
			const deltaY = (lastTouchY - currentTouchY) * 2; // Multiply by 2 to make it more sensitive

			targetScroll = Math.max(0, Math.min(maxScroll, targetScroll + deltaY));

			const tweenObj = { current: currentScroll };

			gsap.to(tweenObj, {
				current: targetScroll,
				duration: 1,
				ease: 'power2.out',
				onUpdate: () => {
					currentScroll = tweenObj.current;
					const progress = currentScroll / maxScroll;
					updateTransition(progress);
				}
			});

			lastTouchY = currentTouchY;
		};

		// Add smooth scroll event listener
		canvas.addEventListener('wheel', handleScroll, { passive: false });

		// Add touch event listeners after the wheel event listener
		canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
		canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

		// Remove previous button and slider from GUI
		gui.destroy();

		// Renderer
		const renderer = new THREE.WebGPURenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.toneMappingExposure = 1.0;
		renderer.toneMapping = THREE.NoToneMapping;
		renderer.setClearColor(new THREE.Color('#000000'), 1);
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update time uniform
			uTime.value = elapsedTime as any;

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();

		// Cleanup function
		return () => {
			canvas.removeEventListener('wheel', handleScroll);
			canvas.removeEventListener('touchstart', handleTouchStart);
			canvas.removeEventListener('touchmove', handleTouchMove);
			gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

<style>
	div {
		overflow: hidden; /* Prevent page scrolling */
		overscroll-behavior: none; /* Add this line to prevent pull-to-refresh */
	}

	.webgl {
		touch-action: none; /* Prevent default touch behaviors */
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}
</style>

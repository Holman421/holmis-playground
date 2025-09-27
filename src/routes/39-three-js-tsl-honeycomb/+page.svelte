<script lang="ts">
	import * as THREE from 'three/webgpu';
	import GUI from 'lil-gui';
	import {
		float,
		Fn,
		mix,
		vec3,
		uniform,
		positionLocal,
		If,
		Discard,
		smoothstep,
		texture,
		instancedArray,
		vec4,
		vec2,
		sin,
		dot,
		max,
		step,
		floor,
		uv,
		pow,
		abs,
		remap
	} from 'three/tsl';
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
					textureLoader.load(
						'/pictures/universe/universe-11.jpg',
						(texture) => {
							texture.colorSpace = THREE.SRGBColorSpace;
							texture.minFilter = THREE.LinearFilter;
							texture.magFilter = THREE.LinearFilter;
							texture.wrapS = THREE.ClampToEdgeWrapping;
							texture.wrapT = THREE.ClampToEdgeWrapping;
							texture.generateMipmaps = false;
							resolve(texture);
						}
					)
				),
				new Promise<THREE.Texture>((resolve) =>
					textureLoader.load('/pictures/universe/universe-8.jpg', (texture) => {
						texture.colorSpace = THREE.SRGBColorSpace;
						texture.minFilter = THREE.LinearFilter;
						texture.magFilter = THREE.LinearFilter;
						texture.wrapS = THREE.ClampToEdgeWrapping;
						texture.wrapT = THREE.ClampToEdgeWrapping;
						texture.generateMipmaps = false;
						resolve(texture);
					})
				)
			]).then(([texture1, texture2]) => {
				const material = new THREE.NodeMaterial();

				const PHI = 1.61803398874989484820459; // Golden Ratio
				const goldNoise = (xy: any) => sin(dot(xy, vec2(PHI, PHI + 1.0))).fract();

				const sround = (value: any) => floor(value.add(float(0.5)));

				const hexCoordinates = (uvInput: any) => {
					const s = vec2(1.0, 1.7320508075688772);
					const shifted = uvInput.sub(vec2(0.5, 1.0));
					const sVec4 = vec4(s.x, s.y, s.x, s.y);
					const uvCombined = vec4(uvInput.x, uvInput.y, shifted.x, shifted.y);
					const hexCenter = sround(uvCombined.div(sVec4));
					const offsetA = uvInput.sub(hexCenter.xy.mul(s));
					const offsetB = uvInput.sub(hexCenter.zw.add(vec2(0.5)).mul(s));

					const dot1 = dot(offsetA, offsetA);
					const dot2 = dot(offsetB, offsetB);
					const final1 = vec4(offsetA.x, offsetA.y, hexCenter.x, hexCenter.y);
					const final2 = vec4(offsetB.x, offsetB.y, hexCenter.z, hexCenter.w);
					const diff = dot1.sub(dot2);
					return mix(final1, final2, step(0.0, diff));
				};

				const hexDistance = (uvInput: any) => {
					const s = vec2(1.0, 1.7320508075688772);
					const p = abs(uvInput);
					return max(dot(p, s.mul(0.5)), p.x);
				};

				material.colorNode = Fn(() => {
					// Get texture aspect ratios
					const tex1Ratio = float(
						texture1.image.width / texture1.image.height
					);
					const tex2Ratio = float(
						texture2.image.width / texture2.image.height
					);

					// Add aspect ratio correction for hexagons
					const aspectRatio = resolution.x.div(resolution.y);
					const correctedUV = uv().mul(vec2(aspectRatio, 1.0));
					const hexUV = correctedUV.mul(20); // Now using correctedUV instead of raw uv

					// Rest of the shader code remains the same
					const hexCoords = hexCoordinates(hexUV);

					const hexDist = hexDistance(hexCoords.xy).add(0.03);

					const border = smoothstep(0.51, 0.51 + 0.03, hexDist);
					const y = pow(max(0.0, float(0.5).sub(hexDist).oneMinus()), 10.0).mul(
						1.5
					);
					const z = goldNoise(hexCoords.zw);

					const offset = float(0.2);
					const bounceTransition = smoothstep(
						0.0,
						0.5,
						abs(uTransition.sub(0.5))
					).oneMinus();

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

					const cut = step(
						uv().y,
						uTransition.add(y.add(z).mul(0.15).mul(bounceTransition))
					);

					const textureUV = uv().add(
						y
							.mul(sin(uv().y.mul(15.0).sub(uTime.mul(2.5))))
							.mul(merge)
							.mul(0.025)
					);

					const viewportRatio = resolution.x.div(resolution.y);
					const one = float(1.0);
					const half = float(0.5);
					const center = vec2(half, half);

					const tex1Scale = vec2(
						max(one, viewportRatio.div(tex1Ratio)),
						max(one, tex1Ratio.div(viewportRatio))
					);
					const tex2Scale = vec2(
						max(one, viewportRatio.div(tex2Ratio)),
						max(one, tex2Ratio.div(viewportRatio))
					);

					const tex1UV = textureUV.sub(center).mul(tex1Scale).add(center);
					const tex2UV = textureUV.sub(center).mul(tex2Scale).add(center);

					const colorBlend = merge.mul(border).mul(bounceTransition);

					const sample1 = texture(texture1, tex1UV);
					const sample2 = texture(texture2, tex2UV);

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

			targetScroll = Math.max(
				0,
				Math.min(maxScroll, targetScroll + event.deltaY)
			);

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

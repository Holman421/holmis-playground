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
					textureLoader.load('/pictures/galaxy-img.jpg', resolve)
				),
				new Promise<THREE.Texture>((resolve) =>
					textureLoader.load('/pictures/planet-img.jpg', resolve)
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

				material.colorNode = Fn(() => {
					// Remove aspect ratio correction
					const distUV = scaleUV(uv(), vec2(float(1).add(length(uv().sub(0.5).mul(1)))));

					const hexUV = distUV.mul(20);
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

					// Instead of using assign, calculate the scaled UVs directly
					const fromUV = scaleUV(textureUV, vec2(float(1).add(z.mul(0.2).mul(merge))));
					const toUV = scaleUV(textureUV, vec2(float(1).add(z.mul(0.2).mul(blendCut))));

					const colorBlend = merge.mul(border).mul(bounceTransition);

					const sample1 = texture(texture1, toUV);
					const sample2 = texture(texture2, fromUV);

					const final = mix(sample1, sample2, cut);

					// return vec4(colorBlend);

					// Replace addAssign with add
					return final.add(vec4(1.0, 0.4, 0.0).mul(colorBlend).mul(1.0));
				})();

				// Create a fixed size plane
				const planeWidth = 2; // Fixed width in world units
				const geometry = new THREE.PlaneGeometry(planeWidth, planeWidth, 1, 1);
				const mesh = new THREE.Mesh(geometry, material);
				scene.add(mesh);
			});
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

			// Update camera with new aspect ratio while maintaining fixed size
			const aspect = sizes.width / sizes.height;
			camera.left = (frustumSize * aspect) / -2;
			camera.right = (frustumSize * aspect) / 2;
			camera.top = frustumSize / 2;
			camera.bottom = frustumSize / -2;
			camera.updateProjectionMatrix();

			// Update renderer

			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);

			// Update maxScroll value
			maxScroll = sizes.height;

			// Recalculate current scroll position ratio
			targetScroll = Math.min(maxScroll, targetScroll);
			currentScroll = Math.min(maxScroll, currentScroll);
		});

		// Camera
		const targetPlaneWidth = 2; // This should match the plane width
		const aspect = sizes.width / sizes.height;
		const frustumSize = targetPlaneWidth;

		const camera = new THREE.OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			-1000,
			1000
		);
		camera.position.set(0, 0, 3);
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

		// Add smooth scroll event listener
		canvas.addEventListener('wheel', handleScroll, { passive: false });

		// Remove previous button and slider from GUI
		gui.destroy();

		// Renderer
		const renderer = new THREE.WebGPURenderer({
			canvas: canvas,
			antialias: true
		});
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
	}

	.webgl {
		touch-action: none; /* Prevent default touch behaviors */
	}
</style>

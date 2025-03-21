<script lang="ts">
	import * as THREE from 'three';
	import GUI from 'lil-gui';
	import { setupCameraGUI } from '$lib/utils/cameraGUI';
	import gsap from 'gsap';
	import { createGlassTextDisplay } from './utils';

	let isAnimatedIn = $state(false);
	let isLoading = $state(true);
	let activeGroupId = $state<number | null>(null);
	let glassText1: Awaited<ReturnType<typeof createGlassTextDisplay>>;
	let glassText2: Awaited<ReturnType<typeof createGlassTextDisplay>>;
	let glassText3: Awaited<ReturnType<typeof createGlassTextDisplay>>;
	let animationFrameId: number;

	let heading1: HTMLElement;
	let heading2: HTMLElement;
	let heading3: HTMLElement;

	let isHovered = false;

	const hoverAnimation = {
		startHover: (material: THREE.MeshPhysicalMaterial) => {
			if (!isHovered) {
				isHovered = true;
				gsap.to(material, {
					thickness: 2.5,
					duration: 0.3,
					ease: 'power2.inOut'
				});
			}
		},
		endHover: (material: THREE.MeshPhysicalMaterial) => {
			if (isHovered) {
				isHovered = false;
				gsap.to(material, {
					thickness: 0.6,
					duration: 0.3,
					ease: 'power2.inOut'
				});
			}
		}
	};

	const handleGroupClick = (glass: Awaited<ReturnType<typeof createGlassTextDisplay>>) => {
		const glassGroups = [glassText1, glassText2, glassText3];
		const headings = [heading1, heading2, heading3];

		if (glass.state === 'idle') {
			const activeGroup = glassGroups.find((g) => g.state === 'active');
			if (activeGroup) {
				activeGroup.animate('idle');
				// Reset active heading position using direct reference
				const activeHeading = headings[activeGroup.id - 1];
				if (activeHeading) {
					gsap.to(activeHeading, {
						xPercent: 0, // Back to original position
						duration: 0.5,
						ease: 'power2.out'
					});
				}
			}
			glass.animate('active');
			activeGroupId = glass.id;
			// Update URL without reload
			const url = new URL(window.location.href);
			url.searchParams.set('section', glass.id.toString());
			window.history.replaceState({}, '', url);
			// Move heading using direct reference
			const clickedHeading = headings[glass.id - 1];
			if (clickedHeading) {
				gsap.to(clickedHeading, {
					xPercent: 5, // Just move it a tiny bit right
					duration: 0.5,
					ease: 'power2.out'
				});
			}
		} else {
			glass.animate('idle');
			activeGroupId = null;
			// Remove section from URL
			const url = new URL(window.location.href);
			url.searchParams.delete('section');
			window.history.replaceState({}, '', url);
			// Reset heading position using direct reference
			const currentHeading = headings[glass.id - 1];
			if (currentHeading) {
				gsap.to(currentHeading, {
					xPercent: 0, // Back to original position
					duration: 0.5,
					ease: 'power2.out'
				});
			}
		}
	};

	const handleDivHover = (glassId: number, isEntering: boolean) => {
		const glass = [glassText1, glassText2, glassText3][glassId - 1];
		const heading = [heading1, heading2, heading3][glassId - 1];

		if (glass && glass.state !== 'active') {
			if (isEntering) {
				// Kill any existing hover animation
				if (glass.currentHoverAnimation) {
					glass.currentHoverAnimation.kill();
				}

				hoverAnimation.startHover(glass.torusMaterial);
				gsap.to(heading, {
					xPercent: 10,
					duration: 0.3,
					ease: 'power2.out'
				});

				// Store base rotation before starting animation
				const baseRotation = glass.getBaseRotation();

				// Store the animation reference
				(glass.currentHoverAnimation as any) = gsap.to(glass.group.rotation, {
					y: baseRotation.y + Math.PI * 2,
					duration: 0.6,
					ease: 'power2.inOut',
					onComplete: () => {
						// Reset to base rotation after complete
						glass.group.rotation.y = baseRotation.y;
						glass.currentHoverAnimation = null;
					}
				});
			} else {
				hoverAnimation.endHover(glass.torusMaterial);
				gsap.to(heading, {
					xPercent: 0,
					duration: 0.3,
					ease: 'power2.out'
				});
			}
		}
	};

	// Add button click handler
	const handleButtonClick = (glassId: number) => {
		const glass = [glassText1, glassText2, glassText3][glassId - 1];
		if (glass) {
			handleGroupClick(glass);
		}
	};

	$effect(() => {
		const gui = new GUI({ width: 325 });
		const setup = async () => {
			const debugObject = {
				rotationSpeed: 0.5
			};

			const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
			const scene = new THREE.Scene();
			heading1 = document.getElementById('1heading')!;
			heading2 = document.getElementById('2heading')!;
			heading3 = document.getElementById('3heading')!;

			// Add environment map
			const textureLoader = new THREE.TextureLoader();
			const environmentMap = textureLoader.load(
				'/environmentMaps/blockadesLabsSkybox/digital_painting_neon_city_night_orange_lights_.jpg'
			);
			environmentMap.mapping = THREE.EquirectangularReflectionMapping;
			environmentMap.colorSpace = THREE.SRGBColorSpace;
			scene.environment = environmentMap;
			scene.environmentIntensity = 1;

			// Create glass text display
			glassText1 = await createGlassTextDisplay(scene, gui, {
				id: 1, // Add ID for identification
				text: 'Wonder Makers  Wonder Makers  Wonder Makers',
				startPosition: { x: -15, y: 17.5, z: -75 },
				startRotation: { x: 1.5, y: 0, z: -0.75 },
				targetPosition: { x: 0, y: 0, z: 0 },
				targetRotation: { x: 0.3, y: 0, z: 0 }
			});

			glassText2 = await createGlassTextDisplay(scene, gui, {
				id: 2, // Add ID for identification
				text: 'About us  About us  About us  About us  About us',
				startPosition: { x: 0, y: 17.5, z: -75 },
				startRotation: { x: 1.5, y: 0, z: -0.65 },
				targetPosition: { x: 0, y: 0, z: 0 },
				targetRotation: { x: 0.3, y: 0, z: 0 }
			});

			glassText3 = await createGlassTextDisplay(scene, gui, {
				id: 3, // Fix: Change ID from 2 to 3
				text: 'Our Work Our Work  Our Work  Our Work  Our Work',
				startPosition: { x: 15, y: 17.5, z: -75 },
				startRotation: { x: 1.5, y: 0, z: -0.55 },
				targetPosition: { x: 0, y: 0, z: 0 },
				targetRotation: { x: 0.3, y: 0, z: 0 }
			});

			isLoading = false;

			// Lights
			const directionalLight1 = new THREE.DirectionalLight('#e1fc06', 2.5);
			directionalLight1.position.set(1.6, -8.6, -5.2);
			scene.add(directionalLight1);

			const directionalLight2 = new THREE.DirectionalLight('#00fac8', 9.3);
			directionalLight2.position.set(-2.1, 2.3, 0.3);
			scene.add(directionalLight2);

			const ambientLight = new THREE.AmbientLight('#ffffff', 10.5);
			scene.add(ambientLight);

			// Sizes
			const sizes = {
				width: window.innerWidth,
				height: window.innerHeight - 56,
				pixelRatio: Math.min(window.devicePixelRatio, 2)
			};

			window.addEventListener('resize', () => {
				sizes.width = window.innerWidth;
				sizes.height = window.innerHeight - 56;
				sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

				camera.aspect = sizes.width / sizes.height;
				camera.updateProjectionMatrix();

				renderer.setSize(sizes.width, sizes.height);
				renderer.setPixelRatio(sizes.pixelRatio);
			});

			const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
			camera.position.set(0, 0, 17);
			camera.lookAt(0, 0, 0);
			scene.add(camera);
			// setupCameraGUI(camera, gui);

			const axesHelper = new THREE.AxesHelper(5);
			// scene.add(axesHelper);

			const mouse = {
				x: 0,
				y: 0,
				target: { x: 0, y: 0 }
			};

			const raycaster = new THREE.Raycaster();
			raycaster.params.Line.threshold = 0.1;
			const pointer = new THREE.Vector2();
			let isHovered = false;

			window.addEventListener('mousemove', (event) => {
				mouse.target.x = (event.clientX / sizes.width - 0.5) * 2;
				mouse.target.y = -(event.clientY / sizes.height - 0.5) * 2;

				pointer.x = (event.clientX / sizes.width) * 2 - 1;
				pointer.y = -((event.clientY - 56) / sizes.height) * 2 + 1;
			});

			const renderer = new THREE.WebGLRenderer({
				canvas: canvas,
				antialias: true
			});
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);

			const clock = new THREE.Clock();

			window.addEventListener('click', () => {
				raycaster.setFromCamera(pointer, camera);
				const glassGroups = [glassText1, glassText2, glassText3];

				for (const glass of glassGroups) {
					// Check intersections for all elements, not just active ones
					const intersects = raycaster.intersectObjects([glass.torus, glass.textMesh]);
					if (intersects.length > 0) {
						handleGroupClick(glass);
						break;
					}
				}
			});

			const tick = () => {
				const elapsedTime = clock.getElapsedTime();

				mouse.x += (mouse.target.x - mouse.x) * 0.1;
				mouse.y += (mouse.target.y - mouse.y) * 0.1;

				glassText1?.update(elapsedTime, mouse.x, mouse.y, debugObject.rotationSpeed);
				glassText2?.update(elapsedTime, mouse.x, mouse.y, debugObject.rotationSpeed);
				glassText3?.update(elapsedTime, mouse.x, mouse.y, debugObject.rotationSpeed);

				// Restore raycaster checks for active groups
				raycaster.setFromCamera(pointer, camera);
				const glassGroups = [glassText1, glassText2, glassText3].filter(Boolean);
				let isAnyHovered = false;

				for (const glass of glassGroups) {
					if (glass.state === 'active') {
						const intersects = raycaster.intersectObjects([glass.torus, glass.textMesh]);
						if (intersects.length > 0) {
							isAnyHovered = true;
							document.body.style.cursor = 'pointer';
							hoverAnimation.startHover(glass.torusMaterial);
							break;
						}
					}
				}

				if (!isAnyHovered) {
					document.body.style.cursor = 'default';
					glassGroups.forEach((glass) => {
						if (glass.state === 'active' && glass.torusMaterial.thickness > 0.6) {
							hoverAnimation.endHover(glass.torusMaterial);
						}
					});
				}

				renderer.render(scene, camera);
				animationFrameId = window.requestAnimationFrame(tick);
			};

			// Add event listeners for div hovers
			[1, 2, 3].forEach((id) => {
				const div = document.getElementById(`${id}div`);
				div?.addEventListener('mouseenter', () => handleDivHover(id, true));
				div?.addEventListener('mouseleave', () => handleDivHover(id, false));
			});

			tick();
		};

		setup();

		return () => {
			gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		};
	});

	// Add URL state handling
	$effect(() => {
		const url = new URL(window.location.href);
		const section = url.searchParams.get('section');

		if (!isLoading && section) {
			const sectionId = parseInt(section);
			if (sectionId >= 1 && sectionId <= 3) {
				const glass = [glassText1, glassText2, glassText3][sectionId - 1];
				if (glass && glass.state === 'idle') {
					handleGroupClick(glass);
				}
			}
		}
	});
</script>

<div>
	{#if isLoading}
		<div class="absolute inset-0 flex items-center justify-center">Loading...</div>
	{/if}
	<button
		id="animate"
		class="absolute left-1/2 cursor-pointer -translate-x-1/2 top-[10%] border rounded-md px-3 py-1"
		disabled={isLoading}
	>
		{isAnimatedIn ? 'Animate Out' : 'Animate In'}
	</button>
	<button
		id="1div"
		class="top-[185px] left-1/2 -translate-x-[265px] absolute w-fit cursor-pointer py-5 pl-10"
		onmouseenter={() => handleDivHover(1, true)}
		onmouseleave={() => handleDivHover(1, false)}
		onclick={() => handleButtonClick(1)}
	>
		<h2
			id="1heading"
			class="text-2xl font-audiowide py-1 bg-gradient-to-b from-transparent via-black to-transparent transition-opacity duration-500"
			class:opacity-0={activeGroupId === 1}
		>
			Home
		</h2>
	</button>
	<button
		class="top-[185px] left-1/2 -translate-x-[40px] absolute w-fit cursor-pointer py-5 pl-10"
		id="2div"
		onmouseenter={() => handleDivHover(2, true)}
		onmouseleave={() => handleDivHover(2, false)}
		onclick={() => handleButtonClick(2)}
	>
		<h2
			id="2heading"
			class="text-2xl font-audiowide py-1 bg-gradient-to-b from-transparent via-black to-transparent transition-opacity duration-500"
			class:opacity-0={activeGroupId === 2}
		>
			About
		</h2>
	</button>
	<button
		class="top-[185px] left-1/2 translate-x-[180px] absolute w-fit cursor-pointer py-5 pl-10"
		id="3div"
		onmouseenter={() => handleDivHover(3, true)}
		onmouseleave={() => handleDivHover(3, false)}
		onclick={() => handleButtonClick(3)}
	>
		<h2
			id="3heading"
			class="text-2xl font-audiowide py-1 bg-gradient-to-b from-transparent via-black to-transparent transition-opacity duration-500"
			class:opacity-0={activeGroupId === 3}
		>
			Work
		</h2>
	</button>
	<canvas class="webgl"></canvas>
</div>

<style>
	:global(body) {
		cursor: default;
		transition: cursor 0.1s ease-out;
	}

	[id$='heading'] {
		color: white;
	}
</style>

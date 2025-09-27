<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { GLTFLoader } from 'three/examples/jsm/Addons.js';
	import { setupCameraGUI } from '$lib/utils/cameraGUI';
	import { setupObjectGUI } from '$lib/utils/objectGUI';
	import gsap from 'gsap';
	import { setupLightGUI } from '$lib/utils/lightGUI';
	import {
		CSS3DRenderer,
		CSS3DObject
	} from 'three/examples/jsm/renderers/CSS3DRenderer.js';

	type DebugObject = {
		directionalLightColor: string;
		romanColumn: {
			scale: number;
			rotation: {
				x: number;
				y: number;
				z: number;
			};
			position: {
				x: number;
				y: number;
				z: number;
			};
		};
	};

	let romanColumnModel: THREE.Group | undefined;
	let chainModel: THREE.Group | undefined; // Add near the top with other model declarations
	let planeMaterials: THREE.MeshStandardMaterial[] = [];
	let chainMaterials: THREE.MeshStandardMaterial[] = [];
	let boardMaterials: THREE.MeshStandardMaterial[] = []; // Add this line
	let heroHeading: HTMLElement | undefined;
	let heroSubheading: HTMLElement | undefined;
	let boards: THREE.Mesh[] = []; // Add this with other array declarations
	let boardTemplate: THREE.Mesh | undefined; // Add this variable near the top with other model declarations

	const cameraY = 6;
	const minCameraY = -6;
	let isMobile: boolean;
	let baseRadius: number;
	const radiusVariation = 2;
	const zoomedRadius = 8;

	onMount(() => {
		isMobile = window.innerWidth <= 768;
		baseRadius = isMobile ? 27.5 : 15;
		currentRadius = baseRadius;
		targetRadius = baseRadius;
	});

	// Initialize with default values (will be updated in onMount)
	let currentRadius: number;
	let targetRadius: number;
	let currentAngle = Math.PI / 2;
	let currentCameraY = cameraY;
	let camera: THREE.PerspectiveCamera;
	let cameraFolder: GUI;

	// Add these variables for smooth movement
	let targetCameraY = cameraY;
	let targetAngle = Math.PI / 2;
	let lerpFactor = 0.05; // Add this near other state variables

	// Add these constants near the top
	const DEFAULT_ANGLE = Math.PI / 2;
	const DEFAULT_Y = 6;
	const PLANE_ANGLE_STEP = Math.PI / 3;
	const INITIAL_CHAIN_SCROLL = 2; // Final value of chain scroll after first animation

	// Lerp helper function
	const lerp = (start: number, end: number, factor: number) => {
		return start + (end - start) * factor;
	};

	const timeScaledLerp = (baseFactor: number, delta: number) => {
		return 1 - Math.pow(1 - baseFactor, delta * 60);
	};

	const lerpAngle = (start: number, end: number, factor: number) => {
		const twoPi = Math.PI * 2;
		let delta = (((end - start) % twoPi) + twoPi) % twoPi;
		if (delta > Math.PI) {
			delta -= twoPi;
		}
		return start + delta * factor;
	};

	let hasInitialAnimationPlayed = false;
	let isReverseAnimating = false; // Add this with other state variables

	// Add these near other state variables at the top
	let initialColumnState = {
		rotation: { x: 0, y: 0, z: 0 },
		position: { x: 0, y: 0, z: 0 }
	};

	// Add this state variable with other state variables
	let disableDynamicOpacity = false;

	// Add this state variable near other state variables
	// Add this near other state variables
	let zoomedPlaneIndex: number | null = null;

	const INITIAL_ANIMATION_SCROLL_SENSITIVITY = 0.04;
	const INTRO_PROGRESS_LERP = 0.075;
	const INTRO_RELEASE_THRESHOLD = 0.8;
	const INTRO_COMPLETION_THRESHOLD = 0.9;
	let initialAnimationTimeline: gsap.core.Timeline | null = null;
	let introCurrentProgress = 0;
	let introTargetProgress = 0;
	let initialAnimationCompleted = false;
	let initialAnimationOpacities: number[] = [];

	// Replace the handleScroll function
	const handleScroll = (deltaY: number) => {
		if (!camera || isReverseAnimating) return;

		const wantsIntroRewind =
			initialAnimationCompleted &&
			hasInitialAnimationPlayed &&
			deltaY < 0 &&
			currentCameraY >= DEFAULT_Y - 0.2 &&
			introTargetProgress > 0;

		const introReadyToRelease =
			introTargetProgress >= INTRO_RELEASE_THRESHOLD &&
			introCurrentProgress >= INTRO_RELEASE_THRESHOLD;

		if (
			!introReadyToRelease ||
			!initialAnimationCompleted ||
			wantsIntroRewind
		) {
			scrubInitialAnimation(deltaY);
			return;
		}

		// Calculate next target Y position
		const nextTargetY = targetCameraY - deltaY * 0.5 * 0.01;

		// Check if we're at the top and scrolling up
		if (Math.abs(currentCameraY - DEFAULT_Y) < 0.1 && deltaY < 0) {
			handleReverseAnimation();
			return;
		}

		// Check if we would exceed bounds
		if (nextTargetY > DEFAULT_Y) {
			// Snap to top position
			targetCameraY = DEFAULT_Y;
			targetAngle = DEFAULT_ANGLE;
			return;
		}
		if (nextTargetY < minCameraY) return;

		const scrollSpeed = 0.5;
		const rotationSpeed = 0.525;
		const delta = deltaY * scrollSpeed * 0.01;

		// Update target values
		targetCameraY = nextTargetY;
		targetAngle -= delta * rotationSpeed;

		// Gradually return to base radius if we're zoomed in
		if (targetRadius !== baseRadius) {
			targetRadius = baseRadius;

			// Hide all h2s when zooming out
			for (let i = 1; i <= 7; i++) {
				const div = document.getElementById(i.toString());
				if (div) {
					const h2 = div.querySelector('h2');
					if (h2) {
						gsap.to(h2, {
							opacity: 0,
							duration: 0.5,
							ease: 'power2.inOut'
						});
					}
				}
			}

			// Reset zoomed plane index and animate text opacity back
			if (zoomedPlaneIndex !== null) {
				const elementToFade = css3dElements[zoomedPlaneIndex].element;
				gsap.to(elementToFade, {
					opacity: 1, // Start transition back to 1
					duration: 1,
					ease: 'power2.inOut'
				});
				zoomedPlaneIndex = null;
			}

			// Lerp opacity back to 0.5 for all planes and boards
			planeMaterials.forEach((material, index) => {
				if (material.opacity > 0.5) {
					gsap.to([material], {
						opacity: 0.5,
						duration: 1,
						ease: 'power2.inOut'
					});
				}
			});
		}

		// Add radius oscillation based on rotation
		targetRadius = baseRadius + Math.sin(targetAngle * 2) * radiusVariation;
	};

	// Add this helper function to calculate initial opacities
	const calculateInitialElementOpacities = (numElements: number) => {
		return Array(numElements)
			.fill(0)
			.map((_, index) => {
				// Make first element fully visible, adjacent elements partially visible
				if (index === 0) return 1;
				if (index === 1 || index === numElements - 1) return 0.25;
				return 0;
			});
	};

	const ensureInitialAnimationTimeline = () => {
		if (initialAnimationTimeline) {
			return initialAnimationTimeline;
		}

		if (!romanColumnModel || !chainModel || !heroHeading || !heroSubheading) {
			return null;
		}

		initialAnimationOpacities = calculateInitialElementOpacities(
			css3dElements.length
		);

		chainModel.position.y = DEFAULT_Y + 2;
		chainModel.traverse((child) => {
			if (child instanceof THREE.Mesh && (child as any).customUniforms) {
				(child as any).customUniforms.uScroll.value = -1;
			}
		});

		const timeline = gsap.timeline({
			paused: true,
			defaults: {
				duration: 2,
				ease: 'power2.inOut'
			}
		});

		timeline
			.to(romanColumnModel.rotation, {
				x: 0,
				y: 1.2,
				z: 0
			})
			.to(
				romanColumnModel.position,
				{
					x: 0,
					y: -15.25,
					z: 0,
					duration: 2
				},
				'-=2'
			)
			.to(
				[heroHeading, heroSubheading],
				{
					opacity: 0,
					duration: 1,
					stagger: 0.2
				},
				'-=1.75'
			)
			.to(
				chainModel.position,
				{
					y: DEFAULT_Y - 2,
					duration: 1.5,
					ease: 'power4.out'
				},
				'-=1'
			)
			.to(
				chainMaterials,
				{
					opacity: 1,
					duration: 1.5,
					stagger: 0.1,
					ease: 'power2.inOut'
				},
				'-=2'
			)
			.to(
				{},
				{
					duration: 1.5,
					onUpdate: function () {
						const progress = this.progress();
						chainModel?.traverse((child) => {
							if (
								child instanceof THREE.Mesh &&
								(child as any).customUniforms
							) {
								(child as any).customUniforms.uScroll.value =
									-1 + progress * (1 + INITIAL_CHAIN_SCROLL);
							}
						});
					}
				},
				'-=1.5'
			)
			.to(
				[...planeMaterials],
				{
					opacity: 0.5,
					duration: 1,
					stagger: 0.1
				},
				'-=0.9'
			)
			.to(
				[...boardMaterials],
				{
					opacity: 1,
					duration: 1,
					stagger: 0.1
				},
				'-=1.9'
			)
			.to(
				css3dElements.map((element) => element.element),
				{
					opacity: (i) => initialAnimationOpacities[i],
					duration: 1.5,
					stagger: 0.1,
					ease: 'power2.inOut'
				},
				'-=1.5'
			);

		initialAnimationTimeline = timeline;
		introCurrentProgress = 0;
		introTargetProgress = 0;
		initialAnimationCompleted = false;
		hasInitialAnimationPlayed = false;
		timeline.progress(0);

		return timeline;
	};

	const scrubInitialAnimation = (deltaY: number) => {
		const timeline = ensureInitialAnimationTimeline();
		if (!timeline) return;

		const clampedDelta = gsap.utils.clamp(-120, 120, deltaY);
		const easedDelta = clampedDelta / 120;
		const progressDelta = easedDelta * INITIAL_ANIMATION_SCROLL_SENSITIVITY;
		introTargetProgress = gsap.utils.clamp(
			0,
			1,
			introTargetProgress + progressDelta
		);
		targetRadius = baseRadius;
		targetAngle = DEFAULT_ANGLE;
		targetCameraY = DEFAULT_Y;

		if (introTargetProgress < INTRO_RELEASE_THRESHOLD) {
			hasInitialAnimationPlayed = false;
			initialAnimationCompleted = false;
		}
	};

	// Replace the handleReverseAnimation function
	const handleReverseAnimation = () => {
		if (!romanColumnModel || !chainModel || !heroHeading || !heroSubheading)
			return;

		isReverseAnimating = true;
		disableDynamicOpacity = true; // Disable dynamic opacity updates

		const tl = gsap.timeline({
			defaults: {
				duration: 2,
				ease: 'power2.inOut'
			},
			onComplete: () => {
				isReverseAnimating = false;
				hasInitialAnimationPlayed = false;
				disableDynamicOpacity = false; // Re-enable dynamic opacity updates
				introTargetProgress = 0;
				introCurrentProgress = 0;
				initialAnimationCompleted = false;
				hasInitialAnimationPlayed = false;
				initialAnimationTimeline?.progress(0);

				// Force reset all material opacities at the end
				planeMaterials.forEach((material) => (material.opacity = 0));
				boardMaterials.forEach((material) => (material.opacity = 0));
				chainMaterials.forEach((material) => (material.opacity = 0));
			}
		});

		// Reset camera position
		targetRadius = baseRadius;
		targetAngle = DEFAULT_ANGLE;
		targetCameraY = DEFAULT_Y;

		// First animate all grouped elements with stagger
		planes.forEach((_, index) => {
			// Create a proxy object for the CSS3D element opacity
			const opacityProxy = {
				value: parseFloat(css3dElements[index].element.style.opacity) || 0
			};

			// Animate plane and board materials
			tl.to(
				[planeMaterials[index], boardMaterials[index]],
				{
					opacity: 0,
					duration: 0.75,
					ease: 'power2.inOut'
				},
				index * 0.15
			);

			// Animate the proxy object and update the CSS3D element opacity
			tl.to(
				opacityProxy,
				{
					value: 0,
					duration: 0.75,
					ease: 'power2.inOut',
					onUpdate: () => {
						css3dElements[index].element.style.opacity =
							opacityProxy.value.toString();
					}
				},
				index * 0.15 // Same timing as materials
			);
		});

		// Rest of the animation remains the same
		tl.to(
			chainMaterials,
			{
				opacity: 0,
				duration: 0.5,
				stagger: 0.1,
				ease: 'power2.inOut'
			},
			'-=0.75'
		)
			.to(
				romanColumnModel.rotation,
				{
					x: initialColumnState.rotation.x,
					y: initialColumnState.rotation.y,
					z: initialColumnState.rotation.z,
					duration: 1.25
				},
				'-=0.5'
			)
			.to(
				romanColumnModel.position,
				{
					x: initialColumnState.position.x,
					y: initialColumnState.position.y,
					z: initialColumnState.position.z,
					duration: 1.25
				},
				'-=1.25'
			)
			.to(
				[heroHeading, heroSubheading],
				{
					opacity: 1,
					duration: 0.75,
					stagger: 0.2
				},
				'-=1'
			);

		// Hide all divs and h2s
		for (let i = 1; i <= 7; i++) {
			const div = document.getElementById(i.toString());
			if (div) {
				const h2 = div.querySelector('h2');
				if (h2) {
					gsap.to(h2, {
						opacity: 0,
						duration: 0.5,
						ease: 'power2.inOut'
					});
				}
			}
		}
	};

	// Add these variables after the existing declarations
	let mouse = new THREE.Vector2();
	let raycaster = new THREE.Raycaster();
	let planes: THREE.Mesh[] = [];
	let hitboxPlanes: THREE.Mesh[] = []; // Add this new array
	let hoveredPlane: THREE.Mesh | null = null;

	// Add mouse move handler after the handleScroll function
	const handleMouseMove = (event: MouseEvent) => {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);
	};

	// Replace the handleClick function
	const handleClick = (event: MouseEvent) => {
		if (!hasInitialAnimationPlayed) return;
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(hitboxPlanes);

		// First, hide all h2s
		for (let i = 1; i <= 7; i++) {
			const div = document.getElementById(i.toString());
			if (div) {
				const h2 = div.querySelector('h2');
				if (h2) {
					gsap.to(h2, {
						opacity: 0,
						duration: 0.5,
						ease: 'power2.inOut'
					});
				}
			}
		}

		if (intersects.length > 0) {
			const hitboxPlane = intersects[0].object as THREE.Mesh;
			const visiblePlane = (hitboxPlane as any).visiblePair as THREE.Mesh;
			const planeIndex = parseInt(visiblePlane.name);

			// Show the corresponding h2
			const div = document.getElementById((planeIndex + 1).toString());
			if (div) {
				const h2 = div.querySelector('h2');
				if (h2) {
					gsap.to(h2, {
						opacity: 1,
						duration: 1,
						ease: 'power2.inOut',
						delay: 1.0
					});
				}
			}

			// Rest of the click handler...
			zoomedPlaneIndex = planeIndex;
			targetAngle = DEFAULT_ANGLE - planeIndex * PLANE_ANGLE_STEP;
			targetCameraY = DEFAULT_Y - planeIndex * 2;
			targetRadius = zoomedRadius;

			gsap.to(planeMaterials[planeIndex], {
				opacity: 1.0,
				duration: 1.5,
				ease: 'power2.inOut'
			});

			const elementToFade = css3dElements[planeIndex].element;
			gsap.to(elementToFade, {
				opacity: 0,
				duration: 1,
				ease: 'power2.inOut'
			});

			lerpFactor = 0.05;

			gsap.to(
				{ value: lerpFactor },
				{
					value: 0.05,
					duration: 3,
					ease: 'power2.out',
					onUpdate: function () {
						lerpFactor = this.targets()[0].value;
					}
				}
			);
		}
	};

	// Add these variables after other state declarations
	let lastTouchY: number | null = null;
	const TOUCH_SENSITIVITY = 2.5;

	// Add these touch handler functions before the effect
	const handleTouchStart = (event: TouchEvent) => {
		lastTouchY = event.touches[0].clientY;
	};

	const handleTouchMove = (event: TouchEvent) => {
		event.preventDefault();

		if (lastTouchY === null) return;

		const currentTouchY = event.touches[0].clientY;
		const deltaY = (lastTouchY - currentTouchY) * TOUCH_SENSITIVITY;

		handleScroll(deltaY);

		lastTouchY = currentTouchY;
	};

	const handleTouchEnd = () => {
		lastTouchY = null;
	};

	let controls: OrbitControls;
	let useCustomControls = true;

	// Add new state variables
	let css3dRenderer: CSS3DRenderer;
	let css3dElements: CSS3DObject[] = [];

	// Update planeContents to match HTML order
	const planeContents = [
		{ title: 'Community' },
		{ title: 'Innovation' },
		{ title: 'Passion' },
		{ title: 'Excellence' },
		{ title: 'Vision' },
		{ title: 'Legacy' },
		{ title: 'Integrity' }
	];

	// Add this function before the $effect
	const createCSS3DElement = (content: { title: string }) => {
		const element = document.createElement('div');
		element.className = 'css3d-content';
		element.style.opacity = '0';
		element.innerHTML = `
			<h2 class="text-5xl font-cinzel font-semibold text-white">${content.title}</h2>
		`;
		const css3dObject = new CSS3DObject(element);
		// Add a smaller scale to match regular DOM sizes
		css3dObject.scale.set(0.01, 0.01, 0.01);
		return css3dObject;
	};

	// Add this helper function after other utility functions
	const calculateElementOpacity = (
		elementIndex: number,
		currentAngle: number
	) => {
		// If this element is zoomed in, return 0 regardless of angle
		if (elementIndex === zoomedPlaneIndex) {
			return 0;
		}

		const elementAngle = DEFAULT_ANGLE - elementIndex * PLANE_ANGLE_STEP;
		const angleDiff = Math.abs(
			((currentAngle - elementAngle + Math.PI) % (2 * Math.PI)) - Math.PI
		);

		// Define visibility range (in radians)
		const fullVisibleRange = Math.PI / 6;
		const fadeRange = Math.PI / 3;

		if (angleDiff < fullVisibleRange) {
			return 1;
		} else if (angleDiff < fadeRange) {
			return 0.25;
		}
		return 0;
	};

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: DebugObject = {
			directionalLightColor: '#860909e',
			romanColumn: {
				scale: 0.45,
				rotation: {
					x: -0.81,
					y: 2.26,
					z: 0.19
				},
				position: {
					x: isMobile ? 1 : 5,
					y: isMobile ? -7 : -10,
					z: 4
				}
			}
		};
		gui.close();
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		heroHeading = document.getElementById('hero-heading')!;
		heroSubheading = document.getElementById('hero-subheading')!;
		const scene = new THREE.Scene();
		const gltfLoader = new GLTFLoader();

		const loadColumnModel = (): Promise<THREE.Group> => {
			return new Promise((resolve) => {
				gltfLoader.load('/models/rome-column/ionic_column.glb', (gltf) => {
					const scale = debugObject.romanColumn.scale;
					gltf.scene.scale.set(scale, scale, scale);

					// Store initial values
					initialColumnState.rotation = {
						x: debugObject.romanColumn.rotation.x,
						y: debugObject.romanColumn.rotation.y,
						z: debugObject.romanColumn.rotation.z
					};
					initialColumnState.position = {
						x: debugObject.romanColumn.position.x,
						y: debugObject.romanColumn.position.y,
						z: debugObject.romanColumn.position.z
					};

					gltf.scene.rotation.x = initialColumnState.rotation.x;
					gltf.scene.rotation.y = initialColumnState.rotation.y;
					gltf.scene.rotation.z = initialColumnState.rotation.z;
					gltf.scene.position.x = initialColumnState.position.x;
					gltf.scene.position.y = initialColumnState.position.y;
					gltf.scene.position.z = initialColumnState.position.z;

					scene.add(gltf.scene);
					romanColumnModel = gltf.scene;
					resolve(gltf.scene);
				});
			});
		};

		const loadBoardModel = (): Promise<THREE.Mesh> => {
			return new Promise((resolve) => {
				if (boardTemplate) {
					// If we already have a template, clone it and its materials
					const clone = boardTemplate.clone();
					// Create new materials for each submesh
					clone.traverse((child) => {
						if (child instanceof THREE.Mesh) {
							const originalMaterial =
								child.material as THREE.MeshStandardMaterial;
							const newMaterial = new THREE.MeshStandardMaterial({
								map: originalMaterial.map,
								metalness: originalMaterial.metalness,
								roughness: originalMaterial.roughness,
								transparent: true,
								opacity: 0,
								depthWrite: true
							});
							child.material = newMaterial;
							boardMaterials.push(newMaterial);
						}
					});
					resolve(clone);
				} else {
					// Load the model for the first time
					gltfLoader.load('/models/board/board.glb', (gltf) => {
						const scale = 0.0075;
						const actualItem = gltf.scene.children[0].children[0].children[0]
							.children[1] as THREE.Mesh;

						// Center the board's geometry
						const box = new THREE.Box3().setFromObject(actualItem);
						const center = box.getCenter(new THREE.Vector3());
						actualItem.position.sub(center);

						// Create and apply materials for each submesh
						actualItem.traverse((child) => {
							if (child instanceof THREE.Mesh) {
								const originalMaterial =
									child.material as THREE.MeshStandardMaterial;
								const material = new THREE.MeshStandardMaterial({
									map: originalMaterial.map,
									metalness: originalMaterial.metalness,
									roughness: originalMaterial.roughness,
									transparent: true,
									opacity: 0,
									depthWrite: true
								});
								child.material = material;
								boardMaterials.push(material);
							}
						});

						actualItem.scale.set(scale, scale, scale);
						boardTemplate = actualItem; // Save as template
						resolve(actualItem);
					});
				}
			});
		};

		const loadChainModel = (): Promise<THREE.Group> => {
			return new Promise((resolve) => {
				gltfLoader.load('/models/chain/chain.glb', (gltf) => {
					const scale = debugObject.romanColumn.scale;
					gltf.scene.scale.set(scale, scale, scale);
					gltf.scene.position.y = currentCameraY;

					// Add custom uniforms for the shader
					const customUniforms = {
						uTime: { value: 0 },
						uScroll: { value: 0 }
					};

					// Modify materials of the chain model
					gltf.scene.traverse((child) => {
						if (child instanceof THREE.Mesh) {
							// Create new standard material
							const material = new THREE.MeshStandardMaterial({
								map: child.material.map,
								normalMap: child.material.normalMap,
								metalness: child.material.metalness,
								roughness: child.material.roughness,
								transparent: true, // Add transparent
								opacity: 0, // Start fully transparent
								depthWrite: false // This helps with transparency artifacts
							});

							chainMaterials.push(material);

							// Create depth material for shadows
							const depthMaterial = new THREE.MeshDepthMaterial({
								depthPacking: THREE.RGBADepthPacking,
								transparent: true, // Add transparent
								opacity: 0 // Set initial opacity to 0
							});

							// Add shader modifications to standard material
							material.onBeforeCompile = (shader) => {
								shader.uniforms.uTime = customUniforms.uTime;
								shader.uniforms.uScroll = customUniforms.uScroll;
								shader.vertexShader = shader.vertexShader.replace(
									'#include <common>',
									`
									#include <common>
									uniform float uTime;
									uniform float uScroll;
									`
								);

								shader.vertexShader = shader.vertexShader.replace(
									'#include <beginnormal_vertex>',
									`
									#include <beginnormal_vertex>

									// float angle = sin(position.y + uTime) * 0.4;
									// mat2 rotateMatrix = get2dRotateMatrix(angle);
									// objectNormal.xz = rotateMatrix * objectNormal.xz;
									`
								);

								shader.vertexShader = shader.vertexShader.replace(
									'#include <begin_vertex>',
									`
									#include <begin_vertex>
									float scrollInfluence = uScroll * 5.75; // Increased influence
									float wrapAngle = (position.y - scrollInfluence + 10.0) * 0.1;
									float heightFactor = (position.y + 7.0) / 14.0; // Normalize y position to 0-1 range
									float chainRadius = 6.5 + (heightFactor * 4.0); // Add 0-3 based on height
									transformed.x += cos(wrapAngle) * chainRadius;
									transformed.z += sin(wrapAngle) * chainRadius;
									`
								);
							};

							child.material = material;
							child.customDepthMaterial = depthMaterial;
							(child as any).customUniforms = customUniforms;
						}
					});

					// setupObjectGUI(gltf.scene, gui, 'Chain');
					chainModel = gltf.scene;
					scene.add(gltf.scene);
					resolve(gltf.scene);
				});
			});
		};

		// Add controls toggle to GUI right after creating it
		gui
			.add({ useCustomControls }, 'useCustomControls')
			.name('Use Custom Controls')
			.onChange((value: boolean) => {
				useCustomControls = value;
				if (controls) {
					controls.enabled = !value;
				}
			});

		// Create Plane
		const addPlane = async ({
			height,
			angle,
			name
		}: {
			height: number;
			angle: number;
			name: string;
		}) => {
			const radius = 5;
			const angleRad = (-(angle - 90) * Math.PI) / 180;

			const posX = radius * Math.cos(angleRad);
			const posZ = radius * Math.sin(angleRad);

			// Update plane dimensions to match board
			const planeWidth = 5.25; // Slightly wider than board
			const planeHeight = 2.55; // Match board height

			// Create visible plane with updated dimensions
			const material = new THREE.MeshStandardMaterial({
				color: '#ffffff',
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.0,
				depthWrite: true,
				alphaTest: 0.1
			});
			planeMaterials.push(material);
			const visiblePlane = new THREE.Mesh(
				new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1),
				material
			);
			visiblePlane.renderOrder = 1;

			// Slightly larger hitbox for better interaction
			const hitboxPlane = new THREE.Mesh(
				new THREE.PlaneGeometry(planeWidth + 0.2, planeHeight + 0.2, 1, 1),
				new THREE.MeshBasicMaterial({
					transparent: true,
					opacity: 0,
					side: THREE.DoubleSide,
					depthWrite: false,
					depthTest: true
				})
			);
			hitboxPlane.renderOrder = 0;

			// Position and align both planes
			visiblePlane.position.set(posX, height, posZ);
			hitboxPlane.position.set(posX, height, posZ);
			visiblePlane.lookAt(0, height, 0);
			hitboxPlane.lookAt(0, height, 0);

			// Store original position for both planes
			const planeOriginalPosition = {
				x: posX,
				y: height,
				z: posZ,
				angle: angleRad
			};

			(visiblePlane as any).originalPosition = planeOriginalPosition;
			(hitboxPlane as any).originalPosition = planeOriginalPosition;
			(hitboxPlane as any).visiblePair = visiblePlane;

			visiblePlane.name = name;

			scene.add(visiblePlane);
			scene.add(hitboxPlane);
			planes.push(visiblePlane);
			hitboxPlanes.push(hitboxPlane);

			// Add board at plane position
			const board = await loadBoardModel();
			board.position.copy(visiblePlane.position);
			board.rotation.copy(visiblePlane.rotation);

			// Consistent z-offset
			const zOffset = 0.05;
			board.position.z -= zOffset;

			// Store original position for board
			(board as any).originalPosition = {
				x: posX,
				y: height,
				z: posZ - zOffset
			};

			// Link board and plane
			(board as any).parentPlane = visiblePlane;
			(visiblePlane as any).linkedBoard = board;

			scene.add(board);
			boards.push(board);

			// Add CSS3D content
			const content = planeContents[parseInt(name)];
			const css3dElement = createCSS3DElement(content);

			// Position the CSS3D element in front of the plane
			const offsetZ = 0.1;
			css3dElement.position.set(posX, height, posZ - offsetZ);
			css3dElement.lookAt(0, height, 0); // First make it look at center
			css3dElement.rotateY(Math.PI); // Then flip it 180 degrees

			scene.add(css3dElement);
			css3dElements.push(css3dElement);

			return visiblePlane;
		};

		// Replace the createPlanesSequentially function with this:
		const createPlanesSequentially = async () => {
			// First, ensure board template is loaded
			if (!boardTemplate) {
				await loadBoardModel();
			}

			const planeConfigs = [
				{ height: 6, angle: 0, name: '0' },
				{ height: 4, angle: 60, name: '1' },
				{ height: 2, angle: 120, name: '2' },
				{ height: 0, angle: 180, name: '3' },
				{ height: -2, angle: 240, name: '4' },
				{ height: -4, angle: 300, name: '5' },
				{ height: -6, angle: 360, name: '6' }
			];

			// Create planes one at a time in sequence
			for (const config of planeConfigs) {
				await addPlane(config);
			}
		};

		// Add initialization function
		const initScene = async () => {
			await loadColumnModel();
			await loadChainModel();
			// Load board template first
			if (!boardTemplate) {
				await loadBoardModel();
			}
			await createPlanesSequentially();
			ensureInitialAnimationTimeline();
			// Start the animation loop only after everything is loaded
			tick();
		};

		// Replace the direct calls with initScene
		// loadColumnModel();
		// loadBoardModel();
		// loadChainModel();
		// createPlanesSequentially();
		initScene();

		// Lights
		const addLights = () => {
			const directionalLight1 = new THREE.DirectionalLight('', 5);
			directionalLight1.color.set('#860909');
			directionalLight1.position.set(6.25, 3, 4);
			setupLightGUI(directionalLight1, gui, 'Directional Light');
			scene.add(directionalLight1);

			const directionalLight2 = new THREE.DirectionalLight('', 2.5);
			directionalLight2.color.set('#ffffff');
			directionalLight2.position.set(-10.6, -2.1, 2.3);
			directionalLight2.rotation.set(0.47, 0.69, 0.31);
			setupLightGUI(directionalLight2, gui, 'Directional Light 2');
			scene.add(directionalLight2);

			const ambientLight = new THREE.AmbientLight('#ffffff', 0.15);
			scene.add(ambientLight);
		};

		addLights();

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
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
			css3dRenderer.setSize(sizes.width, sizes.height); // Update CSS3D renderer size
		});

		// Camera setup
		const initialPosX = baseRadius * Math.cos(DEFAULT_ANGLE) * 0.75;
		const initialPosZ = baseRadius * Math.sin(DEFAULT_ANGLE) * 0.75;
		camera = new THREE.PerspectiveCamera(
			35,
			sizes.width / sizes.height,
			0.1,
			2000
		);
		camera.position.set(initialPosX, DEFAULT_Y, initialPosZ);
		camera.lookAt(0, DEFAULT_Y, 0);

		// Add camera GUI controls
		// cameraFolder = setupCameraGUI(camera, gui);

		// After camera setup, add OrbitControls
		controls = new OrbitControls(camera, canvas);
		controls.enabled = !useCustomControls;
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;

		window.addEventListener('wheel', (event: WheelEvent) =>
			handleScroll(event.deltaY)
		);

		// Add mouse move event listener
		window.addEventListener('mousemove', handleMouseMove);

		// Add click event listener after other event listeners
		window.addEventListener('click', handleClick);

		// Add touch event listeners after other event listeners
		window.addEventListener('touchstart', handleTouchStart, { passive: false });
		window.addEventListener('touchmove', handleTouchMove, { passive: false });
		window.addEventListener('touchend', handleTouchEnd);

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Add CSS3D renderer setup after WebGL renderer setup
		css3dRenderer = new CSS3DRenderer();
		css3dRenderer.setSize(sizes.width, sizes.height);
		css3dRenderer.domElement.style.position = 'absolute';
		css3dRenderer.domElement.style.top = '0';
		css3dRenderer.domElement.style.pointerEvents = 'none';
		document
			.querySelector('.webgl-container')
			?.appendChild(css3dRenderer.domElement);

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const deltaTime = clock.getDelta();
			const elapsedTime = clock.elapsedTime;
			const smoothFactor = timeScaledLerp(lerpFactor, deltaTime);

			if (initialAnimationTimeline) {
				const introSmoothFactor = timeScaledLerp(
					INTRO_PROGRESS_LERP,
					deltaTime
				);
				introCurrentProgress = lerp(
					introCurrentProgress,
					introTargetProgress,
					introSmoothFactor
				);
				if (Math.abs(introCurrentProgress - introTargetProgress) < 0.001) {
					introCurrentProgress = introTargetProgress;
				}

				introTargetProgress = gsap.utils.clamp(0, 1, introTargetProgress);
				introCurrentProgress = gsap.utils.clamp(0, 1, introCurrentProgress);

				initialAnimationTimeline.progress(introCurrentProgress);

				const introReleased =
					introCurrentProgress >= INTRO_RELEASE_THRESHOLD &&
					introTargetProgress >= INTRO_RELEASE_THRESHOLD;

				if (introReleased) {
					initialAnimationCompleted = true;
					hasInitialAnimationPlayed = true;
				} else {
					initialAnimationCompleted = false;
					if (introTargetProgress < 0.001) {
						hasInitialAnimationPlayed = false;
					}
				}

				if (
					introCurrentProgress >= INTRO_COMPLETION_THRESHOLD &&
					introTargetProgress >= INTRO_COMPLETION_THRESHOLD
				) {
					introCurrentProgress = 1;
					introTargetProgress = 1;
					initialAnimationTimeline.progress(1);
					initialAnimationCompleted = true;
					hasInitialAnimationPlayed = true;
				}
			}

			if (useCustomControls) {
				// Existing custom camera movement
				currentCameraY = lerp(currentCameraY, targetCameraY, smoothFactor);
				currentAngle = lerpAngle(currentAngle, targetAngle, smoothFactor);
				currentRadius = lerp(currentRadius, targetRadius, smoothFactor);

				const posX = currentRadius * Math.cos(currentAngle);
				const posZ = currentRadius * Math.sin(currentAngle);

				camera.position.set(posX, currentCameraY, posZ);
				camera.lookAt(0, currentCameraY + 0.5, 0);
			} else {
				controls.update();
			}

			// Update raycaster to only check hitbox planes
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(hitboxPlanes);

			// Handle hover effects with UV-based edge detection
			if (intersects.length > 0) {
				const hitboxPlane = intersects[0].object as THREE.Mesh;
				const visiblePlane = (hitboxPlane as any).visiblePair as THREE.Mesh;
				const board = (visiblePlane as any).linkedBoard as THREE.Mesh;

				if (hoveredPlane !== visiblePlane && board) {
					// Reset previous hover state
					if (hasInitialAnimationPlayed) {
						document.getElementsByTagName('body')[0].style.cursor = 'pointer';
					}
					if (hoveredPlane) {
						const prevBoard = (hoveredPlane as any).linkedBoard;
						const originalPlanePose = (hoveredPlane as any).originalPosition;
						const originalBoardPose = (prevBoard as any).originalPosition;

						gsap.to(hoveredPlane.position, {
							x: originalPlanePose.x,
							y: originalPlanePose.y,
							z: originalPlanePose.z,
							duration: 0.5
						});

						if (prevBoard) {
							gsap.to(prevBoard.position, {
								x: originalBoardPose.x,
								y: originalBoardPose.y,
								z: originalBoardPose.z,
								duration: 0.5
							});
						}
					}

					// Move current plane and board
					const orig = (visiblePlane as any).originalPosition;
					const moveDistance = 0.5;
					const newX = orig.x * (1 + moveDistance / 5);
					const newZ = orig.z * (1 + moveDistance / 5);

					gsap.to(visiblePlane.position, {
						x: newX,
						y: orig.y,
						z: newZ,
						duration: 0.5
					});

					gsap.to(board.position, {
						x: newX,
						y: orig.y,
						z: newZ - 0.1,
						duration: 0.5
					});

					hoveredPlane = visiblePlane;
				}
			} else if (hoveredPlane) {
				const board = (hoveredPlane as any).linkedBoard;
				const originalPlanePose = (hoveredPlane as any).originalPosition;
				const originalBoardPose = (board as any).originalPosition;
				document.getElementsByTagName('body')[0].style.cursor = 'default';

				gsap.to(hoveredPlane.position, {
					x: originalPlanePose.x,
					y: originalPlanePose.y,
					z: originalPlanePose.z,
					duration: 0.5
				});

				if (board) {
					gsap.to(board.position, {
						x: originalBoardPose.x,
						y: originalBoardPose.y,
						z: originalBoardPose.z,
						duration: 0.5
					});
				}

				hoveredPlane = null;
			}

			// Update GUI if values changed significantly
			// if (Math.abs(currentCameraY - targetCameraY) > 0.001) {
			// 	cameraFolder.controllers.forEach((controller) => controller.updateDisplay());
			// }

			// Update only chain position and shader uniforms
			const isScrubbingIntro =
				introTargetProgress < INTRO_RELEASE_THRESHOLD ||
				introCurrentProgress < INTRO_RELEASE_THRESHOLD;
			if (chainModel && !isScrubbingIntro) {
				chainModel.position.y =
					currentCameraY - 2 - (DEFAULT_Y - currentCameraY) * 0.4;

				chainModel.traverse((child) => {
					if (child instanceof THREE.Mesh && (child as any).customUniforms) {
						(child as any).customUniforms.uTime.value = elapsedTime;
						// Start from INITIAL_CHAIN_SCROLL and add the scroll influence
						const scrollValue =
							INITIAL_CHAIN_SCROLL + (DEFAULT_Y - currentCameraY) * 2;
						(child as any).customUniforms.uScroll.value = scrollValue;
					}
				});
			}

			// Update CSS3D element positions and opacity
			css3dElements.forEach((element, index) => {
				const plane = planes[index];
				if (plane) {
					element.position.copy(plane.position);
					element.lookAt(0, plane.position.y, 0);
					element.rotateY(Math.PI);

					// Only apply dynamic opacity during normal operation
					if (
						hasInitialAnimationPlayed &&
						!isReverseAnimating &&
						!disableDynamicOpacity
					) {
						const targetOpacity = calculateElementOpacity(index, currentAngle);
						const currentOpacity =
							parseFloat(element.element.style.opacity) || 0;
						const newOpacity = lerp(currentOpacity, targetOpacity, 0.1);
						element.element.style.opacity = newOpacity.toString();
					}
				}
			});

			// Render both WebGL and CSS3D
			renderer.render(scene, camera);
			css3dRenderer.render(scene, camera);

			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			window.removeEventListener('wheel', (event: WheelEvent) =>
				handleScroll(event.deltaY)
			);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('click', handleClick);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchmove', handleTouchMove);
			window.removeEventListener('touchend', handleTouchEnd);
			css3dRenderer.domElement.remove();
			controls.dispose();
		};
	});
</script>

<div class="webgl-container relative">
	<canvas class="webgl" style="touch-action: none;"></canvas>
	<div class="absolute left-6 md:left-20 top-[40%]">
		<h1
			id="hero-heading"
			class="text-5xl md:text-9xl font-cinzel font-semibold text-zinc-100"
		>
			Cosimo
		</h1>
		<h3
			id="hero-subheading"
			class="text-xl md:text-3xl font-cinzel font-semibold text-zinc-100"
		>
			Our values
		</h3>
	</div>
	<div
		id="1"
		class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
	>
		<h2 class="text-black text-6xl font-bold opacity-0">Community</h2>
	</div>
	<div
		id="2"
		class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
	>
		<h2 class="text-black text-6xl font-bold opacity-0">Inovation</h2>
	</div>
	<div
		id="3"
		class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
	>
		<h2 class="text-black text-6xl font-bold opacity-0">Passion</h2>
	</div>
	<div
		id="4"
		class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
	>
		<h2 class="text-black text-6xl font-bold opacity-0">Excellence</h2>
	</div>
	<div
		id="5"
		class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
	>
		<h2 class="text-black text-6xl font-bold opacity-0">Vision</h2>
	</div>
	<div
		id="6"
		class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
	>
		<h2 class="text-black text-6xl font-bold opacity-0">Legacy</h2>
	</div>
	<div
		id="7"
		class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
	>
		<h2 class="text-black text-6xl font-bold opacity-0">Integrity</h2>
	</div>
</div>

<style>
	.webgl-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	:global(.css3d-content) {
		width: 300px;
		height: 100px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		transform: translate(-50%, -50%);
		pointer-events: none;
		/* Improved text rendering */
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-rendering: optimizeLegibility;
		backface-visibility: hidden;
		transform-style: preserve-3d;
		transform-origin: center center;
		/* Force GPU acceleration */
		will-change: transform;
		filter: blur(0);
	}

	:global(.css3d-content h2) {
		margin: 0;
		padding: 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		will-change: transform;
		transform: translateZ(0);
		/* Add subpixel positioning */
		perspective: 1000px;
		/* Prevent text from becoming pixelated during transforms */
		filter: blur(0);
	}

	:global(.css3d-content p) {
		margin: 0;
		padding: 0;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
		will-change: transform;
		transform: translateZ(0);
		/* Add subpixel positioning */
		perspective: 1000px;
		/* Prevent text from becoming pixelated during transforms */
		filter: blur(0);
	}
</style>

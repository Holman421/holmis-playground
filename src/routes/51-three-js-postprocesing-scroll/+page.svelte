<script lang="ts">
	import { CONSTANTS } from './constants';
	import { CustomShaderMaterial, ChromaticAberrationShader } from './shaders';
	import * as THREE from 'three';
	import GUI from 'lil-gui';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
	import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
	import { gsap } from 'gsap';
	import { calculateScaleOffset, findNeighboringPlanes } from './utils';

	const imgArray1 = CONSTANTS.IMAGES.earth;
	const imgArray2 = CONSTANTS.IMAGES.universe;
	const imgArray3 = CONSTANTS.IMAGES.galaxy;
	const imgArray4 = CONSTANTS.IMAGES.blackHole;

	const groupNamesUI = CONSTANTS.UI.groupNames;
	const groupNames = CONSTANTS.UI.internalGroupNames;

	let currentGroupText = $state(groupNamesUI[0]);
	let nextGroupText = $state(groupNamesUI[1]);

	let currentScroll = 0;
	let velocity = 0;
	let scrollPosition = 0;
	let currentEffect = 0;
	let isAutoCentering = false;
	let autoCenterTimeout: NodeJS.Timeout;
	let isZoomed = false;
	let zoomedPlane: THREE.Mesh | null = null;
	let effectActive = false;
	let currentFrustumSize = CONSTANTS.CAMERA.INITIAL_FRUSTUM_SIZE;
	let isTransitioning = false;
	let touchStartTime = 0;
	let touchStartY = 0;
	let lastTouchY = 0; // Add this line
	let isTouchScrolling = false;
	let textVisibilityTimeout: NodeJS.Timeout;
	let isTextHidden = false;
	let isGroupTransitionLocked = false; // Add this new state variable
	let lockedCenterGroup: string | null = null; // Add this new variable
	let isGroupSwitchingEnabled = true;
	let groupSwitchDebounceTimeout: NodeJS.Timeout;

	$effect(() => {
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true,
			powerPreference: 'high-performance',
			stencil: false,
			depth: false
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Then define texture loading with access to maxAnisotropy
		const textureCache = new Map<string, THREE.Texture>();
		const textureLoader = new THREE.TextureLoader();

		const processTexture = (texture: THREE.Texture) => {
			if (!texture.image) return;

			const imageWidth = texture.image.width;
			const imageHeight = texture.image.height;
			const aspectRatio = imageWidth / imageHeight;

			// Always center the texture
			texture.center.set(0.5, 0.5);
			texture.matrixAutoUpdate = false;
			texture.wrapS = THREE.ClampToEdgeWrapping;
			texture.wrapT = THREE.ClampToEdgeWrapping;

			if (aspectRatio > 1) {
				// Image is wider than tall - scale height to 1 and crop width
				const scale = 1 / aspectRatio;
				texture.repeat.set(scale, 1);
				texture.offset.set((1 - scale) / 2, 0);
			} else {
				// Image is taller than wide - scale width to 1 and crop height
				const scale = aspectRatio;
				texture.repeat.set(1, scale);
				texture.offset.set(0, (1 - scale) / 2);
			}

			texture.needsUpdate = true;
		};

		// Add mobile detection at the top
		const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			navigator.userAgent
		);

		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {
			offset: 0.0
		};

		const handleWheel = (e: WheelEvent) => {
			if (isZoomed || isTransitioning) {
				e.preventDefault();
				return;
			}

			e.preventDefault();
			isAutoCentering = false; // Stop auto-centering when user scrolls
			clearTimeout(autoCenterTimeout);

			velocity += e.deltaY * 0.0001 * CONSTANTS.SCROLL.SPEED; // Reduced multiplier
			velocity = Math.max(
				-CONSTANTS.SCROLL.MAX_VELOCITY,
				Math.min(CONSTANTS.SCROLL.MAX_VELOCITY, velocity)
			);

			// Set up auto-center timeout
			autoCenterTimeout = setTimeout(() => {
				if (Math.abs(velocity) < CONSTANTS.AUTO_CENTER.THRESHOLD) {
					// Only auto-center if almost stopped
					isAutoCentering = true;
				}
			}, CONSTANTS.AUTO_CENTER.DELAY);
		};

		const handleTouchStart = (e: TouchEvent) => {
			if (isTransitioning) return;

			e.preventDefault();
			touchStartTime = Date.now();
			touchStartY = e.touches[0].clientY;
			lastTouchY = e.touches[0].clientY;
			isTouchScrolling = false;
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (isZoomed || isTransitioning) {
				e.preventDefault();
				return;
			}

			e.preventDefault();
			const touchY = e.touches[0].clientY;
			const deltaY = lastTouchY - touchY;

			// Check if user is scrolling
			if (Math.abs(touchY - touchStartY) > CONSTANTS.TOUCH.SCROLL_THRESHOLD) {
				isTouchScrolling = true;
			}

			velocity = Math.max(
				-CONSTANTS.SCROLL.MAX_VELOCITY,
				Math.min(CONSTANTS.SCROLL.MAX_VELOCITY, velocity + deltaY * 0.0003 * CONSTANTS.SCROLL.SPEED)
			);
			lastTouchY = touchY;

			isAutoCentering = false;
			clearTimeout(autoCenterTimeout);

			// Set up auto-center timeout
			autoCenterTimeout = setTimeout(() => {
				if (Math.abs(velocity) < CONSTANTS.AUTO_CENTER.THRESHOLD) {
					isAutoCentering = true;
				}
			}, CONSTANTS.AUTO_CENTER.DELAY);
		};

		// Add touch end handler
		const handleTouchEnd = (e: TouchEvent) => {
			const touchEndTime = Date.now();
			const touchDuration = touchEndTime - touchStartTime;

			if (
				!isTouchScrolling &&
				touchDuration < CONSTANTS.TOUCH.TIME_THRESHOLD &&
				!isTransitioning &&
				!isZoomed
			) {
				const touch = e.changedTouches[0];
				const touchX = (touch.clientX / sizes.width) * 2 - 1;
				const touchY = -(touch.clientY / sizes.height) * 2 + 1;

				mouse.x = touchX;
				mouse.y = touchY;

				raycaster.setFromCamera(mouse, camera);
				const intersects = raycaster.intersectObjects(allPlanes);

				if (intersects.length > 0) {
					const clickedPlane = intersects[0].object as THREE.Mesh;
					zoomToPlane(clickedPlane);
				}
			} else if (isZoomed) {
				resetCamera();
			}
		};

		// Add event listeners
		window.addEventListener('wheel', handleWheel, { passive: false });
		window.addEventListener('touchstart', handleTouchStart, { passive: false });
		window.addEventListener('touchmove', handleTouchMove, { passive: false });
		window.addEventListener('touchend', handleTouchEnd, { passive: false });

		// Scene
		const scene = new THREE.Scene();

		// Grid configuration - updated

		// Add mouse tracking
		const mouse = new THREE.Vector2();
		const raycaster = new THREE.Raycaster();

		const handleMouseMove = (event: MouseEvent) => {
			mouse.x = (event.clientX / sizes.width) * 2 - 1;
			mouse.y = -(event.clientY / sizes.height) * 2 + 1;
		};

		window.addEventListener('mousemove', handleMouseMove);

		// Track currently hovered plane and its original scale
		let hoveredPlane: THREE.Mesh | null = null;
		const originalScales = new Map<THREE.Mesh, THREE.Vector3>();
		const originalPositions = new Map<THREE.Mesh, THREE.Vector3>();

		// Modify the constants for neighbor detection
		const NEIGHBOR_SCALE = CONSTANTS.SCALE.NEIGHBOR;

		// Simplify the neighbor finding function to focus only on physical proximity

		// Add position tracking for transform origin simulation
		const planeMetadata = new Map<
			THREE.Mesh,
			{
				row: number;
				col: number;
				setIndex: number;
				id: string;
				groupName: string; // Add this field
			}
		>();
		let planeIdCounter = 0;

		const createAdjustedPlaneGeometry = (texture: THREE.Texture): THREE.PlaneGeometry | null => {
			if (!texture.image) return null;

			const geometry = new THREE.PlaneGeometry(1, 1);
			const imageAspect = texture.image.width / texture.image.height;
			const uvs = geometry.attributes.uv;

			if (imageAspect > 1) {
				// Image is wider than tall - crop sides
				const scale = 1 / imageAspect;
				const offset = (1 - scale) / 2;
				for (let i = 0; i < uvs.count; i++) {
					const x = uvs.getX(i);
					// Center the UV coordinates
					uvs.setX(i, offset + x * scale);
				}
			} else if (imageAspect < 1) {
				// Image is taller than wide - crop top/bottom
				const scale = imageAspect;
				const offset = (1 - scale) / 2;
				for (let i = 0; i < uvs.count; i++) {
					const y = uvs.getY(i);
					// Center the UV coordinates
					uvs.setY(i, offset + y * scale);
				}
			}

			uvs.needsUpdate = true;
			return geometry;
		};

		// Function to create a grid of images - updated initial position
		const createImageGrid = (offsetX = 0, setIndex = 0) => {
			const planes: THREE.Mesh[] = [];
			// Select the appropriate image array based on setIndex
			const imgArrayToUse = (() => {
				switch ((setIndex % 4) + 1) {
					case 1:
						return imgArray1;
					case 2:
						return imgArray2;
					case 3:
						return imgArray3;
					case 4:
						return imgArray4;
					default:
						return imgArray1;
				}
			})();
			const itemsPerSet = imgArrayToUse.length;
			const gridWidth = CONSTANTS.GRID.COLUMNS * CONSTANTS.GRID.HORIZONTAL_SPACING;
			const groupName = `Group ${(setIndex % groupNames.length) + 1}`;

			for (let i = 0; i < itemsPerSet; i++) {
				const row = Math.floor(i / CONSTANTS.GRID.COLUMNS);
				const col = i % CONSTANTS.GRID.COLUMNS;

				const x =
					col * CONSTANTS.GRID.HORIZONTAL_SPACING -
					(CONSTANTS.GRID.COLUMNS * CONSTANTS.GRID.HORIZONTAL_SPACING -
						CONSTANTS.GRID.HORIZONTAL_SPACING) /
						2 +
					offsetX -
					gridWidth * (CONSTANTS.GRID.TOTAL_SETS / 2 - 1);
				const y =
					row * CONSTANTS.GRID.VERTICAL_SPACING -
					(CONSTANTS.GRID.ROWS * CONSTANTS.GRID.VERTICAL_SPACING -
						CONSTANTS.GRID.VERTICAL_SPACING) /
						2;

				const texture =
					textureCache.get(imgArrayToUse[i]) ||
					textureLoader.load(imgArrayToUse[i], (loadedTexture) => {
						processTexture(loadedTexture);
					});

				let geometry = new THREE.PlaneGeometry(1, 1);
				const material = new THREE.ShaderMaterial({
					...CustomShaderMaterial,
					uniforms: {
						map: { value: texture },
						opacity: { value: CONSTANTS.OPACITY.INACTIVE },
						grayscale: { value: 1.0 } // Start grayscale
					},
					transparent: true
				});

				// Handle UV adjustments when texture loads
				if (!texture.image) {
					textureLoader.load(imgArrayToUse[i], (loadedTexture) => {
						const newGeometry = createAdjustedPlaneGeometry(loadedTexture);
						if (newGeometry) {
							plane.geometry.dispose();
							plane.geometry = newGeometry;
						}
					});
				} else {
					const adjustedGeometry = createAdjustedPlaneGeometry(texture);
					if (adjustedGeometry) {
						geometry = adjustedGeometry;
					}
				}

				const plane = new THREE.Mesh(geometry, material);
				plane.position.set(x, y, 0);
				plane.material.transparent = true; // Enable transparency
				plane.material.opacity = CONSTANTS.OPACITY.INACTIVE; // Start with inactive opacity
				originalScales.set(plane, new THREE.Vector3(1, 1, 1));
				originalPositions.set(plane, new THREE.Vector3(x, y, 0));

				const planeId = `plane_${i}_${setIndex}_${planeIdCounter++}`;
				const metadata = {
					row,
					col,
					setIndex,
					id: planeId,
					groupName
				};

				// Store metadata in both places for different purposes
				planeMetadata.set(plane, metadata);
				plane.userData.metadata = metadata; // Add this line

				scene.add(plane);
				planes.push(plane);
			}
			return planes;
		};

		// Create multiple sets of images for seamless looping
		let allPlanes: THREE.Mesh[] = [];
		const gridWidth = CONSTANTS.GRID.COLUMNS * CONSTANTS.GRID.HORIZONTAL_SPACING;

		// Lights
		const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
		directionalLight.position.set(6.25, 3, 4);
		scene.add(directionalLight);

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
		const frustumSize = CONSTANTS.CAMERA.INITIAL_FRUSTUM_SIZE;
		const aspect = sizes.width / sizes.height;
		const camera = new THREE.OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			0.1,
			100
		);
		camera.position.set(0, CONSTANTS.CAMERA.INITIAL_Y, 4);
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

			// Update zoom if currently zoomed in
			if (isZoomed && zoomedPlane) {
				const zoomedSize = calculateZoomFrustumSize();
				(currentFrustumSize as number) = zoomedSize;
				updateCameraFrustum(currentFrustumSize);
			}
		});

		// Enable shadow map auto update only when needed
		renderer.shadowMap.autoUpdate = false;
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Add this after renderer creation and before creating planes

		// Post Processing
		const composer = new EffectComposer(renderer);
		const renderPass = new RenderPass(scene, camera);
		composer.addPass(renderPass);

		const chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
		composer.addPass(chromaticAberrationPass);

		// Create new render targets
		const updateRenderTargets = () => {
			const oldTarget1 = composer.renderTarget1;
			const oldTarget2 = composer.renderTarget2;

			const newTarget = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				type: THREE.HalfFloatType
			});

			composer.renderTarget1 = newTarget;
			composer.renderTarget2 = newTarget.clone();

			// Clean up old targets
			if (oldTarget1) oldTarget1.dispose();
			if (oldTarget2) oldTarget2.dispose();
		};

		// Initial setup
		updateRenderTargets();
		composer.setSize(sizes.width, sizes.height);
		composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Update resize handler to include render target updates
		window.addEventListener('resize', () => {
			// ...existing resize code...

			updateRenderTargets();
			composer.setSize(sizes.width, sizes.height);
			composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		});

		// Update GUI - keep only the essential control
		const offsetController = gui
			.add(chromaticAberrationPass.uniforms.uOffset, 'value')
			.min(0)
			.max(1)
			.step(0.001)
			.name('uOffset')
			.listen();

		// gui.hide();

		// Add constants for vertical overlap handling
		const VERTICAL_OVERLAP_OFFSET = CONSTANTS.OVERLAP.VERTICAL_OFFSET; // How far to move vertical neighbors

		// Improved findVerticalNeighbors function
		const findVerticalNeighbors = (plane: THREE.Mesh) => {
			const metadata = planeMetadata.get(plane);
			if (!metadata) return { above: null, below: null };

			const isTopRow = metadata.row === 0;
			const isBottomRow = metadata.row === CONSTANTS.GRID.ROWS - 1;

			// Early return if not on top or bottom row
			if (!isTopRow && !isBottomRow) return { above: null, below: null };

			const findNeighborInColumn = (targetRow: number) => {
				// Get all planes in the target row that match the column position
				const possibleNeighbors = allPlanes.filter((p) => {
					const neighborMeta = planeMetadata.get(p);
					if (!neighborMeta || neighborMeta.row !== targetRow) return false;

					// Calculate wrapped distance for x position
					const dx = Math.abs(plane.position.x - p.position.x);
					const gridTotalWidth = gridWidth * (CONSTANTS.GRID.TOTAL_SETS - 3);
					const wrappedDx = Math.min(dx, Math.abs(dx - gridTotalWidth));

					// Use a very small threshold for more precise matching
					return wrappedDx < 0.05;
				});

				// Return the closest neighbor if multiple are found
				return (
					possibleNeighbors.sort((a, b) => {
						const dxA = Math.abs(plane.position.x - a.position.x);
						const dxB = Math.abs(plane.position.x - b.position.x);
						return dxA - dxB;
					})[0] || null
				);
			};

			// For top row, always look for below neighbor
			if (isTopRow) {
				const below = findNeighborInColumn(metadata.row + 1);
				return { above: null, below };
			}

			// For bottom row, always look for above neighbor
			if (isBottomRow) {
				const above = findNeighborInColumn(metadata.row - 1);
				return { above, below: null };
			}

			return { above: null, below: null };
		};

		// Add tracking for active vertical neighbors
		const activeVerticalNeighbors = new Set<THREE.Mesh>();

		// Add tracking for vertical neighbor states
		const verticalNeighborStates = new Map<
			THREE.Mesh,
			{
				isMoving: boolean;
				targetY: number;
				originalY: number;
			}
		>();

		// Add a new Map to track active vertical neighbor relationships
		const activeVerticalRelationships = new Map<THREE.Mesh, THREE.Mesh[]>();

		// Keep only this version of moveVerticalNeighbor
		const moveVerticalNeighbor = (
			neighbor: THREE.Mesh,
			direction: 'up' | 'down',
			mainPlane: THREE.Mesh
		) => {
			const originalPos = originalPositions.get(neighbor);
			if (!originalPos) return;

			// Kill any existing animations
			gsap.killTweensOf(neighbor.position);
			gsap.killTweensOf(neighbor.scale);

			const targetY =
				originalPos.y + (direction === 'up' ? -VERTICAL_OVERLAP_OFFSET : VERTICAL_OVERLAP_OFFSET);

			// Track the relationship
			if (!activeVerticalRelationships.has(mainPlane)) {
				activeVerticalRelationships.set(mainPlane, []);
			}
			const currentNeighbors = activeVerticalRelationships.get(mainPlane) || [];
			if (!currentNeighbors.includes(neighbor)) {
				currentNeighbors.push(neighbor);
				activeVerticalRelationships.set(mainPlane, currentNeighbors);
			}

			// Ensure neighbor is at the correct scale
			gsap.to(neighbor.scale, {
				x: NEIGHBOR_SCALE,
				y: NEIGHBOR_SCALE,
				duration: CONSTANTS.DURATION.HOVER,
				ease: 'power2.out'
			});

			// Move to target position
			gsap.to(neighbor.position, {
				y: targetY,
				duration: CONSTANTS.DURATION.HOVER,
				ease: 'power2.out',
				onComplete: () => {
					if (verticalNeighborStates.has(neighbor)) {
						verticalNeighborStates.get(neighbor)!.isMoving = false;
					}
				}
			});

			activeVerticalNeighbors.add(neighbor);
		};

		// Update resetVerticalNeighbors to handle all cases
		const resetVerticalNeighbors = (mainPlane: THREE.Mesh) => {
			// Reset all neighbors associated with this plane
			const neighbors = activeVerticalRelationships.get(mainPlane) || [];
			neighbors.forEach((neighbor) => {
				const originalPos = originalPositions.get(neighbor);
				if (originalPos) {
					gsap.killTweensOf(neighbor.position);
					gsap.to(neighbor.position, {
						y: originalPos.y,
						duration: CONSTANTS.DURATION.HOVER * 0.5,
						ease: 'power2.out',
						onComplete: () => {
							activeVerticalNeighbors.delete(neighbor);
							verticalNeighborStates.delete(neighbor);
						}
					});
				}
			});
			activeVerticalRelationships.delete(mainPlane);
		};

		// Add click handler
		const handleClick = (event: MouseEvent) => {
			if (effectActive) return;

			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(allPlanes);

			if (isZoomed) {
				// Always reset when clicking anywhere while zoomed
				resetCamera();
				return; // Exit early to prevent new zoom
			}

			if (intersects.length > 0) {
				const clickedPlane = intersects[0].object as THREE.Mesh;
				// Don't reset hover states, just keep the current scale
				zoomToPlane(clickedPlane);
			}
		};

		// Add event listener for click (place it right after the handleClick function)
		window.addEventListener('click', handleClick);

		// Add camera animation functions
		const updateCameraFrustum = (size: number) => {
			const aspect = sizes.width / sizes.height;
			camera.left = (size * aspect) / -2;
			camera.right = (size * aspect) / 2;
			camera.top = size / 2;
			camera.bottom = size / -2;
			camera.updateProjectionMatrix();
		};

		// Add helper function to calculate zoom frustum size based on aspect ratio
		const calculateZoomFrustumSize = () => {
			const aspect = sizes.width / sizes.height;
			const targetAspect = 1; // Assuming our planes are square, adjust if they're not
			const padding = 0.2; // Add padding factor to ensure full visibility

			if (aspect < 1) {
				// Portrait mode - fit to width with padding
				return (
					(CONSTANTS.CAMERA.ZOOMED_FRUSTUM_SIZE + padding) * (1 / Math.min(aspect, targetAspect))
				);
			}
			// Landscape mode - fit to height with padding
			return CONSTANTS.CAMERA.ZOOMED_FRUSTUM_SIZE + padding;
		};

		const setGroupSwitchingEnabled = (enabled: boolean) => {
			isGroupSwitchingEnabled = enabled;
			if (!enabled) {
				clearTimeout(groupSwitchDebounceTimeout);
				groupSwitchDebounceTimeout = setTimeout(
					() => {
						isGroupSwitchingEnabled = true;
					},
					CONSTANTS.DURATION.ZOOM * 1000 + 100
				); // Duration in ms + buffer
			}
		};

		const zoomToPlane = (plane: THREE.Mesh) => {
			if (isTransitioning) return; // Prevent multiple zoom attempts

			setGroupSwitchingEnabled(false); // Disable group switching
			// Store and lock the current group immediately
			lockedCenterGroup = currentCenterGroup;
			isGroupTransitionLocked = true;
			isTransitioning = true; // Start transition
			isZoomed = true;
			zoomedPlane = plane;
			velocity = 0; // Reset velocity when zooming

			const targetPosition = plane.position.clone();

			// Make the clicked plane colorful regardless of its group
			if (plane.material instanceof THREE.ShaderMaterial) {
				gsap.to(plane.material.uniforms.opacity, {
					value: CONSTANTS.OPACITY.ACTIVE,
					duration: CONSTANTS.DURATION.ZOOM,
					ease: 'power2.inOut'
				});
				gsap.to(plane.material.uniforms.grayscale, {
					value: 0.0,
					duration: CONSTANTS.DURATION.ZOOM,
					ease: 'power2.inOut'
				});
			}

			// Always ensure the plane is at CONSTANTS.SCALE.ZOOM
			gsap.to(plane.scale, {
				x: CONSTANTS.SCALE.ZOOM,
				y: CONSTANTS.SCALE.ZOOM,
				duration: CONSTANTS.DURATION.ZOOM,
				ease: 'power2.inOut'
			});

			// Apply position offset for the main plane
			const offset = calculateScaleOffset(plane, CONSTANTS.SCALE.ZOOM, planeMetadata);
			const originalPos = originalPositions.get(plane);
			if (originalPos) {
				gsap.to(plane.position, {
					y: originalPos.y + offset.y,
					duration: CONSTANTS.DURATION.ZOOM,
					ease: 'power2.inOut'
				});
			}

			// Camera animations
			gsap.to(camera.position, {
				x: targetPosition.x,
				y: targetPosition.y,
				z: 4,
				duration: CONSTANTS.DURATION.ZOOM,
				ease: 'power2.inOut',
				onComplete: () => {
					isTransitioning = false; // End transition
					// Don't unlock group transitions here - keep locked while zoomed
				}
			});

			// Calculate appropriate frustum size based on aspect ratio
			const zoomedSize = calculateZoomFrustumSize();

			gsap.to(
				{ value: currentFrustumSize },
				{
					value: zoomedSize,
					duration: CONSTANTS.DURATION.ZOOM,
					ease: 'power2.inOut',
					onUpdate: function () {
						currentFrustumSize = this.targets()[0].value;
						updateCameraFrustum(currentFrustumSize);
					}
				}
			);

			// Keep neighbors scaled down
			const neighbors = findNeighboringPlanes(plane, allPlanes, CONSTANTS.GRID, planeMetadata);
			neighbors.forEach((neighbor) => {
				gsap.to(neighbor.scale, {
					x: NEIGHBOR_SCALE,
					y: NEIGHBOR_SCALE,
					duration: CONSTANTS.DURATION.ZOOM,
					ease: 'power2.inOut'
				});
			});

			// Handle vertical neighbors
			const verticalNeighbors = findVerticalNeighbors(plane);
			if (verticalNeighbors.above) {
				moveVerticalNeighbor(verticalNeighbors.above, 'up', plane);
			}
			if (verticalNeighbors.below) {
				moveVerticalNeighbor(verticalNeighbors.below, 'down', plane);
			}
		};

		const resetCamera = () => {
			if (!isZoomed || isTransitioning) return;

			setGroupSwitchingEnabled(false); // Disable group switching
			isTransitioning = true;
			isGroupTransitionLocked = true; // Keep lock during reset
			isZoomed = false;
			velocity = 0;

			// Store the previously zoomed plane before nulling it
			const previousZoomedPlane = zoomedPlane;
			zoomedPlane = null;

			// Create a master timeline for all animations
			const masterTimeline = gsap.timeline({
				onComplete: () => {
					// Only unlock after ALL animations are complete
					setTimeout(() => {
						isTransitioning = false;
						isGroupTransitionLocked = false;
						lockedCenterGroup = null;
					}, 100); // Small buffer after animations complete
				}
			});

			// Camera movement timeline
			masterTimeline.to(camera.position, {
				x: 0,
				y: CONSTANTS.CAMERA.INITIAL_Y,
				z: 4,
				duration: CONSTANTS.DURATION.ZOOM,
				ease: 'power2.inOut'
			});

			// Frustum animation
			masterTimeline.to(
				{ value: currentFrustumSize },
				{
					value: CONSTANTS.CAMERA.INITIAL_FRUSTUM_SIZE,
					duration: CONSTANTS.DURATION.ZOOM,
					ease: 'power2.inOut',
					onUpdate: function () {
						currentFrustumSize = this.targets()[0].value;
						updateCameraFrustum(currentFrustumSize);
					}
				},
				'<' // Start at same time as camera movement
			);

			// After camera movement completes, handle the planes
			if (previousZoomedPlane) {
				// Reset vertical neighbors
				resetVerticalNeighbors(previousZoomedPlane);

				// Reset main plane
				const originalPos = originalPositions.get(previousZoomedPlane);
				if (originalPos) {
					masterTimeline.to(
						previousZoomedPlane.scale,
						{
							x: 1,
							y: 1,
							duration: CONSTANTS.DURATION.ZOOM,
							ease: 'power2.out'
						},
						'>-=0.3'
					);
					masterTimeline.to(
						previousZoomedPlane.position,
						{
							y: originalPos.y,
							duration: CONSTANTS.DURATION.ZOOM,
							ease: 'power2.out'
						},
						'<'
					);
				}

				// Reset all other planes
				allPlanes.forEach((plane) => {
					if (plane !== previousZoomedPlane) {
						const planeOriginalPos = originalPositions.get(plane);
						if (planeOriginalPos) {
							masterTimeline.to(
								plane.scale,
								{
									x: 1,
									y: 1,
									duration: CONSTANTS.DURATION.ZOOM,
									ease: 'power2.out'
								},
								'<'
							);
							masterTimeline.to(
								plane.position,
								{
									y: planeOriginalPos.y,
									duration: CONSTANTS.DURATION.ZOOM,
									ease: 'power2.out'
								},
								'<'
							);
						}
					}
				});
			}
		};

		// Add helper function to manage cursor
		const updateCursor = (intersects: THREE.Intersection[]) => {
			if (effectActive || isTransitioning) {
				canvas.style.cursor = 'default';
				return;
			}

			if (intersects.length > 0) {
				canvas.style.cursor = 'pointer';
			} else {
				canvas.style.cursor = 'default';
			}
		};

		// Add object pooling for better performance
		const objectPool = new Set<THREE.Mesh>();

		// Add frustum buffer calculation
		const calculateVisibilityBounds = () => {
			const aspect = sizes.width / sizes.height;
			const horizontalBound = (frustumSize * aspect) / 2;
			const verticalBound = frustumSize / 2;
			// Add extra buffer space to prevent visible popping
			const horizontalBuffer = gridWidth * 2;
			return {
				left: -horizontalBound - horizontalBuffer,
				right: horizontalBound + horizontalBuffer,
				top: verticalBound + CONSTANTS.GRID.VERTICAL_SPACING,
				bottom: -verticalBound - CONSTANTS.GRID.VERTICAL_SPACING
			};
		};

		// Add after other state variables
		let currentCenterGroup: string | null = null;

		let animationFrameId: number;

		// Update the updateTextVisibility function
		const updateTextVisibility = (offset: number) => {
			const container = document.getElementById(CONSTANTS.TEXT.CONTAINER_ID);
			if (!container) return;

			if (offset > CONSTANTS.TEXT.HIDE_THRESHOLD) {
				clearTimeout(textVisibilityTimeout);
			}

			console.log('This function is running');

			if (offset > CONSTANTS.TEXT.HIDE_THRESHOLD && !isTextHidden) {
				console.log('Setting text opacity to 0');
				gsap.to(container, {
					opacity: 0,
					duration: CONSTANTS.DURATION.OPACITY_TRANSITION,
					ease: 'power2.inOut'
				});
				isTextHidden = true;
			} else if (isTextHidden && offset < CONSTANTS.TEXT.HIDE_THRESHOLD) {
				console.log('Text is being set back to visible 1');
				// Show text with delay when effect is minimal
				textVisibilityTimeout = setTimeout(() => {
					gsap.to(container, {
						opacity: 1,
						duration: CONSTANTS.DURATION.OPACITY_TRANSITION,
						ease: 'power2.inOut'
					});
					isTextHidden = false;
				}, 250);
			}
		};

		// New: Extract text animation into a dedicated function
		const animateGroupText = (currentIndex: number, prevIndex: number) => {
			const nextIndex = currentIndex === 3 ? 0 : currentIndex + 1;
			const timeline = gsap.timeline();
			const currentTitleElement = document.getElementById('text1');
			const nextTitleElement = document.getElementById('text2');

			const isScrollForward = (() => {
				if (currentIndex === 0 && prevIndex === 3) return true;
				if (currentIndex === 3 && prevIndex === 0) return false;
				return currentIndex > prevIndex;
			})();

			return new Promise<void>((resolve) => {
				timeline
					.set(
						nextTitleElement,
						{
							opacity: 0,
							x: isScrollForward ? '150%' : '-150%'
						},
						'<'
					)
					.to(
						currentTitleElement,
						{
							opacity: 0,
							x: isScrollForward ? '-150%' : '150%'
						},
						'<'
					)
					.to(
						nextTitleElement,
						{
							opacity: 1,
							x: '0%',
							onComplete: () => {
								gsap.set(currentTitleElement, {
									opacity: 1,
									x: '0%'
								});
								gsap.set(nextTitleElement, {
									opacity: 0,
									x: isScrollForward ? '150%' : '-150%'
								});
								(currentGroupText as any) = groupNamesUI[currentIndex];
								(nextGroupText as any) = groupNamesUI[nextIndex];
								resolve();
							}
						},
						'<'
					);
			});
		};

		// Add this helper function near the other utility functions
		const isCameraAtDefaultPosition = () => {
			return (
				Math.abs(camera.position.x) === 0 &&
				Math.abs(camera.position.y - CONSTANTS.CAMERA.INITIAL_Y) === 0 &&
				Math.abs(camera.position.z - 4) === 0
			);
		};

		const tick = () => {
			// Apply deceleration
			velocity *= CONSTANTS.SCROLL.DECELERATION;

			// Clear tiny velocities to ensure complete stop
			if (Math.abs(velocity) < 0.0001) {
				velocity = 0;
			}

			// Update scroll position
			scrollPosition += velocity;

			// Update text visibility based on chromatic aberration effect
			updateTextVisibility(chromaticAberrationPass.uniforms.uOffset.value);

			// Smooth movement
			currentScroll += (velocity - currentScroll) * CONSTANTS.SCROLL.LERP_FACTOR;

			// Add this before updating plane positions
			// Calculate center line position in world coordinates
			const centerLineX = camera.position.x;
			let newCenterGroup: string | null = null;
			let closestDistance = Infinity;

			// Check all planes against center line
			allPlanes.forEach((plane) => {
				const metadata = planeMetadata.get(plane);
				if (!metadata) return;

				// Only check one plane per group (first plane in each row)
				if (metadata.col !== 0 || metadata.row !== 0) return;

				const distance = Math.abs(plane.position.x - centerLineX);
				if (distance < closestDistance) {
					closestDistance = distance;
					// Only update newCenterGroup if we're close enough to trigger a switch
					const normalizedDistance = distance / (gridWidth / 2); // Convert to 0-1 range
					if (normalizedDistance < CONSTANTS.TEXT.GROUP_SWITCH_THRESHOLD) {
						newCenterGroup = metadata.groupName;
					}
				}
			});

			// Only update if we found a new center group within threshold
			if (newCenterGroup !== null && newCenterGroup !== currentCenterGroup) {
				const oldCenterGroup = currentCenterGroup;
				currentCenterGroup = newCenterGroup;

				// Rest of the group switching code remains the same...
				// Update the UI text based on the group index
				if (currentCenterGroup) {
					const currentIndex = parseInt((currentCenterGroup as string).split(' ')[1]) - 1;
					const prevIndex = parseInt((oldCenterGroup as string)?.split(' ')[1]) - 1 || 0;

					// Use the new animation function
					animateGroupText(currentIndex, prevIndex);
				}

				// Handle opacity transitions with GSAP
				allPlanes.forEach((plane) => {
					if (plane.material instanceof THREE.ShaderMaterial) {
						const metadata = planeMetadata.get(plane);
						if (!metadata) return;

						gsap.killTweensOf(plane.material.uniforms.opacity, 'value');
						gsap.killTweensOf(plane.material.uniforms.grayscale, 'value');

						const activeGroup = lockedCenterGroup || currentCenterGroup;
						const isInActiveGroup = metadata.groupName === activeGroup;

						// Animate both opacity and grayscale
						gsap.to(plane.material.uniforms.opacity, {
							value: isInActiveGroup ? CONSTANTS.OPACITY.ACTIVE : CONSTANTS.OPACITY.INACTIVE,
							duration: CONSTANTS.DURATION.OPACITY_TRANSITION,
							ease: 'power2.inOut'
						});

						gsap.to(plane.material.uniforms.grayscale, {
							value: isInActiveGroup ? 0.0 : 1.0,
							duration: CONSTANTS.DURATION.OPACITY_TRANSITION,
							ease: 'power2.inOut'
						});

						if (metadata.groupName === oldCenterGroup) {
							plane.material.uniforms.opacity.value = CONSTANTS.OPACITY.ACTIVE;
							plane.material.uniforms.grayscale.value = 0.0;
						}
					}
				});
			}

			// Update planes positions with improved wrapping logic
			allPlanes.forEach((plane) => {
				plane.position.x -= currentScroll;

				const setWidth = gridWidth * CONSTANTS.GRID.TOTAL_SETS;
				const halfWidth = setWidth / 2;

				// Handle wrapping with visibility
				if (plane.position.x < -halfWidth) {
					plane.visible = false; // Hide before wrapping
					plane.position.x += setWidth;
					// Update plane's opacity based on current center group after wrapping
					if (plane.material instanceof THREE.ShaderMaterial && currentCenterGroup) {
						const metadata = planeMetadata.get(plane);
						if (metadata) {
							plane.material.uniforms.opacity.value =
								metadata.groupName === currentCenterGroup
									? CONSTANTS.OPACITY.ACTIVE
									: CONSTANTS.OPACITY.INACTIVE;
							plane.material.uniforms.grayscale.value =
								metadata.groupName === currentCenterGroup ? 0.0 : 1.0;
						}
					}
					// Small delay before showing to ensure position is updated
					setTimeout(() => {
						plane.visible = true;
					}, 0);
				} else if (plane.position.x > halfWidth) {
					plane.visible = false; // Hide before wrapping
					plane.position.x -= setWidth;
					// Update plane's opacity based on current center group after wrapping
					if (plane.material instanceof THREE.ShaderMaterial && currentCenterGroup) {
						const metadata = planeMetadata.get(plane);
						if (metadata) {
							plane.material.uniforms.opacity.value =
								metadata.groupName === currentCenterGroup
									? CONSTANTS.OPACITY.ACTIVE
									: CONSTANTS.OPACITY.INACTIVE;
							plane.material.uniforms.grayscale.value =
								metadata.groupName === currentCenterGroup ? 0.0 : 1.0;
						}
					}
					// Small delay before showing to ensure position is updated
					setTimeout(() => {
						plane.visible = true;
					}, 0);
				}

				// Reset any active states when wrapping
				if (Math.abs(plane.position.x) > halfWidth - gridWidth) {
					if (plane === hoveredPlane) {
						hoveredPlane = null;
					}
					gsap.killTweensOf(plane.scale);
					gsap.killTweensOf(plane.position);
					plane.scale.set(1, 1, 1);

					const originalPos = originalPositions.get(plane);
					if (originalPos) {
						plane.position.y = originalPos.y;
					}
				}
			});

			// Improved chromatic aberration calculation
			const velocityImpact = Math.abs(velocity) / CONSTANTS.EFFECT.INTENSITY;
			const targetEffect = Math.pow(velocityImpact, 1.5); // Non-linear scaling

			// Smooth transition of the effect
			currentEffect += (targetEffect - currentEffect) * CONSTANTS.EFFECT.LERP;

			// Apply the effect with direction
			chromaticAberrationPass.uniforms.uOffset.value = currentEffect * Math.sign(velocity);

			// Update effectActive state before using it
			effectActive = chromaticAberrationPass.uniforms.uOffset.value > 0;

			// Apply the effect with direction
			chromaticAberrationPass.uniforms.uOffset.value = currentEffect * Math.sign(velocity);

			// Update raycaster
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(allPlanes);

			// Update cursor based on intersection
			updateCursor(intersects);

			// Handle hover states - add mobile check
			const newHoveredPlane =
				isMobile || effectActive || isZoomed || isTransitioning || intersects.length === 0
					? null
					: (intersects[0].object as THREE.Mesh);

			if (!isMobile && hoveredPlane !== newHoveredPlane && !isZoomed) {
				// Reset all active vertical neighbors first
				activeVerticalNeighbors.forEach(resetVerticalNeighbors);

				// If effect becomes active, reset any current hover state
				if (effectActive && hoveredPlane) {
					const originalScale = originalScales.get(hoveredPlane);
					const originalPos = originalPositions.get(hoveredPlane);
					if (originalScale && originalPos) {
						gsap.to(hoveredPlane.scale, {
							x: originalScale.x,
							y: originalScale.y,
							duration: CONSTANTS.DURATION.HOVER * 0.5, // Faster reset during scroll
							ease: 'power2.out'
						});
						gsap.to(hoveredPlane.position, {
							y: originalPos.y,
							duration: CONSTANTS.DURATION.HOVER * 0.5,
							ease: 'power2.out'
						});

						// Reset all affected neighbors quickly
						findNeighboringPlanes(hoveredPlane, allPlanes, CONSTANTS.GRID, planeMetadata).forEach(
							(neighbor) => {
								const neighborOriginalScale = originalScales.get(neighbor);
								const neighborOriginalPos = originalPositions.get(neighbor);
								if (neighborOriginalScale && neighborOriginalPos) {
									gsap.to(neighbor.scale, {
										x: 1,
										y: 1,
										duration: CONSTANTS.DURATION.HOVER * 0.5,
										ease: 'power2.out'
									});
									gsap.to(neighbor.position, {
										y: neighborOriginalPos.y,
										duration: CONSTANTS.DURATION.HOVER * 0.5,
										ease: 'power2.out'
									});
								}
							}
						);
					}
					hoveredPlane = null;
				} else {
					// Reset previous hovered plane
					if (hoveredPlane) {
						const originalScale = originalScales.get(hoveredPlane);
						const originalPos = originalPositions.get(hoveredPlane);
						if (originalScale && originalPos) {
							gsap.to(hoveredPlane.scale, {
								x: originalScale.x,
								y: originalScale.y,
								duration: CONSTANTS.DURATION.HOVER,
								ease: 'power2.out'
							});
							gsap.to(hoveredPlane.position, {
								y: originalPos.y,
								duration: CONSTANTS.DURATION.HOVER,
								ease: 'power2.out'
							});
							// Reset neighboring planes
							findNeighboringPlanes(hoveredPlane, allPlanes, CONSTANTS.GRID, planeMetadata).forEach(
								(neighbor) => {
									const neighborOriginalScale = originalScales.get(neighbor);
									const neighborOriginalPos = originalPositions.get(neighbor);
									if (neighborOriginalScale && neighborOriginalPos) {
										gsap.to(neighbor.scale, {
											x: neighborOriginalScale.x,
											y: neighborOriginalScale.y,
											duration: CONSTANTS.DURATION.HOVER,
											ease: 'power2.out'
										});
										gsap.to(neighbor.position, {
											y: neighborOriginalPos.y,
											duration: CONSTANTS.DURATION.HOVER,
											ease: 'power2.out'
										});
									}
								}
							);
						}

						// Reset vertical neighbors
						const verticalNeighbors = findVerticalNeighbors(hoveredPlane);
						if (verticalNeighbors.above) {
							const originalPos = originalPositions.get(verticalNeighbors.above);
							if (originalPos) {
								gsap.to(verticalNeighbors.above.position, {
									y: originalPos.y,
									duration: CONSTANTS.DURATION.HOVER,
									ease: 'power2.out'
								});
							}
						}
						if (verticalNeighbors.below) {
							const originalPos = originalPositions.get(verticalNeighbors.below);
							if (originalPos) {
								gsap.to(verticalNeighbors.below.position, {
									y: originalPos.y,
									duration: CONSTANTS.DURATION.HOVER,
									ease: 'power2.out'
								});
							}
						}
					}

					// Scale up new hovered plane and scale down its neighbors
					if (newHoveredPlane) {
						const originalPos = originalPositions.get(newHoveredPlane);
						if (originalPos) {
							const offset = calculateScaleOffset(
								newHoveredPlane,
								CONSTANTS.SCALE.HOVER,
								planeMetadata
							);
							gsap.to(newHoveredPlane.scale, {
								x: CONSTANTS.SCALE.HOVER,
								y: CONSTANTS.SCALE.HOVER,
								duration: CONSTANTS.DURATION.HOVER,
								ease: 'power2.out'
							});
							gsap.to(newHoveredPlane.position, {
								y: originalPos.y + offset.y,
								duration: CONSTANTS.DURATION.HOVER,
								ease: 'power2.out'
							});

							// Scale down neighboring planes
							findNeighboringPlanes(
								newHoveredPlane,
								allPlanes,
								CONSTANTS.GRID,
								planeMetadata
							).forEach((neighbor) => {
								const neighborOriginalPos = originalPositions.get(neighbor);
								if (neighborOriginalPos) {
									const neighborOffset = calculateScaleOffset(
										neighbor,
										NEIGHBOR_SCALE,
										planeMetadata
									);
									gsap.to(neighbor.scale, {
										x: NEIGHBOR_SCALE,
										y: NEIGHBOR_SCALE,
										duration: CONSTANTS.DURATION.HOVER,
										ease: 'power2.out'
									});
									gsap.to(neighbor.position, {
										y: neighborOriginalPos.y + neighborOffset.y,
										duration: CONSTANTS.DURATION.HOVER,
										ease: 'power2.out'
									});
								}
							});

							// Handle vertical neighbors
							const verticalNeighbors = findVerticalNeighbors(newHoveredPlane);

							if (verticalNeighbors.above) {
								moveVerticalNeighbor(verticalNeighbors.above, 'up', newHoveredPlane);
							}

							if (verticalNeighbors.below) {
								moveVerticalNeighbor(verticalNeighbors.below, 'down', newHoveredPlane);
							}
						}
					}

					hoveredPlane = newHoveredPlane;
				}
			}

			// Batch matrix updates
			scene.updateMatrixWorld();

			// Only update what's visible
			const frustum = new THREE.Frustum();
			const matrix = new THREE.Matrix4().multiplyMatrices(
				camera.projectionMatrix,
				camera.matrixWorldInverse
			);
			frustum.setFromProjectionMatrix(matrix);

			const bounds = calculateVisibilityBounds();

			allPlanes.forEach((plane) => {
				const worldPos = plane.position;
				const isVisible =
					worldPos.x >= bounds.left &&
					worldPos.x <= bounds.right &&
					worldPos.y >= bounds.bottom &&
					worldPos.y <= bounds.top;

				if (isVisible) {
					plane.visible = true;
					// Only update positions of visible and buffer planes
					if (
						Math.abs(worldPos.x) <
						bounds.right + CONSTANTS.GRID.HORIZONTAL_SPACING * CONSTANTS.GRID.BUFFER_SETS
					) {
						// Existing position update code...
					}
				} else {
					plane.visible = false;
				}
			});

			// First pass: find the center group - Add conditions to prevent group switching
			if (
				isCameraAtDefaultPosition() && // Only allow switching at default camera position
				!isZoomed &&
				!isTransitioning &&
				!isGroupTransitionLocked &&
				!lockedCenterGroup &&
				Math.abs(velocity) < 0.01
			) {
				// Add this condition
				allPlanes.forEach((plane) => {
					const metadata = planeMetadata.get(plane);
					if (!metadata) return;

					// Only check one plane per group (first plane in each row)
					if (metadata.col !== 0 || metadata.row !== 0) return;

					const distance = Math.abs(plane.position.x - centerLineX);
					if (distance < closestDistance) {
						closestDistance = distance;
						newCenterGroup = metadata.groupName;
					}
				});

				// Second pass: update opacities - Only execute if not zoomed or transitioning
				if (newCenterGroup !== currentCenterGroup) {
					const oldCenterGroup = currentCenterGroup;
					currentCenterGroup = newCenterGroup;

					// Update the UI text based on the group index
					if (currentCenterGroup) {
						const currentIndex = parseInt((currentCenterGroup as string).split(' ')[1]) - 1;
						const prevIndex = parseInt((oldCenterGroup as string)?.split(' ')[1]) - 1 || 0;

						// Use the new animation function
						animateGroupText(currentIndex, prevIndex);
					}

					// Handle opacity transitions with GSAP
					allPlanes.forEach((plane) => {
						if (plane.material instanceof THREE.ShaderMaterial) {
							const metadata = planeMetadata.get(plane);
							if (!metadata) return;

							gsap.killTweensOf(plane.material.uniforms.opacity, 'value');
							gsap.killTweensOf(plane.material.uniforms.grayscale, 'value');

							const activeGroup = lockedCenterGroup || currentCenterGroup;
							const isInActiveGroup = metadata.groupName === activeGroup;

							// Animate both opacity and grayscale
							gsap.to(plane.material.uniforms.opacity, {
								value: isInActiveGroup ? CONSTANTS.OPACITY.ACTIVE : CONSTANTS.OPACITY.INACTIVE,
								duration: CONSTANTS.DURATION.OPACITY_TRANSITION,
								ease: 'power2.inOut'
							});

							gsap.to(plane.material.uniforms.grayscale, {
								value: isInActiveGroup ? 0.0 : 1.0,
								duration: CONSTANTS.DURATION.OPACITY_TRANSITION,
								ease: 'power2.inOut'
							});

							if (oldCenterGroup) {
								plane.material.uniforms.opacity.value = CONSTANTS.OPACITY.ACTIVE;
								plane.material.uniforms.grayscale.value = 0.0;
							}
						}
					});
				}
			}

			// Replace the findClosestGroupCenter function with this updated version
			const findActiveGroupCenter = () => {
				let activeGroupPlane = null;
				allPlanes.forEach((plane) => {
					const metadata = planeMetadata.get(plane);
					if (!metadata || metadata.col !== 1 || metadata.row !== 1) return;

					if (metadata.groupName === currentCenterGroup) {
						activeGroupPlane = plane;
					}
				});

				if (activeGroupPlane) {
					return (activeGroupPlane as any).position.x;
				}

				return camera.position.x;
			};

			// Update the auto-centering portion in the tick function (find and replace this section)
			if (isAutoCentering && !isZoomed && !isTransitioning) {
				const targetX = findActiveGroupCenter();
				const currentX = camera.position.x;
				const distance = targetX - currentX;

				// Smoother speed calculation with easing
				const distanceAbs = Math.abs(distance);
				const normalizedDistance = Math.min(distanceAbs / 2, 1.0);
				const easedMultiplier = normalizedDistance * CONSTANTS.AUTO_CENTER.MAX_MULTIPLIER;

				if (distanceAbs > 0.01) {
					// Smoother velocity calculation with sign preservation
					const direction = Math.sign(distance);
					const baseSpeed = CONSTANTS.AUTO_CENTER.SPEED * (1 + easedMultiplier);
					velocity = direction * baseSpeed * Math.min(distanceAbs, 2.0);
				} else {
					isAutoCentering = false;
					velocity = 0;
				}
			}

			composer.render();
			animationFrameId = window.requestAnimationFrame(tick);
		};

		// Create the grids immediately
		for (let i = 0; i < CONSTANTS.GRID.TOTAL_SETS; i++) {
			const planes = createImageGrid(i * gridWidth, i);
			allPlanes = [...allPlanes, ...planes];
		}

		tick();

		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			window.removeEventListener('wheel', handleWheel);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchmove', handleTouchMove);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('click', handleClick);
			window.removeEventListener('touchend', handleTouchEnd);
			textureCache.forEach((texture) => texture.dispose());
			textureCache.clear();
			objectPool.forEach((obj) => {
				obj.geometry.dispose();
				(obj.material as THREE.Material).dispose();
			});
			objectPool.clear();
			renderer.dispose();
			composer.dispose();
			clearTimeout(autoCenterTimeout);
			clearTimeout(textVisibilityTimeout);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
	<div
		id={CONSTANTS.TEXT.CONTAINER_ID}
		class="absolute bottom-10 left-1/2 -translate-x-1/2 w-[300px] h-[50px]"
	>
		<h1 id="text1" class="absolute text-6xl font-audiowide text-white whitespace-nowrap">
			{currentGroupText}
		</h1>
		<h1 id="text2" class="absolute text-6xl font-audiowide text-white whitespace-nowrap">
			{nextGroupText}
		</h1>
	</div>
</div>

<style>
	canvas.webgl {
		cursor: default;
		transition: cursor 0.1s ease-out;
		position: relative;
		z-index: 0;
	}
</style>

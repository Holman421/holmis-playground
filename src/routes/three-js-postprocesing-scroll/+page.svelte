<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
	import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
	import { gsap } from 'gsap';

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
		// Add mobile detection at the top
		const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			navigator.userAgent
		);

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

		// Add zoom state tracking
		let isZoomed = false;
		let zoomedPlane: THREE.Mesh | null = null;
		let effectActive = false; // Add this line here
		const INITIAL_FRUSTUM_SIZE = 6;
		const ZOOMED_FRUSTUM_SIZE = 2; // Smaller value = more zoomed in
		let currentFrustumSize = INITIAL_FRUSTUM_SIZE;

		// Add transition state tracking
		let isTransitioning = false;

		// Use a single scale constant for both hover and zoom
		const PLANE_SCALE = 2;
		const HOVER_SCALE = PLANE_SCALE;
		const ZOOM_SCALE = PLANE_SCALE;
		const HOVER_DURATION = 0.3;
		const ZOOM_DURATION = 1;

		const handleWheel = (e: WheelEvent) => {
			if (isZoomed) return; // Disable scrolling while zoomed
			e.preventDefault();
			velocity += e.deltaY * 0.0001 * SCROLL_SPEED; // Reduced multiplier
			velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));
		};

		const handleTouchStart = (e: TouchEvent) => {
			e.preventDefault();
			lastTouchY = e.touches[0].clientY;

			// Handle touch click/tap
			const touch = e.touches[0];
			const touchX = (touch.clientX / sizes.width) * 2 - 1;
			const touchY = -(touch.clientY / sizes.height) * 2 + 1;

			// Update mouse position for raycaster
			mouse.x = touchX;
			mouse.y = touchY;

			// Handle tap/click interaction
			if (!effectActive) {
				raycaster.setFromCamera(mouse, camera);
				const intersects = raycaster.intersectObjects(allPlanes);

				if (isZoomed) {
					resetCamera();
					return;
				}

				if (intersects.length > 0) {
					const clickedPlane = intersects[0].object as THREE.Mesh;
					zoomToPlane(clickedPlane);
				}
			}
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
		const TOTAL_SETS = 9; // Increased from 6 to 9 for more buffer
		const VISIBLE_SETS = 4; // Increased from 3 to 4 to show more at once
		const BUFFER_SETS = 2; // Increased from 1 to 2 for smoother transitions

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
		const NEIGHBOR_SCALE = 0.7;
		const GRID_X_THRESHOLD = 2.0; // Horizontal threshold
		const GRID_Y_THRESHOLD = 2.0; // Vertical threshold

		// Update the neighbor finding function to include corners
		const findNeighboringPlanes = (plane: THREE.Mesh) => {
			const planeMeta = planeMetadata.get(plane);
			if (!planeMeta) return [];

			return allPlanes.filter((p) => {
				if (p === plane) return false;
				const neighborMeta = planeMetadata.get(p);
				if (!neighborMeta) return false;

				// Calculate distance based on wrapped positions
				const dx = Math.abs(plane.position.x - p.position.x);
				const dy = Math.abs(plane.position.y - p.position.y);
				const gridTotalWidth = gridWidth * (TOTAL_SETS - 3);

				// Check both normal and wrapped distances
				const wrappedDx = Math.min(dx, Math.abs(dx - gridTotalWidth));

				return wrappedDx <= GRID_X_THRESHOLD && dy <= GRID_Y_THRESHOLD;
			});
		};

		// Add position tracking for transform origin simulation
		const planeMetadata = new Map<
			THREE.Mesh,
			{
				row: number;
				col: number;
				setIndex: number;
				id: string;
			}
		>();
		let planeIdCounter = 0;

		// Add texture loader with cache
		const textureLoader = new THREE.TextureLoader();
		const textureCache = new Map<string, THREE.Texture>();

		// Preload all textures
		const preloadTextures = async () => {
			return Promise.all(
				imgArray.map((url) => {
					return new Promise<void>((resolve) => {
						if (textureCache.has(url)) {
							resolve();
							return;
						}
						textureLoader.load(url, (texture) => {
							texture.generateMipmaps = true;
							texture.minFilter = THREE.LinearMipmapLinearFilter;
							texture.magFilter = THREE.LinearFilter;
							texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
							textureCache.set(url, texture);
							resolve();
						});
					});
				})
			);
		};

		// Function to create a grid of images - updated initial position
		const createImageGrid = (offsetX = 0, setIndex = 0) => {
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

				const texture = textureCache.get(imgArray[i]) || textureLoader.load(imgArray[i]);
				const geometry = new THREE.PlaneGeometry(1, 1);
				const material = new THREE.MeshBasicMaterial({
					map: texture,
					transparent: true
				});
				const plane = new THREE.Mesh(geometry, material);
				plane.position.set(x, y, 0);
				originalScales.set(plane, new THREE.Vector3(1, 1, 1));
				originalPositions.set(plane, new THREE.Vector3(x, y, 0));
				const planeId = `plane_${i}_${setIndex}_${planeIdCounter++}`;
				planeMetadata.set(plane, {
					row,
					col,
					setIndex,
					id: planeId
				});
				scene.add(plane);
				planes.push(plane);
			}
			return planes;
		};

		// Add function to calculate position offset based on row
		const calculateScaleOffset = (plane: THREE.Mesh, targetScale: number) => {
			const metadata = planeMetadata.get(plane);
			if (!metadata) return { x: 0, y: 0 };

			const isTopRow = metadata.row === 0;
			const isBottomRow = metadata.row === ROWS - 1;
			const scaleDelta = targetScale - 1;

			let yOffset = 0;
			if (isTopRow) {
				yOffset = scaleDelta * 0.5; // Move up when scaling from top
			} else if (isBottomRow) {
				yOffset = -(scaleDelta * 0.5); // Move down when scaling from bottom
			}

			return { x: 0, y: yOffset };
		};

		// Create multiple sets of images for seamless looping
		let allPlanes: THREE.Mesh[] = [];
		const gridWidth = COLUMNS * HORIZONTAL_SPACING;

		for (let i = 0; i < TOTAL_SETS; i++) {
			const planes = createImageGrid(i * gridWidth, i);
			allPlanes = [...allPlanes, ...planes];
		}

		// Add function to find duplicate planes at the same visual position
		const findDuplicatePlanes = (plane: THREE.Mesh) => {
			const planeMeta = planeMetadata.get(plane);
			if (!planeMeta) return [];

			return allPlanes.filter((p) => {
				if (p === plane) return false;
				const pMeta = planeMetadata.get(p);
				if (!pMeta) return false;

				// Check if they're in the same visual column and row
				return pMeta.row === planeMeta.row && Math.abs(p.position.x - plane.position.x) < 0.1;
			});
		};

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
		const frustumSize = 8; // Increased to show more of the scene
		const aspect = sizes.width / sizes.height;
		const camera = new THREE.OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			0.1,
			100
		);
		camera.position.set(0, -0.4, 4);
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
				currentFrustumSize = zoomedSize;
				updateCameraFrustum(currentFrustumSize);
			}
		});

		// Controls
		// const controls = new OrbitControls(camera, canvas);
		// controls.enableDamping = true;

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true,
			powerPreference: 'high-performance',
			stencil: false,
			depth: false // We don't need depth testing for 2D
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);

		// Enable shadow map auto update only when needed
		renderer.shadowMap.autoUpdate = false;
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

		// Add easing function
		const easeOutCubic = (x: number): number => {
			return 1 - Math.pow(1 - x, 3);
		};

		// Add constants for vertical overlap handling
		const VERTICAL_OVERLAP_OFFSET = 0.5; // How far to move vertical neighbors

		// Improved findVerticalNeighbors function
		const findVerticalNeighbors = (plane: THREE.Mesh) => {
			const metadata = planeMetadata.get(plane);
			if (!metadata) return { above: null, below: null };

			const isTopRow = metadata.row === 0;
			const isBottomRow = metadata.row === ROWS - 1;

			// Early return if not on top or bottom row
			if (!isTopRow && !isBottomRow) return { above: null, below: null };

			const findNeighborInColumn = (targetRow: number) => {
				// Get all planes in the target row that match the column position
				const possibleNeighbors = allPlanes.filter((p) => {
					const neighborMeta = planeMetadata.get(p);
					if (!neighborMeta || neighborMeta.row !== targetRow) return false;

					// Calculate wrapped distance for x position
					const dx = Math.abs(plane.position.x - p.position.x);
					const gridTotalWidth = gridWidth * (TOTAL_SETS - 3);
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
				duration: HOVER_DURATION,
				ease: 'power2.out'
			});

			// Move to target position
			gsap.to(neighbor.position, {
				y: targetY,
				duration: HOVER_DURATION,
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
						duration: HOVER_DURATION * 0.5,
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
				// Reset any existing hover states before zooming
				if (hoveredPlane) {
					const originalPos = originalPositions.get(hoveredPlane);
					if (originalPos) {
						gsap.to(hoveredPlane.scale, {
							x: 1,
							y: 1,
							duration: HOVER_DURATION / 2,
							ease: 'power2.out'
						});
					}
				}
				hoveredPlane = null;
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
			if (aspect < 1) {
				// Portrait mode - fit to width
				return ZOOMED_FRUSTUM_SIZE * (1 / aspect);
			}
			// Landscape mode - fit to height
			return ZOOMED_FRUSTUM_SIZE;
		};

		const zoomToPlane = (plane: THREE.Mesh) => {
			isTransitioning = true; // Start transition
			isZoomed = true;
			zoomedPlane = plane;

			const targetPosition = plane.position.clone();

			// Always scale up the clicked plane to HOVER_SCALE
			gsap.to(plane.scale, {
				x: HOVER_SCALE,
				y: HOVER_SCALE,
				duration: ZOOM_DURATION,
				ease: 'power2.inOut'
			});

			// Apply position offset for the main plane
			const offset = calculateScaleOffset(plane, HOVER_SCALE);
			const originalPos = originalPositions.get(plane);
			if (originalPos) {
				gsap.to(plane.position, {
					y: originalPos.y + offset.y,
					duration: ZOOM_DURATION,
					ease: 'power2.inOut'
				});
			}

			// Camera animations
			gsap.to(camera.position, {
				x: targetPosition.x,
				y: targetPosition.y,
				z: 4,
				duration: ZOOM_DURATION,
				ease: 'power2.inOut',
				onComplete: () => {
					isTransitioning = false; // End transition
				}
			});

			// Calculate appropriate frustum size based on aspect ratio
			const zoomedSize = calculateZoomFrustumSize();

			gsap.to(
				{ value: currentFrustumSize },
				{
					value: zoomedSize,
					duration: ZOOM_DURATION,
					ease: 'power2.inOut',
					onUpdate: function () {
						currentFrustumSize = this.targets()[0].value;
						updateCameraFrustum(currentFrustumSize);
					}
				}
			);

			// Keep neighbors scaled down
			const neighbors = findNeighboringPlanes(plane);
			neighbors.forEach((neighbor) => {
				gsap.to(neighbor.scale, {
					x: NEIGHBOR_SCALE,
					y: NEIGHBOR_SCALE,
					duration: ZOOM_DURATION,
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
			if (!isZoomed || !zoomedPlane) return;

			isTransitioning = true; // Start transition
			isZoomed = false;

			// Reset vertical neighbors first
			resetVerticalNeighbors(zoomedPlane);

			// Reset camera
			gsap.to(camera.position, {
				x: 0,
				y: 0,
				z: 4,
				duration: ZOOM_DURATION,
				ease: 'power2.inOut'
			});

			gsap.to(
				{ value: currentFrustumSize },
				{
					value: INITIAL_FRUSTUM_SIZE,
					duration: ZOOM_DURATION,
					ease: 'power2.inOut',
					onUpdate: function () {
						currentFrustumSize = this.targets()[0].value;
						updateCameraFrustum(currentFrustumSize);
					},
					onComplete: () => {
						isTransitioning = false; // End transition
						// Ensure complete reset of all planes after zoom animation
						allPlanes.forEach((plane) => {
							const originalPos = originalPositions.get(plane);
							if (originalPos) {
								gsap.killTweensOf(plane.scale);
								gsap.killTweensOf(plane.position);
								gsap.to(plane.scale, {
									x: 1,
									y: 1,
									duration: HOVER_DURATION,
									ease: 'power2.out'
								});
								gsap.to(plane.position, {
									y: originalPos.y,
									duration: HOVER_DURATION,
									ease: 'power2.out'
								});
							}
						});
					}
				}
			);

			zoomedPlane = null;
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
		const reuseOrCreatePlane = () => {
			for (const plane of objectPool) {
				if (!plane.parent) {
					return plane;
				}
			}
			const plane = new THREE.Mesh(
				new THREE.PlaneGeometry(1, 1),
				new THREE.MeshBasicMaterial({ transparent: true })
			);
			objectPool.add(plane);
			return plane;
		};

		// Add frustum buffer calculation
		const calculateVisibilityBounds = () => {
			const aspect = sizes.width / sizes.height;
			const horizontalBound = (frustumSize * aspect) / 2;
			const verticalBound = frustumSize / 2;
			return {
				left: -horizontalBound - HORIZONTAL_SPACING * 2,
				right: horizontalBound + HORIZONTAL_SPACING * 2,
				top: verticalBound + VERTICAL_SPACING,
				bottom: -verticalBound - VERTICAL_SPACING
			};
		};

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		let scrollX = 0;
		const scrollSpeed = 0.1;
		const maxScroll = gridWidth;

		// Optimize animation performance
		const ANIMATION_FRAME_BUDGET = 16; // ~60fps
		let lastFrameTime = 0;

		// Modified tick function - Option 1: Remove currentTime parameter
		const tick = () => {
			// Remove frame skipping since we don't have currentTime
			// Just call render every frame

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

			// Update planes positions with improved wrapping logic
			allPlanes.forEach((plane) => {
				const originalX = plane.position.x;
				plane.position.x -= currentScroll;

				const setWidth = gridWidth; // Width of one complete set of 12 images
				const totalWidth = setWidth * TOTAL_SETS;
				const activeWidth = setWidth * (VISIBLE_SETS + BUFFER_SETS * 2); // Add buffer to visible width
				const halfActiveWidth = activeWidth / 2;

				// Improved wrapping logic
				if (plane.position.x < -halfActiveWidth) {
					// When wrapping to right side
					plane.position.x += totalWidth;

					// Reset any active states
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
				} else if (plane.position.x > halfActiveWidth) {
					// When wrapping to left side
					plane.position.x -= totalWidth;

					// Reset any active states
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
			const velocityImpact = Math.abs(velocity) / EFFECT_INTENSITY;
			const targetEffect = Math.pow(velocityImpact, 1.5); // Non-linear scaling

			// Smooth transition of the effect
			currentEffect += (targetEffect - currentEffect) * EFFECT_LERP;

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

			// Only process hover effects if not on mobile
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
							duration: HOVER_DURATION * 0.5, // Faster reset during scroll
							ease: 'power2.out'
						});
						gsap.to(hoveredPlane.position, {
							y: originalPos.y,
							duration: HOVER_DURATION * 0.5,
							ease: 'power2.out'
						});

						// Reset all affected neighbors quickly
						findNeighboringPlanes(hoveredPlane).forEach((neighbor) => {
							const neighborOriginalScale = originalScales.get(neighbor);
							const neighborOriginalPos = originalPositions.get(neighbor);
							if (neighborOriginalScale && neighborOriginalPos) {
								gsap.to(neighbor.scale, {
									x: 1,
									y: 1,
									duration: HOVER_DURATION * 0.5,
									ease: 'power2.out'
								});
								gsap.to(neighbor.position, {
									y: neighborOriginalPos.y,
									duration: HOVER_DURATION * 0.5,
									ease: 'power2.out'
								});
							}
						});
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
								duration: HOVER_DURATION,
								ease: 'power2.out'
							});
							gsap.to(hoveredPlane.position, {
								y: originalPos.y,
								duration: HOVER_DURATION,
								ease: 'power2.out'
							});
							// Reset neighboring planes
							findNeighboringPlanes(hoveredPlane).forEach((neighbor) => {
								const neighborOriginalScale = originalScales.get(neighbor);
								const neighborOriginalPos = originalPositions.get(neighbor);
								if (neighborOriginalScale && neighborOriginalPos) {
									gsap.to(neighbor.scale, {
										x: neighborOriginalScale.x,
										y: neighborOriginalScale.y,
										duration: HOVER_DURATION,
										ease: 'power2.out'
									});
									gsap.to(neighbor.position, {
										y: neighborOriginalPos.y,
										duration: HOVER_DURATION,
										ease: 'power2.out'
									});
								}
							});
						}

						// Reset vertical neighbors
						const verticalNeighbors = findVerticalNeighbors(hoveredPlane);
						if (verticalNeighbors.above) {
							const originalPos = originalPositions.get(verticalNeighbors.above);
							if (originalPos) {
								gsap.to(verticalNeighbors.above.position, {
									y: originalPos.y,
									duration: HOVER_DURATION,
									ease: 'power2.out'
								});
							}
						}
						if (verticalNeighbors.below) {
							const originalPos = originalPositions.get(verticalNeighbors.below);
							if (originalPos) {
								gsap.to(verticalNeighbors.below.position, {
									y: originalPos.y,
									duration: HOVER_DURATION,
									ease: 'power2.out'
								});
							}
						}
					}

					// Scale up new hovered plane and scale down its neighbors
					if (newHoveredPlane) {
						const originalPos = originalPositions.get(newHoveredPlane);
						if (originalPos) {
							const offset = calculateScaleOffset(newHoveredPlane, HOVER_SCALE);
							gsap.to(newHoveredPlane.scale, {
								x: HOVER_SCALE,
								y: HOVER_SCALE,
								duration: HOVER_DURATION,
								ease: 'power2.out'
							});
							gsap.to(newHoveredPlane.position, {
								y: originalPos.y + offset.y,
								duration: HOVER_DURATION,
								ease: 'power2.out'
							});

							// Scale down neighboring planes
							findNeighboringPlanes(newHoveredPlane).forEach((neighbor) => {
								const neighborOriginalPos = originalPositions.get(neighbor);
								if (neighborOriginalPos) {
									const neighborOffset = calculateScaleOffset(neighbor, NEIGHBOR_SCALE);
									gsap.to(neighbor.scale, {
										x: NEIGHBOR_SCALE,
										y: NEIGHBOR_SCALE,
										duration: HOVER_DURATION,
										ease: 'power2.out'
									});
									gsap.to(neighbor.position, {
										y: neighborOriginalPos.y + neighborOffset.y,
										duration: HOVER_DURATION,
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
					if (Math.abs(worldPos.x) < bounds.right + HORIZONTAL_SPACING * BUFFER_SETS) {
						// Existing position update code...
					}
				} else {
					plane.visible = false;
				}
			});

			composer.render();
			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();

		// Optimize event listeners with debouncing
		const debounce = <T extends (...args: any[]) => any>(fn: T, ms: number) => {
			let timeoutId: ReturnType<typeof setTimeout>;
			return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
				clearTimeout(timeoutId);
				timeoutId = setTimeout(() => fn.apply(this, args), ms);
			};
		};

		const debouncedResize = debounce(() => {
			// ...existing resize code...
		}, 250);

		window.addEventListener('resize', debouncedResize);

		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
			window.removeEventListener('wheel', handleWheel);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchmove', handleTouchMove);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('click', handleClick);
			textureCache.forEach((texture) => texture.dispose());
			textureCache.clear();
			objectPool.forEach((obj) => {
				obj.geometry.dispose();
				(obj.material as THREE.Material).dispose();
			});
			objectPool.clear();
			renderer.dispose();
			composer.dispose();
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

<style>
	canvas.webgl {
		cursor: default;
		transition: cursor 0.1s ease-out;
	}
</style>

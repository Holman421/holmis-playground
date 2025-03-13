import * as THREE from 'three';

type Sizes = {
	width: number;
	height: number;
	pixelRatio: number;
};

export const setupSizes = (window: Window) => {
	const sizes = {
		width: window.innerWidth,
		height: window.innerHeight - 56,
		pixelRatio: Math.min(window.devicePixelRatio, 2)
	};
	return sizes;
};

export const setupCamera = (scene: THREE.Scene, sizes: Sizes) => {
	const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
	camera.position.set(-0, 0, 12);
	scene.add(camera);
	return camera;
};

export const setupRenderer = (canvas: HTMLCanvasElement, sizes: Sizes) => {
	const renderer = new THREE.WebGLRenderer({
		canvas: canvas,
		antialias: true
	});
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(sizes.pixelRatio);
	return renderer;
};

export const setupResizeListener = (
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer,
	sizes: Sizes
) => {
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
	});
};

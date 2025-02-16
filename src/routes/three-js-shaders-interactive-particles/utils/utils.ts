import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

type SizesType = {
	width: number;
	height: number;
	pixelRatio: number;
};

export const addRenderer = (canvas: HTMLCanvasElement, sizes: SizesType) => {
	const renderer = new THREE.WebGLRenderer({
		canvas: canvas,
		antialias: true
	});
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(sizes.pixelRatio);
	return renderer;
};

export const addCamera = (sizes: SizesType, scene: THREE.Scene) => {
	const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
	camera.position.set(-0, 0, 4);
	scene.add(camera);
	return camera;
};

export const addLight = (scene: THREE.Scene) => {
	const directionalLight = new THREE.DirectionalLight('#ffffff', 4);
	directionalLight.position.set(6.25, 3, 4);
	scene.add(directionalLight);
};

export const addControls = (camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) => {
	const controls = new OrbitControls(camera, canvas);
	controls.enableDamping = true;
	return controls;
};

export const getSizes = (window: Window) => {
	const sizes = {
		width: window.innerWidth,
		height: window.innerHeight - 56,
		pixelRatio: Math.min(window.devicePixelRatio, 2)
	};
	return sizes;
};

export const resizeRenderer = (
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer,
	sizes: SizesType
) => {
	const handleResize = () => {
		sizes.width = window.innerWidth;
		sizes.height = window.innerHeight - 56;
		sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);
		camera.aspect = sizes.width / sizes.height;
		camera.updateProjectionMatrix();
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
	};

	window.addEventListener('resize', handleResize);
	return () => {
		window.removeEventListener('resize', handleResize);
	};
};

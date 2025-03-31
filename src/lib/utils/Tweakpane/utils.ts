import { Pane, FolderApi } from 'tweakpane';
import { PerspectiveCamera, Scene, Mesh, SphereGeometry, MeshBasicMaterial } from 'three';
import type { OrbitControls } from 'three/examples/jsm/Addons.js';

export const setupCameraPane = ({
	pane,
	camera,
	controls,
	scene,
	isActive = true
}: {
	pane: Pane;
	camera: PerspectiveCamera;
	controls: OrbitControls;
	scene: Scene;
	isActive?: boolean;
}): FolderApi | undefined => {
	if (!isActive) return;

	// Create debug sphere
	const debugSphere = new Mesh(
		new SphereGeometry(0.05, 50, 50),
		new MeshBasicMaterial({ color: 0xff0000 })
	);
	scene.add(debugSphere);

	const cameraFolder = pane.addFolder({ title: 'Camera' });
	const params = { enabled: true, showTarget: true };

	// Add controls toggle
	cameraFolder
		.addBinding(params, 'enabled', {
			label: 'Orbit Controls'
		})
		.on('change', ({ value }) => {
			controls.enabled = value;
		});

	// Add target visibility toggle
	cameraFolder
		.addBinding(params, 'showTarget', {
			label: 'Show Target'
		})
		.on('change', ({ value }) => {
			debugSphere.visible = value;
		});

	// Add target controls
	const targetFolder = cameraFolder.addFolder({ title: 'Target (Look At)' });
	const targetBindings = {
		x: targetFolder.addBinding(controls.target, 'x', { min: -20, max: 20, step: 0.01 }),
		y: targetFolder.addBinding(controls.target, 'y', { min: -20, max: 20, step: 0.01 }),
		z: targetFolder.addBinding(controls.target, 'z', { min: -20, max: 20, step: 0.01 })
	};

	// Update debug sphere position when target changes
	const updateDebugSphere = () => {
		debugSphere.position.copy(controls.target);
	};

	Object.values(targetBindings).forEach((binding) => {
		binding.on('change', updateDebugSphere);
	});

	// Position controls
	const positionFolder = cameraFolder.addFolder({ title: 'Position' });
	const positionBindings = {
		x: positionFolder.addBinding(camera.position, 'x', { min: -20, max: 20, step: 0.01 }),
		y: positionFolder.addBinding(camera.position, 'y', { min: -20, max: 20, step: 0.01 }),
		z: positionFolder.addBinding(camera.position, 'z', { min: -20, max: 20, step: 0.01 })
	};

	// FOV control
	const fovBinding = cameraFolder
		.addBinding(camera, 'fov', { min: 20, max: 100, step: 1 })
		.on('change', () => camera.updateProjectionMatrix());

	// Setup monitoring/refresh
	const refresh = () => {
		Object.values(targetBindings).forEach((binding) => binding.refresh());
		Object.values(positionBindings).forEach((binding) => binding.refresh());
		fovBinding.refresh();
		updateDebugSphere();
	};

	// Monitor controls changes
	controls.addEventListener('change', refresh);

	return cameraFolder;
};

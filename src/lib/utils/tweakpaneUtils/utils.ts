import { Pane, FolderApi } from 'tweakpane';
import {
	PerspectiveCamera,
	Scene,
	Mesh,
	SphereGeometry,
	MeshBasicMaterial,
	DirectionalLight,
	DirectionalLightHelper,
	SpotLight,
	SpotLightHelper,
	PointLight,
	PointLightHelper,
	AmbientLight
} from 'three';
import type { OrbitControls } from 'three/examples/jsm/Addons.js';

export const setupCameraPane = ({
	pane,
	camera,
	controls,
	scene,
	isActive = true,
	defaultOpen = true,
	helperSize = 0.05,
}: {
	pane: Pane;
	camera: PerspectiveCamera;
	controls: OrbitControls;
	scene: Scene;
	isActive?: boolean;
	defaultOpen?: boolean;
	helperSize?: number;
}): FolderApi | undefined => {
	if (!isActive) return;

	// Create debug sphere
	const debugSphere = new Mesh(
		new SphereGeometry(helperSize, 50, 50),
		new MeshBasicMaterial({ color: 0xff0000 })
	);
	scene.add(debugSphere);

	const cameraFolder = pane.addFolder({ title: 'Camera', expanded: defaultOpen });
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
		x: targetFolder.addBinding(controls.target, 'x', { min: -100, max: 100, step: 0.01 }),
		y: targetFolder.addBinding(controls.target, 'y', { min: -100, max: 100, step: 0.01 }),
		z: targetFolder.addBinding(controls.target, 'z', { min: -100, max: 100, step: 0.01 })
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
			x: positionFolder.addBinding(camera.position, 'x', { min: -100, max: 100, step: 0.01 }),
			y: positionFolder.addBinding(camera.position, 'y', { min: -100, max: 100, step: 0.01 }),
			z: positionFolder.addBinding(camera.position, 'z', { min: -100, max: 100, step: 0.01 })
		};

	// FOV control
	const fovBinding = cameraFolder
		.addBinding(camera, 'fov', { min: 20, max: 100, step: 1 })
		.on('change', () => camera.updateProjectionMatrix());

	// Camera distance and rotation controls
	const cameraControlsFolder = cameraFolder.addFolder({ title: 'Camera Controls' });

	// Calculate initial distance and angle
	const getDistance = () => camera.position.distanceTo(controls.target);
	const getYAngle = () => Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);

	const cameraControlParams = {
		distance: getDistance(),
		yRotation: getYAngle()
	};

	// Distance control
	const distanceBinding = cameraControlsFolder
		.addBinding(cameraControlParams, 'distance', {
			label: 'Distance',
			min: 0.5,
			max: 20,
			step: 0.01
		})
		.on('change', ({ value }) => {
			const currentY = camera.position.y - controls.target.y;
			const currentAngle = cameraControlParams.yRotation;

			camera.position.x = controls.target.x + Math.sin(currentAngle) * value;
			camera.position.z = controls.target.z + Math.cos(currentAngle) * value;
			camera.position.y = controls.target.y + currentY;

			// Refresh position bindings
			Object.values(positionBindings).forEach((binding) => binding.refresh());
		});

	// Y-axis rotation control
	const yRotationBinding = cameraControlsFolder
		.addBinding(cameraControlParams, 'yRotation', {
			label: 'Y Rotation',
			min: -Math.PI,
			max: Math.PI,
			step: 0.01
		})
		.on('change', ({ value }) => {
			const currentDistance = cameraControlParams.distance;
			const currentY = camera.position.y - controls.target.y;

			camera.position.x = controls.target.x + Math.sin(value) * currentDistance;
			camera.position.z = controls.target.z + Math.cos(value) * currentDistance;
			camera.position.y = controls.target.y + currentY;

			// Refresh position bindings
			Object.values(positionBindings).forEach((binding) => binding.refresh());
		});

	// Setup monitoring/refresh
	const refresh = () => {
		Object.values(targetBindings).forEach((binding) => binding.refresh());
		Object.values(positionBindings).forEach((binding) => binding.refresh());
		fovBinding.refresh();

		// Update camera control parameters
		cameraControlParams.distance = getDistance();
		cameraControlParams.yRotation = getYAngle();
		distanceBinding.refresh();
		yRotationBinding.refresh();

		updateDebugSphere();
	};

	// Monitor controls changes - but only refresh UI, don't interfere with controls
	controls.addEventListener('change', () => {
		// Only update debug sphere and UI refresh, don't recalculate camera parameters
		// that might interfere with OrbitControls
		updateDebugSphere();
		Object.values(targetBindings).forEach((binding) => binding.refresh());
		Object.values(positionBindings).forEach((binding) => binding.refresh());
		fovBinding.refresh();
	});

	return cameraFolder;
};

export const setupLightPane = ({
	pane,
	light,
	name,
	scene,
	isActive = true,
	positionRange = { min: -20, max: 20 },
	targetRange = { min: -20, max: 20 },
	showHelper = false
}: {
	pane: Pane;
	light: DirectionalLight | SpotLight | PointLight;
	name: string;
	scene: Scene;
	isActive?: boolean;
	positionRange?: { min: number; max: number };
	targetRange?: { min: number; max: number };
	showHelper?: boolean;
}): FolderApi | undefined => {
	if (!isActive) return;

	const lightFolder = pane.addFolder({ title: name });

	// Light helper toggle
	let helper: DirectionalLightHelper | SpotLightHelper | PointLightHelper | null = null;
	const helperParams = { showHelper };

	const removeHelper = () => {
		if (helper && helper.parent) {
			helper.parent.remove(helper);
			helper = null;
			helperParams.showHelper = false;
		}
	};

	const addHelper = () => {
		if (light instanceof DirectionalLight) {
			helper = new DirectionalLightHelper(light, 1);
		} else if (light instanceof SpotLight) {
			helper = new SpotLightHelper(light);
		} else if (light instanceof PointLight) {
			helper = new PointLightHelper(light, 1);
		}
		if (helper) scene.add(helper);
	};

	// Initialize helper based on showHelper parameter
	if (showHelper) {
		addHelper();
	}

	// Helper toggle
	lightFolder
		.addBinding(helperParams, 'showHelper', {
			label: 'Show Helper',
		})
		.on('change', ({ value }) => {
			if (!value) {
				removeHelper();
				return;
			}

			addHelper();
		});

	// Position controls
	const positionFolder = lightFolder.addFolder({ title: 'Position' });
	const positionBindings = {
		x: positionFolder.addBinding(light.position, 'x', {
			min: positionRange.min,
			max: positionRange.max,
			step: 0.1
		}).on('change', () => helper?.update()),
		y: positionFolder.addBinding(light.position, 'y', {
			min: positionRange.min,
			max: positionRange.max,
			step: 0.1
		}).on('change', () => helper?.update()),
		z: positionFolder.addBinding(light.position, 'z', {
			min: positionRange.min,
			max: positionRange.max,
			step: 0.1
		}).on('change', () => helper?.update())
	};

	// Rotation controls (skip for point lights as they emit in all directions)
	if (!(light instanceof PointLight)) {
		const rotationFolder = lightFolder.addFolder({ title: 'Rotation' });
		const rotationBindings = {
			x: rotationFolder.addBinding(light.rotation, 'x', {
				min: -Math.PI,
				max: Math.PI,
				step: 0.01
			}).on('change', () => helper?.update()),
			y: rotationFolder.addBinding(light.rotation, 'y', {
				min: -Math.PI,
				max: Math.PI,
				step: 0.01
			}).on('change', () => helper?.update()),
			z: rotationFolder.addBinding(light.rotation, 'z', {
				min: -Math.PI,
				max: Math.PI,
				step: 0.01
			}).on('change', () => helper?.update())
		};
	}

	// Color and intensity controls
	lightFolder.addBinding(light, 'color', {
		view: 'color',
		label: 'Color'
	});

	lightFolder.addBinding(light, 'intensity', {
		min: 0,
		max: 50,
		step: 0.1,
		label: 'Intensity'
	});

	// SpotLight specific controls
	if (light instanceof SpotLight) {
		const spotFolder = lightFolder.addFolder({ title: 'Spot Light Settings' });

		spotFolder.addBinding(light, 'angle', {
			min: 0,
			max: Math.PI / 2,
			step: 0.01,
			label: 'Cone Angle'
		}).on('change', () => helper?.update());

		spotFolder.addBinding(light, 'penumbra', {
			min: 0,
			max: 1,
			step: 0.01,
			label: 'Edge Softness'
		}).on('change', () => helper?.update());

		spotFolder.addBinding(light, 'decay', {
			min: 0,
			max: 5,
			step: 0.1,
			label: 'Light Decay'
		});

		spotFolder.addBinding(light, 'distance', {
			min: 0,
			max: 100,
			step: 1,
			label: 'Max Distance'
		}).on('change', () => helper?.update());

		// Target position controls
		const targetFolder = lightFolder.addFolder({ title: 'Target Position' });
		const targetBindings = {
			x: targetFolder.addBinding(light.target.position, 'x', {
				min: targetRange.min,
				max: targetRange.max,
				step: 0.1
			}).on('change', () => helper?.update()),
			y: targetFolder.addBinding(light.target.position, 'y', {
				min: targetRange.min,
				max: targetRange.max,
				step: 0.1
			}).on('change', () => helper?.update()),
			z: targetFolder.addBinding(light.target.position, 'z', {
				min: targetRange.min,
				max: targetRange.max,
				step: 0.1
			}).on('change', () => helper?.update())
		};
	}

	return lightFolder;
};

export const setupAmbientLightPane = ({
	pane,
	light,
	name = 'Ambient Light',
	isActive = true
}: {
	pane: Pane;
	light: AmbientLight;
	name?: string;
	isActive?: boolean;
}): FolderApi | undefined => {
	if (!isActive) return;

	const lightFolder = pane.addFolder({ title: name });

	// Color and intensity controls
	lightFolder.addBinding(light, 'color', {
		view: 'color',
		label: 'Color'
	});

	lightFolder.addBinding(light, 'intensity', {
		min: 0,
		max: 5,
		step: 0.1,
		label: 'Intensity'
	});

	return lightFolder;
};

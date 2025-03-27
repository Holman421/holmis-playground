import { PerspectiveCamera, Vector3 } from 'three';
import GUI from 'lil-gui';
import type { OrbitControls } from 'three/examples/jsm/Addons.js';

export interface CameraState {
	position: {
		x: number;
		y: number;
		z: number;
	};
	target: {
		x: number;
		y: number;
		z: number;
	};
	up: {
		x: number;
		y: number;
		z: number;
	};
	fov: number;
}

export const setupCameraGUI = ({
	gui,
	camera,
	controls
}: {
	gui: GUI;
	camera: PerspectiveCamera;
	controls: OrbitControls;
}) => {
	const cameraFolder = gui.addFolder('Camera');

	// Add controls toggle
	cameraFolder
		.add({ enabled: true }, 'enabled')
		.name('Orbit Controls')
		.onChange((value: any) => {
			controls.enabled = value;
		});

	// Add target controls
	const targetFolder = cameraFolder.addFolder('Target (Look At)');
	targetFolder.add(controls.target, 'x').min(-20).max(20).step(0.01).listen();
	targetFolder.add(controls.target, 'y').min(-20).max(20).step(0.01).listen();
	targetFolder.add(controls.target, 'z').min(-20).max(20).step(0.01).listen();

	// Existing position and rotation controls...
	const positionFolder = cameraFolder.addFolder('Position');
	positionFolder.add(camera.position, 'x').min(-20).max(20).step(0.01).listen();
	positionFolder.add(camera.position, 'y').min(-20).max(20).step(0.01).listen();
	positionFolder.add(camera.position, 'z').min(-20).max(20).step(0.01).listen();

	// FOV control
	cameraFolder
		.add(camera, 'fov')
		.min(20)
		.max(100)
		.step(1)
		.onChange(() => {
			camera.updateProjectionMatrix();
		});

	// Enhanced camera state management
	cameraFolder
		.add(
			{
				// Save current camera state
				saveCameraState: () => {
					const state: CameraState = {
						position: {
							x: parseFloat(camera.position.x.toFixed(2)),
							y: parseFloat(camera.position.y.toFixed(2)),
							z: parseFloat(camera.position.z.toFixed(2))
						},
						target: {
							x: parseFloat(controls.target.x.toFixed(2)),
							y: parseFloat(controls.target.y.toFixed(2)),
							z: parseFloat(controls.target.z.toFixed(2))
						},
						up: {
							x: parseFloat(camera.up.x.toFixed(2)),
							y: parseFloat(camera.up.y.toFixed(2)),
							z: parseFloat(camera.up.z.toFixed(2))
						},
						fov: camera.fov
					};

					console.log('Camera State (Copy-paste):');
					console.log(JSON.stringify(state, null, 2));
					return state;
				},

				// Restore camera state
				restoreCameraState: (state?: CameraState) => {
					if (!state) return;

					// Restore camera position
					camera.position.set(state.position.x, state.position.y, state.position.z);

					// Restore controls target
					controls.target.set(state.target.x, state.target.y, state.target.z);

					// Restore camera up vector
					camera.up.set(state.up.x, state.up.y, state.up.z);

					// Restore FOV
					camera.fov = state.fov;
					camera.updateProjectionMatrix();

					// Update controls
					controls.update();
				}
			},
			'saveCameraState'
		)
		.name('Save Camera State');

	cameraFolder
		.add(
			{
				printCameraValues: () => {
					const logString = `
	this.camera.position.set(${parseFloat(camera.position.x.toFixed(2))}, ${parseFloat(camera.position.y.toFixed(2))}, ${parseFloat(camera.position.z.toFixed(2))});
	this.camera.rotation.set(${parseFloat(camera.rotation.x.toFixed(2))}, ${parseFloat(camera.rotation.y.toFixed(2))}, ${parseFloat(camera.rotation.z.toFixed(2))});
	controls.target.set(${parseFloat(controls.target.x.toFixed(2))}, ${parseFloat(controls.target.y.toFixed(2))}, ${parseFloat(controls.target.z.toFixed(2))});
	this.camera.fov = ${camera.fov};
	this.camera.updateProjectionMatrix();`;

					console.log(logString);

					// Optional: Copy to clipboard
					navigator.clipboard
						.writeText(logString)
						.then(() => {
							console.log('Camera setup copied to clipboard');
						})
						.catch((err) => {
							console.error('Failed to copy camera setup', err);
						});
				}
			},
			'printCameraValues'
		)
		.name('Print Camera Values');

	return cameraFolder;
};

// Optional: Utility to save/load camera state to localStorage
export const persistCameraState = {
	save: (key: string, state: CameraState) => {
		localStorage.setItem(key, JSON.stringify(state));
	},
	load: (key: string): CameraState | null => {
		const savedState = localStorage.getItem(key);
		return savedState ? JSON.parse(savedState) : null;
	}
};

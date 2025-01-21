import { PerspectiveCamera } from 'three';
import GUI from 'lil-gui';

export const setupCameraGUI = (camera: PerspectiveCamera, gui: GUI) => {
	const cameraFolder = gui.addFolder('Camera');

	// Position controls
	const positionFolder = cameraFolder.addFolder('Position');
	positionFolder.add(camera.position, 'x').min(-20).max(20).step(0.1).listen();
	positionFolder.add(camera.position, 'y').min(-20).max(20).step(0.1).listen();
	positionFolder.add(camera.position, 'z').min(-20).max(20).step(0.1).listen();

	// Rotation controls
	const rotationFolder = cameraFolder.addFolder('Rotation');
	rotationFolder.add(camera.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.01).listen();
	rotationFolder.add(camera.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.01).listen();
	rotationFolder.add(camera.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.01).listen();

	// FOV control
	cameraFolder
		.add(camera, 'fov')
		.min(20)
		.max(100)
		.step(1)
		.onChange(() => {
			camera.updateProjectionMatrix();
		});

	return cameraFolder;
};

import { PerspectiveCamera } from 'three';
import GUI from 'lil-gui';

export const setupCameraGUI = (camera: PerspectiveCamera, gui: GUI) => {
	const cameraFolder = gui.addFolder('Camera');

	// Position controls
	const positionFolder = cameraFolder.addFolder('Position');
	positionFolder.add(camera.position, 'x').min(-20).max(20).step(0.01).listen();
	positionFolder.add(camera.position, 'y').min(-20).max(20).step(0.01).listen();
	positionFolder.add(camera.position, 'z').min(-20).max(20).step(0.01).listen();

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

	// Print camera values button with improved copying
	cameraFolder
		.add(
			{
				printCameraValues: () => {
					const cameraValues = {
						fov: camera.fov,
						position: {
							x: parseFloat(camera.position.x.toFixed(2)),
							y: parseFloat(camera.position.y.toFixed(2)),
							z: parseFloat(camera.position.z.toFixed(2))
						},
						rotation: {
							x: parseFloat(camera.rotation.x.toFixed(2)),
							y: parseFloat(camera.rotation.y.toFixed(2)),
							z: parseFloat(camera.rotation.z.toFixed(2))
						}
					};
					// Also log as JavaScript object format
					console.log('Copy-paste format:');
					console.log(`{
  fov: ${cameraValues.fov},
  position: { x: ${cameraValues.position.x}, y: ${cameraValues.position.y}, z: ${cameraValues.position.z} },
  rotation: { x: ${cameraValues.rotation.x}, y: ${cameraValues.rotation.y}, z: ${cameraValues.rotation.z} }
}`);
				}
			},
			'printCameraValues'
		)
		.name('Print Camera Values');

	return cameraFolder;
};

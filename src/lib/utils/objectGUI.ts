import { Object3D } from 'three';
import GUI from 'lil-gui';

export const setupObjectGUI = (object: Object3D, gui: GUI, name: string) => {
	const objectFolder = gui.addFolder(name);

	// Position controls
	const positionFolder = objectFolder.addFolder('Position');
	positionFolder.add(object.position, 'x').min(-10).max(10).step(0.01).listen();
	positionFolder.add(object.position, 'y').min(-10).max(10).step(0.01).listen();
	positionFolder.add(object.position, 'z').min(-10).max(10).step(0.01).listen();

	// Rotation controls
	const rotationFolder = objectFolder.addFolder('Rotation');
	rotationFolder.add(object.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.01).listen();
	rotationFolder.add(object.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.01).listen();
	rotationFolder.add(object.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.01).listen();

	return objectFolder;
};

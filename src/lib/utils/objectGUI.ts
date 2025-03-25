import { Object3D } from 'three';
import GUI from 'lil-gui';

export const setupObjectGUI = (
	object: Object3D,
	gui: GUI,
	maxRange: number = 50,
	name: string = 'Object'
) => {
	const objectFolder = gui.addFolder(name);

	// Position controls
	const positionFolder = objectFolder.addFolder('Position');
	positionFolder.add(object.position, 'x').min(-maxRange).max(maxRange).step(0.01).listen();
	positionFolder.add(object.position, 'y').min(-maxRange).max(maxRange).step(0.01).listen();
	positionFolder.add(object.position, 'z').min(-maxRange).max(maxRange).step(0.01).listen();

	// Rotation controls
	const rotationFolder = objectFolder.addFolder('Rotation');
	rotationFolder.add(object.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.01).listen();
	rotationFolder.add(object.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.01).listen();
	rotationFolder.add(object.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.01).listen();

	// Scale controls
	const scaleFolder = objectFolder.addFolder('Scale');
	scaleFolder.add(object.scale, 'x').min(0.1).max(maxRange).step(0.01).listen();
	scaleFolder.add(object.scale, 'y').min(0.1).max(maxRange).step(0.01).listen();
	scaleFolder.add(object.scale, 'z').min(0.1).max(maxRange).step(0.01).listen();

	return objectFolder;
};

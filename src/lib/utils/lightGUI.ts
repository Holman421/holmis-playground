import { DirectionalLight, DirectionalLightHelper } from 'three';
import GUI from 'lil-gui';

export const setupLightGUI = (light: DirectionalLight, gui: GUI, name: string) => {
	const lightFolder = gui.addFolder(name);

	// Position controls
	const positionFolder = lightFolder.addFolder('Position');
	positionFolder.add(light.position, 'x').min(-20).max(20).step(0.1).listen();
	positionFolder.add(light.position, 'y').min(-20).max(20).step(0.1).listen();
	positionFolder.add(light.position, 'z').min(-20).max(20).step(0.1).listen();

	// Rotation controls
	const rotationFolder = lightFolder.addFolder('Rotation');
	rotationFolder.add(light.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.01).listen();
	rotationFolder.add(light.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.01).listen();
	rotationFolder.add(light.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.01).listen();

	// Color and intensity controls
	lightFolder.addColor(light, 'color').listen();
	lightFolder.add(light, 'intensity').min(0).max(10).step(0.1).listen();

	// Light helper toggle
	let helper: DirectionalLightHelper | null = null;
	const helperControls = {
		showHelper: false
	};

	lightFolder.add(helperControls, 'showHelper').onChange((value: boolean) => {
		if (value && !helper) {
			helper = new DirectionalLightHelper(light, 1);
			light.parent?.add(helper);
		} else if (!value && helper) {
			helper.dispose();
			light.parent?.remove(helper);
			helper = null;
		}
	});

	return lightFolder;
};

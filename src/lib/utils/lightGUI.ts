import {
	DirectionalLight,
	DirectionalLightHelper,
	SpotLight,
	SpotLightHelper,
	PointLight,
	PointLightHelper,
	Light
} from 'three';
import GUI from 'lil-gui';

export const setupLightGUI = (
	light: DirectionalLight | SpotLight | PointLight,
	gui: GUI,
	name: string
) => {
	const lightFolder = gui.addFolder(name);

	// Position controls
	const positionFolder = lightFolder.addFolder('Position');
	['x', 'y', 'z'].forEach((axis) => {
		positionFolder
			.add(light.position, axis)
			.min(-20)
			.max(20)
			.step(0.1)
			.listen()
			.onChange(() => helper?.update());
	});

	// Rotation controls
	const rotationFolder = lightFolder.addFolder('Rotation');
	['x', 'y', 'z'].forEach((axis) => {
		rotationFolder
			.add(light.rotation, axis)
			.min(-Math.PI)
			.max(Math.PI)
			.step(0.01)
			.listen()
			.onChange(() => helper?.update());
	});

	// Color and intensity controls
	lightFolder.addColor(light, 'color').listen();
	lightFolder.add(light, 'intensity').min(0).max(50).step(0.1).listen();

	// SpotLight specific controls
	if (light instanceof SpotLight) {
		const spotControls = lightFolder.addFolder('Spot Light Settings');
		spotControls
			.add(light, 'angle')
			.min(0)
			.max(Math.PI / 2)
			.step(0.01)
			.name('Cone Angle')
			.listen()
			.onChange(() => helper?.update());
		spotControls
			.add(light, 'penumbra')
			.min(0)
			.max(1)
			.step(0.01)
			.name('Edge Softness')
			.listen()
			.onChange(() => helper?.update());
		spotControls.add(light, 'decay').min(0).max(5).step(0.1).name('Light Decay').listen();
		spotControls
			.add(light, 'distance')
			.min(0)
			.max(100)
			.step(1)
			.name('Max Distance')
			.listen()
			.onChange(() => helper?.update());

		// Target position controls
		const targetFolder = lightFolder.addFolder('Target Position');
		['x', 'y', 'z'].forEach((axis) => {
			targetFolder
				.add(light.target.position, axis)
				.min(-20)
				.max(20)
				.step(0.1)
				.listen()
				.onChange(() => helper?.update());
		});
	}

	// Light helper toggle
	let helper: DirectionalLightHelper | SpotLightHelper | PointLightHelper | null = null;
	const helperControls = {
		showHelper: false
	};

	const removeHelper = () => {
		if (helper && helper.parent) {
			helper.parent.remove(helper);
			helper = null;
			helperControls.showHelper = false;
		}
	};

	lightFolder.add(helperControls, 'showHelper').onChange((value: boolean) => {
		if (!value) {
			removeHelper();
			return;
		}

		if (light instanceof DirectionalLight) {
			helper = new DirectionalLightHelper(light, 1);
		} else if (light instanceof SpotLight) {
			helper = new SpotLightHelper(light);
		} else if (light instanceof PointLight) {
			helper = new PointLightHelper(light, 1);
		}
		if (helper) light.parent?.add(helper);
	});

	return lightFolder;
};

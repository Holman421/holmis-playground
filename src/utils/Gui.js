import EventEmitter from './EventEmitter';
import GUI from 'lil-gui';
import Experience from './Experince/Experience';

export default class Gui extends EventEmitter {
	constructor(parameters) {
		super();
		this.experience = new Experience();
		this.gui = new GUI();
		this.parameters = parameters;

		this.setupGui();
	}

	setupGui() {
		this.gui
			.add(this.parameters, 'count')
			.min(100)
			.max(500000)
			.step(100)
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui
			.add(this.parameters, 'size')
			.min(0.001)
			.max(0.1)
			.step(0.001)
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui
			.add(this.parameters, 'radius')
			.min(1)
			.max(20)
			.step(1)
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui
			.add(this.parameters, 'branches')
			.min(2)
			.max(20)
			.step(1)
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui
			.add(this.parameters, 'spin')
			.min(-5)
			.max(5)
			.step(0.001)
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui
			.add(this.parameters, 'randomness')
			.min(0)
			.max(2)
			.step(0.001)
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui
			.add(this.parameters, 'branchSaturation')
			.min(1)
			.max(10)
			.step(0.1)
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui
			.add(this.parameters, 'centerSaturation')
			.min(1)
			.max(10)
			.step(0.1)
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui.add(this.parameters, 'rotationSpeed').min(0).max(1).step(0.001);
		this.gui
			.addColor(this.parameters, 'insideColor')
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui
			.addColor(this.parameters, 'outsideColor')
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
		this.gui
			.add(this.parameters, 'centralStarCount')
			.min(0)
			.max(25000)
			.step(100)
			.onFinishChange(() => this.experience.galaxy.createGalaxy());
	}
}

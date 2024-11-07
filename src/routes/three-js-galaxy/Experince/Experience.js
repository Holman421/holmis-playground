import * as THREE from 'three';
import Sizes from '../Sizes';
import Time from '../Time';
import Camera from './Camera';
import Renderer from '../Renderer';
import Galaxy from '../Galaxy';
import Gui from '../GUI';

let instance = null;

export default class Experience {
	constructor(options) {
		if (instance) {
			return instance;
		}
		instance = this;
		window.experience = this;

		this.canvas = options.canvas;

		// Setup
		this.sizes = new Sizes();
		this.time = new Time();
		this.scene = new THREE.Scene();
		this.camera = new Camera();
		this.renderer = new Renderer();
		this.galaxy = new Galaxy(options.parameters);
		this.gui = new Gui(options.parameters);

		this.sizes.on('resize', () => {
			this.resize();
		});

		this.time.on('tick', () => {
			this.update();
		});
	}

	resize() {
		this.camera.resize();
		this.renderer.resize();
	}

	update() {
		this.camera.update();
		this.renderer.update();
		this.galaxy.update();
	}
}

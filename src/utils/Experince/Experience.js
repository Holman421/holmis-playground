import * as THREE from 'three';
import Sizes from '../Sizes';
import Time from '../TimeBro';
import Camera from './Camera';
import Renderer from '../Renderer';

let instance = null;

export default class Experience {
	constructor({ canvas: canvas }) {
		if (instance) {
			return instance;
		}
		instance = this;
		window.experience = this;

		this.canvas = canvas;

		// Setup
		this.sizes = new Sizes();
		this.time = new Time();
		this.scene = new THREE.Scene();
		this.camera = new Camera();
		this.renderer = new Renderer();
		this.sizes.on('resize', () => {
			this.resize();
		});

		this.time.on('tick', () => {
			this.update();
		});
	}

	resize() {
		this.camera.resize();
	}

	update() {
		this.camera.update();
	}
}

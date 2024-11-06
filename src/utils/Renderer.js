import Experience from './Experince/Experience';
import * as THREE from 'three';

export default class Renderer {
	constructor() {
		this.experience = new Experience();
		this.canvas = this.experience.canvas;
		this.sizes = this.experience.sizes;
		this.scene = this.experience.scene;
		this.camera = this.experience.camera;

		this.setInstance();
	}

	setInstance() {
		this.instance = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true
		});
	}
}

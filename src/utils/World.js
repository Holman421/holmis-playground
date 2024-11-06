import Experience from './Experince/Experience';
import * as THREE from 'three';
export default class World {
	constructor() {
		this.experience = new Experience();
		this.scene = this.experience.scene;

		const testMesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1, 10, 10, 10),
			new THREE.MeshBasicMaterial({ wireframe: true })
		);
		this.scene.add(testMesh);
	}
}

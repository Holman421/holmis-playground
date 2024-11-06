import EventEmitter from './EventEmitter';
import Experience from './Experince/Experience';
import * as THREE from 'three';

let instance = null;

export default class Galaxy extends EventEmitter {
	constructor(parameters) {
		if (instance) {
			return instance;
		}
		super();
		this.experience = new Experience();
		this.geometry = null;
		this.material = null;
		this.points = null;
		this.parameters = parameters;
		this.elapsedTime = 0;

		this.createGalaxy();
	}

	createGalaxy() {
		if (this.points) {
			this.geometry.dispose();
			this.material.dispose();
			this.experience.scene.remove(this.points);
		}
		this.geometry = new THREE.BufferGeometry();

		const blackHole = new THREE.Mesh(
			new THREE.SphereGeometry(0.05, 32, 32),
			new THREE.MeshBasicMaterial({ color: 'black' })
		);

		this.experience.scene.add(blackHole);

		const positions = new Float32Array(
			(this.parameters.count + this.parameters.centralStarCount) * 3
		);
		const colors = new Float32Array((this.parameters.count + this.parameters.centralStarCount) * 3);

		const colorInside = new THREE.Color(this.parameters.insideColor);
		const colorOutside = new THREE.Color(this.parameters.outsideColor);

		for (let i = 0; i < this.parameters.count; i++) {
			const i3 = i * 3;

			const radiusRandom = Math.random();
			const radius =
				Math.pow(radiusRandom, this.parameters.centerSaturation) * this.parameters.radius;

			const spinAngle = radius * this.parameters.spin;
			const branchAngle = ((i % this.parameters.branches) / this.parameters.branches) * Math.PI * 2;

			const randomX =
				Math.pow(Math.random(), this.parameters.branchSaturation) *
				(Math.random() < 0.5 ? 1 : -1) *
				this.parameters.randomness *
				radius;
			const randomY =
				Math.pow(Math.random(), this.parameters.branchSaturation) *
				(Math.random() < 0.5 ? 1 : -1) *
				this.parameters.randomness *
				radius;
			const randomZ =
				Math.pow(Math.random(), this.parameters.branchSaturation) *
				(Math.random() < 0.5 ? 1 : -1) *
				this.parameters.randomness *
				radius;

			positions[i3 + 0] = Math.cos(branchAngle + spinAngle) * radius + randomX;
			positions[i3 + 1] = randomY / 2;
			positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

			const mixedColor = colorInside.clone();
			mixedColor.lerp(colorOutside, radius / this.parameters.radius);
			colors[i3] = mixedColor.r;
			colors[i3 + 1] = mixedColor.g;
			colors[i3 + 2] = mixedColor.b;
		}

		for (
			let i = this.parameters.count;
			i < this.parameters.count + this.parameters.centralStarCount;
			i++
		) {
			const i3 = i * 3;

			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const radius = Math.random() * this.parameters.radius * 0.075;

			positions[i3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
			positions[i3 + 1] = (radius * Math.sin(phi) * Math.cos(theta)) / 10;
			positions[i3 + 2] = radius * Math.cos(phi);

			colors[i3] = colorInside.r;
			colors[i3 + 1] = colorInside.g;
			colors[i3 + 2] = colorInside.b;
		}

		this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

		this.material = new THREE.PointsMaterial({
			size: this.parameters.size,
			sizeAttenuation: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			vertexColors: true
		});

		this.points = new THREE.Points(this.geometry, this.material);
		this.experience.scene.add(this.points);
	}

	update() {
		this.points.rotation.y = (this.experience.time.elapsed / 1000) * this.parameters.rotationSpeed;
		this.points.rotation.x = (this.experience.time.elapsed / 1000) * this.parameters.rotationSpeed;
	}
}

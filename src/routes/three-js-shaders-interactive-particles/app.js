import * as THREE from 'three';
import { REVISION } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import fragment from './shader/fragment.glsl';
import vertex from './shader/vertexParticles.glsl';

import simFragment from './shader/simFragment.glsl';
import simVertex from './shader/simVertex.glsl';
import GUI from 'lil-gui';
import gsap from 'gsap';

export default class Sketch {
	constructor(options) {
		this.scene = new THREE.Scene();

		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0x000000, 1);

		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();

		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 1000);

		// let frustumSize = 10;
		// let aspect = this.width / this.height;
		// this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
		this.camera.position.set(0, 0, 4);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;

		const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;
		this.dracoLoader = new DRACOLoader(new THREE.LoadingManager()).setDecoderPath(
			`${THREE_PATH}/examples/jsm/libs/draco/gltf/`
		);
		this.gltfLoader = new GLTFLoader();
		this.gltfLoader.setDRACOLoader(this.dracoLoader);

		this.isPlaying = true;
		this.setupEvents();
		this.setupFBO();
		this.addObjects();
		this.resize();
		this.render();
		this.setupResize();
		// this.setUpSettings();
	}

	setupEvents() {
		this.dummy = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial());
		this.ball = new THREE.Mesh(
			new THREE.SphereGeometry(0.1, 32, 32),
			new THREE.MeshBasicMaterial({ color: 0x555555 })
		);
		// this.scene.add(this.ball)
		document.addEventListener('pointermove', (e) => {
			this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
			this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

			this.raycaster.setFromCamera(this.pointer, this.camera);
			let intersects = this.raycaster.intersectObject(this.dummy);
			if (intersects.length > 0) {
				let { x, y } = intersects[0].point;
				this.fboMaterial.uniforms.uMouse.value = new THREE.Vector2(x, y);
				console.log(x, y);
				this.ball.position.set(x, y, 0);
			}
		});
	}

	setUpSettings() {
		this.settings = {
			progress: 0
		};
		this.gui = new GUI();
		this.gui.add(this.settings, 'progress', 0, 1, 0.01).onChange((val) => {});
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this));
	}

	getRenderTarget() {
		const renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		return renderTarget;
	}

	setupFBO() {
		this.size = 256;
		this.fbo = this.getRenderTarget();
		this.fbo1 = this.getRenderTarget();

		this.fboScene = new THREE.Scene();
		this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
		this.fboCamera.position.set(0, 0, 0.5);
		this.fboCamera.lookAt(0, 0, 0);
		let geometry = new THREE.PlaneGeometry(2, 2);

		this.data = new Float32Array(this.size * this.size * 4);

		for (let i = 0; i < this.size; i++) {
			for (let j = 0; j < this.size; j++) {
				let index = (i + j * this.size) * 4;
				let theta = Math.random() * Math.PI * 2;
				let r = 0.5 + 0.5 * Math.random();
				this.data[index + 0] = r * Math.cos(theta);
				this.data[index + 1] = r * Math.sin(theta);
				this.data[index + 2] = 1;
				this.data[index + 3] = 1;
			}
		}

		this.fboTexture = new THREE.DataTexture(
			this.data,
			this.size,
			this.size,
			THREE.RGBAFormat,
			THREE.FloatType
		);
		this.fboTexture.magFilter = THREE.NearestFilter;
		this.fboTexture.minFilter = THREE.NearestFilter;
		this.fboTexture.needsUpdate = true;

		this.fboMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uPositions: { value: this.fboTexture },
				uInfo: { value: null },
				uMouse: { value: new THREE.Vector2(0, 0) },
				time: { value: 0 }
			},
			vertexShader: simVertex,
			fragmentShader: simFragment
		});

		this.infoarray = new Float32Array(this.size * this.size * 4);

		for (let i = 0; i < this.size; i++) {
			for (let j = 0; j < this.size; j++) {
				let index = (i + j * this.size) * 4;
				this.infoarray[index + 0] = 0.5 + Math.random();
				this.infoarray[index + 1] = 0.5 + Math.random();
				this.infoarray[index + 2] = 1;
				this.infoarray[index + 3] = 1;
			}
		}

		this.info = new THREE.DataTexture(
			this.infoarray,
			this.size,
			this.size,
			THREE.RGBAFormat,
			THREE.FloatType
		);
		this.info.magFilter = THREE.NearestFilter;
		this.info.minFilter = THREE.NearestFilter;
		this.info.needsUpdate = true;
		this.fboMaterial.uniforms.uInfo.value = this.info;

		this.fboMesh = new THREE.Mesh(geometry, this.fboMaterial);
		this.fboScene.add(this.fboMesh);

		this.renderer.setRenderTarget(this.fbo);
		this.renderer.render(this.fboScene, this.fboCamera);
		this.renderer.setRenderTarget(this.fbo1);
		this.renderer.render(this.fboScene, this.fboCamera);
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	addObjects() {
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: { value: 0 },
				uPositions: { value: null },
				resolution: { value: new THREE.Vector4() }
			},
			// wireframe: true,
			transparent: true,
			vertexShader: vertex,
			fragmentShader: fragment
		});

		this.count = this.size ** 2;
		let geometry = new THREE.BufferGeometry();
		let positions = new Float32Array(this.count * 3);
		let uv = new Float32Array(this.count * 2);
		for (let i = 0; i < this.size; i++) {
			for (let j = 0; j < this.size; j++) {
				let index = i + j * this.size;
				positions[index * 3 + 0] = Math.random();
				positions[index * 3 + 1] = Math.random();
				positions[index * 3 + 2] = 0;
				uv[index * 2 + 0] = i / this.size;
				uv[index * 2 + 1] = j / this.size;
			}
		}

		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

		this.material.uniforms.uPositions.value = this.fboTexture;
		this.points = new THREE.Points(geometry, this.material);
		this.scene.add(this.points);
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		this.material.uniforms.time.value = this.time;
		this.fboMaterial.uniforms.time.value = this.time;
		requestAnimationFrame(this.render.bind(this));

		this.fboMaterial.uniforms.uPositions.value = this.fbo1.texture;
		this.material.uniforms.uPositions.value = this.fbo.texture;

		this.renderer.setRenderTarget(this.fbo);
		this.renderer.render(this.fboScene, this.fboCamera);
		this.renderer.setRenderTarget(null);
		this.renderer.render(this.scene, this.camera);

		// swap render targets
		let temp = this.fbo;
		this.fbo = this.fbo1;
		this.fbo1 = temp;

		// this.renderer.setRenderTarget(null);
		// this.renderer.render(this.fboScene, this.fboCamera);
	}
}

new Sketch({
	dom: document.getElementById('container')
});

<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import VertexShader from './shaders/vertex.glsl';
	import FragmentShader from './shaders/fragment.glsl';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

	$effect(() => {
		/**
		 * Base
		 */
		// Debug
		const gui = new GUI();

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();

		// Loaders
		const gltfLoader = new GLTFLoader();

		/**
		 * Sizes
		 */
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56
		};

		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;

			// Update camera
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		});

		/**
		 * Camera
		 */
		// Base camera
		const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100);
		camera.position.set(7, 7, 7);
		scene.add(camera);

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		/**
		 * Renderer
		 */
		const rendererParameters = {
			clearColor: 'black'
		};

		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setClearColor(rendererParameters.clearColor);
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		gui.addColor(rendererParameters, 'clearColor').onChange(() => {
			renderer.setClearColor(rendererParameters.clearColor);
		});

		const debugObject = {
			color: '#339ef0'
		};

		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const shaderMaterial = new THREE.ShaderMaterial({
			vertexShader: `
    uniform float edgeThickness;
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
			fragmentShader: `
    uniform vec3 edgeColor;
    varying vec3 vPosition;
    void main() {
      vec3 edgeWidth = vec3(0.05);
      vec3 absDiff = abs(vPosition);
      
      // Check if point is near cube edges
      if (
        (abs(absDiff.x - 0.5) < edgeWidth.x) ||
        (abs(absDiff.y - 0.5) < edgeWidth.y) ||
        (abs(absDiff.z - 0.5) < edgeWidth.z)
      ) {
        gl_FragColor = vec4(edgeColor, 1.0);
      } else {
        discard; // Hide interior points
      }
    }
  `,
			uniforms: {
				edgeColor: { value: new THREE.Color(1, 0, 0) },
				edgeThickness: { value: 0.05 }
			}
		});

		const points = new THREE.Points(geometry, shaderMaterial);
		// const normalBox = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
		scene.add(points);
		// scene.add(normalBox);

		/**
		 * Material
		 */
		const material = new THREE.ShaderMaterial({
			vertexShader: VertexShader,
			fragmentShader: FragmentShader,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			uniforms: {
				uTime: { value: 0 },
				uColor: { value: new THREE.Color(debugObject.color) }
			}
		});

		gui.addColor(debugObject, 'color').onChange(() => {
			material.uniforms.uColor.value.set(debugObject.color);
		});

		/**
		 * Objects
		 */
		// Torus knot
		const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32), material);
		torusKnot.position.x = 3;
		scene.add(torusKnot);

		// Sphere
		const sphere = new THREE.Mesh(new THREE.SphereGeometry(), material);
		sphere.position.x = -3;
		scene.add(sphere);

		// Suzanne
		// let suzanne: any = null;
		// gltfLoader.load('./models/WMStar/star.glb', (gltf) => {
		// 	suzanne = gltf.scene;
		// 	gltf.scene.scale.set(0.75, 0.75, 0.75);
		// 	gltf.scene.position.y = -10.5;
		// 	console.log(gltf);
		// 	suzanne.traverse((child: any) => {
		// 		if (child.isMesh) child.material = material;
		// 	});
		// 	suzanne.position.set(0, -1, 0);
		// 	scene.add(suzanne);
		// });

		/**
		 * Animate
		 */
		const clock = new THREE.Clock();

		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			// Update uniform time
			material.uniforms.uTime.value = elapsedTime;

			// Rotate objects
			// if (suzanne) {
			// 	// suzanne.rotation.x = -elapsedTime * 0.1;
			// 	suzanne.rotation.y = elapsedTime * 0.2;
			// }

			sphere.rotation.x = -elapsedTime * 0.1;
			sphere.rotation.y = elapsedTime * 0.2;

			torusKnot.rotation.x = -elapsedTime * 0.1;
			torusKnot.rotation.y = elapsedTime * 0.2;

			// Update controls
			controls.update();

			// Render
			renderer.render(scene, camera);

			// Call tick again on the next frame
			window.requestAnimationFrame(tick);
		};

		tick();
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import GUI from 'lil-gui';
	import { FontLoader, TextGeometry } from 'three/examples/jsm/Addons.js';
	import vertexShader from './shaders/vertex.glsl';
	import fragmentShader from './shaders/fragment.glsl';
	import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

	$effect(() => {
		// Base
		const gui = new GUI({ width: 325 });
		const debugObject: any = {};

		// Canvas
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

		// Scene
		const scene = new THREE.Scene();
		const scene1 = new THREE.Scene();

		const group = new THREE.Group();
		const group1 = new THREE.Group();

		scene.add(group);
		scene1.add(group1);

		group.rotation.x = Math.PI / 4;
		group1.rotation.x = -Math.PI / 4;

		const loader = new FontLoader();

		const uniforms = {
			uTime: { value: 0 },
			uResolution: { value: new THREE.Vector2() },
			uMin: { value: new THREE.Vector3(0, 0, 0) },
			uMax: { value: new THREE.Vector3(0, 0, 0) },
			uOffset: { value: 0 }
		};

		const uniforms1 = {
			uTime: { value: 0 },
			uResolution: { value: new THREE.Vector2() },
			uMin: { value: new THREE.Vector3(0, 0, 0) },
			uMax: { value: new THREE.Vector3(0, 0, 0) },
			uOffset: { value: 1 }
		};

		const getMaterial = (uniformsPara: any) => {
			const material = new THREE.MeshStandardMaterial({
				color: 0xcccccc
			});

			material.onBeforeCompile = (shader) => {
				shader.uniforms.uTime = uniformsPara.uTime;
				shader.uniforms.uMin = uniformsPara.uMin;
				shader.uniforms.uMax = uniformsPara.uMax;
				shader.uniforms.uOffset = uniformsPara.uOffset;

				shader.fragmentShader =
					`
			varying float vDiscard;
			` + shader.fragmentShader;
				shader.vertexShader =
					`
				uniform float uTime;
				uniform vec3 uMin;
				uniform vec3 uMax;
				uniform float uOffset;
				varying float vDiscard;	
				float timeSpeed = 0.05;

				mat4 rotationMatrix(vec3 axis, float angle) {
   				axis = normalize(axis);
   				float s = sin(angle);
  			 	float c = cos(angle);
  			 	float oc = 1.0 - c;
    
 			    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
				}	

				vec3 rotate(vec3 v, vec3 axis, float angle) {
					mat4 m = rotationMatrix(axis, angle);
					return (m * vec4(v, 1.0)).xyz;
				}

				float mapRange(float value, float inMin, float inMax, float outMin, float outMax) {
    			return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
				}
			` + shader.vertexShader;

				shader.vertexShader = shader.vertexShader.replace(
					`#include <beginnormal_vertex>`,
					`#include <beginnormal_vertex>` +
						`
				vec3 temp = objectNormal;
				float xx = mapRange(position.x, uMin.x, uMax.x, -1.0, 1.0);

				float theta = xx * 2.0 *PI;
				vDiscard = mod(xx + uTime + mix(-0.25, 0.25, uOffset) + uOffset*0.5, 2.0);
				temp = rotate(temp, vec3(0.0, 0.0, 1.0), theta);
				objectNormal = temp;
				`
				);

				shader.vertexShader = shader.vertexShader.replace(
					`#include <begin_vertex>`,
					`#include <begin_vertex>` +
						`
				vec3 pos = transformed;
				vec3 dir = vec3(sin(theta), cos(theta), 0.0);
   			    pos = 0.2 * dir + vec3(0.0, 0.0, pos.z) + dir * pos.y; 
				transformed = pos;
				`
				);

				shader.fragmentShader = shader.fragmentShader.replace(
					`#include <color_fragment>`,
					`#include <color_fragment>
				float dontShow = step(1.0, vDiscard);
				// if (dontShow > 0.5) discard;
				// diffuseColor.rgb = vec3(1.0, 0.0, 0.0);
				
				`
				);
			};

			return material;
		};

		loader.load('fonts/Folklore_Regular.json', function (font) {
			const geometry = new TextGeometry('IMPOSSIBLE', {
				font: font,
				size: 0.1,
				depth: 0.1,
				curveSegments: 50,
				bevelEnabled: false
			});

			const material = getMaterial(uniforms);
			const material1 = getMaterial(uniforms1);

			// const geometry = new THREE.BoxGeometry(0.5, 0.1, 0.1, 100, 100, 100);

			geometry.center();
			geometry.computeBoundingBox();

			let final1 = geometry.clone();
			final1.computeBoundingBox();

			let clones: any = [];
			for (let i = 0; i < 4; i++) {
				const clone = final1.clone();
				clone.center();
				clone.rotateX(Math.PI / 2);
				clone.translate(final1.boundingBox!.max.x * i * 2, 0, 0);
				clones.push(clone);
			}

			let superFinal = mergeGeometries(clones);
			superFinal.center();
			superFinal.computeBoundingBox();

			const text = new THREE.Mesh(superFinal, material);
			const text1 = new THREE.Mesh(superFinal, material1);

			uniforms.uMin.value = superFinal.boundingBox!.min;
			uniforms.uMax.value = superFinal.boundingBox!.max;

			uniforms1.uMin.value = superFinal.boundingBox!.min;
			uniforms1.uMax.value = superFinal.boundingBox!.max;

			scene.add(text);
			group.add(text);

			scene1.add(text1);
			group1.add(text1);
		});

		const axesHelper = new THREE.AxesHelper(5);
		scene.add(axesHelper);

		// Sizes
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight - 56,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		};

		window.addEventListener('resize', () => {
			// Update sizes
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight - 56;
			sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

			// Update camera
			// camera.aspect = sizes.width / sizes.height;
			// camera.updateProjectionMatrix();

			// Update renderer
			renderer.setSize(sizes.width, sizes.height);
			renderer.setPixelRatio(sizes.pixelRatio);
		});

		// Camera
		const frustumSize = 0.75;
		const aspect = sizes.width / sizes.height;
		const camera = new THREE.OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			0.1,
			100
		);
		camera.position.set(0, 0, 5);

		const light1 = new THREE.AmbientLight(0xffffff, 0.9);
		scene.add(light1);
		scene1.add(light1.clone());

		const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
		light2.position.set(0.0, -1, 0);
		scene.add(light2);
		scene1.add(light2.clone());

		// Controls
		const controls = new OrbitControls(camera, canvas);
		controls.enableDamping = true;

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true
		});
		renderer.setClearColor(0x444444, 1);
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
		renderer.setScissorTest(true);

		// Animate
		const clock = new THREE.Clock();
		let animationFrameId: number;
		const tick = () => {
			const elapsedTime = clock.getElapsedTime();

			uniforms.uTime.value = elapsedTime / 20;
			uniforms1.uTime.value = elapsedTime / 20;

			controls.update();

			renderer.setScissor(0, 0, sizes.width / 2, sizes.height);
			renderer.render(scene, camera);
			renderer.setScissor(sizes.width / 2, 0, sizes.width / 2, sizes.height);
			renderer.render(scene1, camera);

			// renderer.setScissor(0, 0, sizes.width, sizes.height);
			// renderer.render(scene, camera);

			animationFrameId = window.requestAnimationFrame(tick);
		};

		tick();
		return () => {
			if (gui) gui.destroy();
			if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
		};
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

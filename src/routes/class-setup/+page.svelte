<script lang="ts">
	import * as THREE from 'three';
	import Experience from '../../utils/Experince/Experience';

	$effect(() => {
		const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
		const experience = new Experience({
			canvas: canvas,
			cameraInitialPosition: new THREE.Vector3(2.5, 2.5, 10.5)
		});
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

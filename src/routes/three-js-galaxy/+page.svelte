<script lang="ts">
	import * as THREE from 'three';
	import Experience from '../../utils/Experince/Experience';

	$effect(() => {
		const canvas = document.querySelector('canvas.webgl')! as HTMLCanvasElement;

		const parameters = {
			count: 200000,
			size: 0.001,
			radius: 5,
			branches: 5,
			spin: 1,
			randomness: 0.65,
			branchSaturation: 4.3,
			centerSaturation: 4.5,
			rotationSpeed: 0.05,
			insideColor: '#318CE7',
			outsideColor: '#E3963E',
			centralStarCount: 15000
		};
		const setup = new Experience({ canvas: canvas, parameters: parameters });

		// Fullscreen functionality
		const toggleFullscreen = () => {
			if (!document.fullscreenElement) {
				canvas.requestFullscreen().catch((err) => {
					console.error(
						`Error attempting to enable full-screen mode: ${err.message} (${err.name})`
					);
				});
			} else {
				document.exitFullscreen();
			}
		};

		canvas.addEventListener('dblclick', toggleFullscreen);
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

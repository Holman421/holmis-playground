<script>
	import Experience from '../../utils/Experince/Experience';

	$effect(() => {
		const canvas = document.querySelector('.webgl');
		const experience = new Experience({ canvas: canvas });
	});
</script>

<div>
	<canvas class="webgl"></canvas>
</div>

<script lang="ts">
	import Sketch from './app.js';

	$effect(() => {
		const sketch = new Sketch({
			dom: document.getElementById('container')
		});

		return () => {
			sketch.stop();
		};
	});
</script>

<div id="container" class="w-screen h-[calc(100vh-56px)]"></div>
<div
	class="absolute left-1/2 top-1/2 text-center -translate-y-1/2 -translate-x-1/2 mt-[28px] flex flex-col items-center"
>
	<h1 class=" text-2xl font-audiowide">Ales Holman</h1>
	<div class="flex flex-col items-center mt-3">
		<div class="h-[1px] w-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
		<button
			id="explore-btn"
			class="cursor-pointer w-fit px-3 py-[2px] font-audiowide tracking-[5px]">This is sick</button
		>
		<div class="h-[1px] w-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
	</div>
</div>

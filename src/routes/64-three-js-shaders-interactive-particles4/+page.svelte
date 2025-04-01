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

<div
	id=""
	class="w-screen h-[calc(100vh-56px)] flex justify-center items-center relative overflow-hidden"
>
	<div id="container"></div>
	<div
		class="w-[600px] h-[300px] lg:w-[1200px] lg:h-[600px] flex absolute z-10"
		style="background: linear-gradient(to bottom, #070809 0%, transparent 10%, transparent 90%, #070809 100%)"
	></div>
</div>
<div
	class="absolute justify-between h-[220px] lg:h-[460px] left-1/2 top-1/2 text-center mt-[20px] lg:mt-[7.5px] -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
>
	<h1
		class="absolute top-1/2 -right-[150px] lg:-right-[350px] text-sm lg:text-2xl font-audiowide bg-black rounded-full py-1 px-2 border border-white/50 whitespace-nowrap"
	>
		Our work
	</h1>
	<h1
		class=" text-sm lg:text-2xl font-audiowide bg-black rounded-full py-2 px-4 border border-white/50 whitespace-nowrap"
	>
		Code & Technology
	</h1>
	<h1
		class=" text-sm lg:text-2xl font-audiowide bg-black rounded-full py-2 px-4 border border-white/50 whitespace-nowrap"
	>
		Art & Creativity
	</h1>
	<!-- <div class="flex flex-col items-center mt-3">
		<div class="h-[1px] w-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
		<button
			id="explore-btn"
			class="cursor-pointer w-fit px-3 py-[2px] font-audiowide tracking-[5px]">Explore</button
		>
		<div class="h-[1px] w-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
	</div> -->
</div>

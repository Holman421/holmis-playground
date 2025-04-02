<script lang="ts">
	import Sketch from './app.js';
	import Button from './button.svelte';

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
		style="background: linear-gradient(to bottom, #070809 0%, transparent 10%, transparent 90%, #070809 100%), linear-gradient(to left, #070809 0%, transparent 10%, transparent 90%, #070809 100%)"
	>
		<div
			class="absolute size-full justify-between left-1/2 top-1/2 text-center -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
		>
			<Button text="Your company" class_="top-1/2 left-1/2 -translate-x-1/2" />
			<Button text="Value 1" class_="top-[40px] lg:top-[85px] left-[120px] lg:left-[210px]" />
			<Button text="Value 2" class_="top-[40px] lg:top-[85px] right-[120px] lg:right-[210px]" />
			<Button text="Value 3" class_="bottom-[30px] lg:bottom-[70px] left-[120px] lg:left-[210px]" />
			<Button
				text="Value 4"
				class_="bottom-[30px] lg:bottom-[70px] right-[120px] lg:right-[210px]"
			/>
		</div>
	</div>
</div>

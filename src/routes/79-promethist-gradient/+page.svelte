<script lang="ts">
	import Sketch from './app';

	$effect(() => {
		const containerElement = document.getElementById(
			'container'
		) as HTMLElement;
		if (!containerElement) {
			console.error('Container element not found');
			return;
		}

		const sketch = new Sketch({
			dom: containerElement
		});

		return () => {
			sketch.stop();
		};
	});
</script>

<div class="max-w-screen flex flex-col w-full relative">
	<div id="container" class="fixed w-screen h-screen top-0"></div>

	<div
		class="w-full text-xl relative z-[2] border h-screen border-black text-black flex justify-center items-center"
	>
		First section
	</div>
	<div
		class="w-full text-xl relative z-[2] border h-screen border-black text-black flex justify-center items-center"
	>
		Second section
	</div>
	<div
		class="w-full text-xl relative z-[2] border h-screen border-black text-black flex justify-center items-center"
	>
		Third section
	</div>
</div>

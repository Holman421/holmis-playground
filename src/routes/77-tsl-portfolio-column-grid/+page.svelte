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

<div id="container" class="w-screen h-[calc(100vh-56px)]"></div>

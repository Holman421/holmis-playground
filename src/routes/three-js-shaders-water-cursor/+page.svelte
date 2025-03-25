<script lang="ts">
	import Sketch from './utils';

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

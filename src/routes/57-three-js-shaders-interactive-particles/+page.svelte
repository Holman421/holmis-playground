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
<h1 class="absolute left-[33%] top-[42.5%] -translate-y-1/2 text-7xl font-audiowide">
	Ales <span class="ml-12">Holman</span>
</h1>

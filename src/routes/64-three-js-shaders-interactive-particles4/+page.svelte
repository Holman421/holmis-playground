<script lang="ts">
	import Sketch from './app.js';
	import Button from './button.svelte';

	let mouseX = $state(0);
	let mouseY = $state(0);
	let isMobile = $state(true);
	let mounted = $state(false);

	$effect(() => {
		mounted = true;
		const checkMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	function handleMouseMove(event: MouseEvent) {
		if (!isMobile) {
			const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
			mouseX = event.clientX - rect.left - rect.width / 2;
			mouseY = event.clientY - rect.top - 35;
		} else {
			mouseX = 0;
			mouseY = 200;
		}
	}

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
		role="presentation"
		onmousemove={handleMouseMove}
	>
		<div
			class="absolute size-full justify-between left-1/2 top-1/2 text-center -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
		>
			<Button
				text="Wonder Makers"
				width="w-[150px] lg:w-[200px]"
				class_=""
				style="transform: translate3d({mounted && !isMobile ? mouseX : 0}px, {mounted && !isMobile
					? mouseY
					: 130}px, 0)"
			/>
			<Button text="Code" class_="top-[30px] lg:top-[85px] left-[110px] lg:left-[210px]" />
			<Button text="Design" class_="top-[30px] lg:top-[85px] right-[110px] lg:right-[210px]" />
			<Button text="Art" class_="bottom-[25px] lg:bottom-[70px] left-[110px] lg:left-[210px]" />
			<Button
				text="Innovation"
				class_="bottom-[25px] lg:bottom-[70px] right-[110px] lg:right-[210px]"
			/>
		</div>
	</div>
</div>

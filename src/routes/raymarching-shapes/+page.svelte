<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	import GUI from 'lil-gui';

	let containerElement: HTMLDivElement;
	const filterId = `goo-${crypto.randomUUID()}`;

	// GUI controls
	const params = {
		filterStrength: 22.5
	};

	function getRandomPosition() {
		const radius = 100;
		const angle = Math.random() * Math.PI * 2;
		return {
			x: Math.cos(angle) * radius * Math.random(),
			y: Math.sin(angle) * radius * Math.random()
		};
	}

	onMount(() => {
		// Setup GUI
		const gui = new GUI();
		gui.add(params, 'filterStrength', 1, 50).onChange((value: number) => {
			const filterElement = containerElement.querySelector(`#${filterId} feGaussianBlur`);
			if (filterElement) {
				filterElement.setAttribute('stdDeviation', value.toString());
			}
		});

		// Updated filter with improved quality
		const filter = `
            <svg style="visibility: hidden; position: absolute;" width="0" height="0" xmlns="http://www.w3.org/2000/svg" version="1.1">
                <defs>
                    <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="${params.filterStrength}" result="blur" />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -10"
                            result="goo"
                        />
                        <feBlend in="SourceGraphic" in2="goo" mode="normal" result="blend" />
                        <feComposite in="blend" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>
        `;

		containerElement.insertAdjacentHTML('beforeend', filter);

		// Updated GSAP animations
		const circles = containerElement.querySelectorAll('.circle');

		circles.forEach((circle) => {
			function animate() {
				const pos = getRandomPosition();
				gsap.to(circle, {
					x: pos.x * 1.5,
					y: pos.y * 1.5,
					duration: 1.5 + Math.random() * 0.5,
					ease: 'power1.inOut',
					onComplete: animate
				});
			}
			animate();
		});

		return () => {
			gsap.killTweensOf(circles);
			gui.destroy();
		};
	});
</script>

<div class="flex-1 relative bg-slate-900">
	<div
		bind:this={containerElement}
		class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-32"
	>
		<div style="filter: url(#{filterId})" class="goo-container">
			<div class="circle size-[5rem] bg-white rounded-full absolute"></div>
			<div class="circle size-[6.25rem] bg-white rounded-full absolute"></div>
			<div class="circle size-[7.5rem] bg-white rounded-full absolute"></div>
		</div>
	</div>
</div>

<style>
	.goo-container {
		width: 100%;
		height: 100%;
		position: relative;
	}
</style>

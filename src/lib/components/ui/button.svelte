<script lang="ts">
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	export let variant: 'default' | 'active' = 'default';
	export let onClick: () => void;

	let buttonWrapper: HTMLDivElement;
	let gooEffect = tweened(0, {
		duration: 300,
		easing: cubicOut
	});

	// Generate unique ID for this instance
	const uniqueId = crypto.randomUUID();
	const borderFilterId = `border-${uniqueId}`;
	const gooFilterId = `goo-${uniqueId}`;

	onMount(() => {
		const buttonElement = buttonWrapper.querySelector(`#button-${uniqueId}`) as HTMLDivElement;
		const buttonGooEffect = buttonWrapper.querySelector(
			`#buttonGooEffect-${uniqueId}`
		) as HTMLDivElement;

		const gooFilter = `
			<svg style="visibility: hidden; position: absolute;" width="0" height="0" xmlns="http://www.w3.org/2000/svg" version="1.1">
				<defs>
					<filter id="${gooFilterId}">
						<feGaussianBlur in="SourceGraphic" stdDeviation="${$gooEffect}" result="blur" />
						<feColorMatrix
							in="blur"
							mode="matrix"
							values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
							result="goo"
						/>
						<feComposite in="SourceGraphic" in2="goo" operator="atop" />
					</filter>
				</defs>
			</svg>
		`;

		const borderFilter = `
			<svg width="0" height="0">
				<filter id="${borderFilterId}" x="-50%" y="-50%" width="200%" height="200%">
					<feMorphology operator="dilate" radius="1" in="SourceAlpha" result="expanded" />
					<feFlood flood-color="#a6a8b1" result="color" />
					<feComposite in="color" in2="expanded" operator="in" result="border" />
					<feMerge>
						<feMergeNode in="border" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</svg>
		`;

		// Append filters to the wrapper
		buttonWrapper.insertAdjacentHTML('beforeend', gooFilter);
		buttonWrapper.insertAdjacentHTML('beforeend', borderFilter);

		// Apply filters
		if (buttonElement) {
			buttonElement.style.filter = `url('#${borderFilterId}')`;
		}
		if (buttonGooEffect) {
			buttonGooEffect.style.filter = `url('#${gooFilterId}')`;
		}

		// Update goo effect on hover
		const updateGooFilter = (value: number) => {
			const filter = buttonWrapper.querySelector(`#${gooFilterId} feGaussianBlur`);
			if (filter) {
				filter.setAttribute('stdDeviation', value.toString());
			}
		};

		// Subscribe to gooEffect changes
		const unsubscribe = gooEffect.subscribe((value) => {
			updateGooFilter(value);
		});

		buttonWrapper.addEventListener('mouseenter', () => {
			gooEffect.set(5);
		});

		buttonWrapper.addEventListener('mouseleave', () => {
			gooEffect.set(0);
		});

		return () => {
			unsubscribe();
		};
	});
</script>

<div bind:this={buttonWrapper}>
	<div id="button-{uniqueId}">
		<div id="buttonGooEffect-{uniqueId}">
			<button
				class={`py-2 px-4 transition-colors ${
					variant === 'active' ? 'bg-white text-black' : 'bg-black text-white'
				}`}
				on:click={onClick}
				id="button"
			>
				<slot />
			</button>
		</div>
	</div>
</div>

<style>
	#button {
		clip-path: polygon(
			0 0.5rem,
			0.5rem 0,
			calc(100% - 0.5rem) 0,
			100% 0.5rem,
			100% calc(100% - 0.5rem),
			calc(100% - 0.5rem) 100%,
			0.5rem 100%,
			0 calc(100% - 0.5rem)
		);
	}
</style>

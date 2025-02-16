<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	const { title, description, href, technologies, imgSrc } = $props<{
		title: string;
		description: string;
		href: string;
		technologies: string[];
		imgSrc: string;
	}>();

	let cardElement: HTMLDivElement;
	let gooEffect = tweened(0, {
		duration: 300,
		easing: cubicOut
	});

	// Generate unique IDs for this instance
	const uniqueId = crypto.randomUUID();
	const gooFilterId = `goo-${uniqueId}`;
	const borderFilterId = `border-${uniqueId}`;

	onMount(() => {
		const cardBorderEffect = cardElement.querySelector(
			`#cardBorderEffect-${uniqueId}`
		) as HTMLDivElement;
		const cardGooEffect = cardElement.querySelector(`#cardGooEffect-${uniqueId}`) as HTMLDivElement;

		// Create and append filters dynamically
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

		// Append filters to the card element
		cardElement.insertAdjacentHTML('beforeend', gooFilter);
		cardElement.insertAdjacentHTML('beforeend', borderFilter);

		// Update filter references
		if (cardBorderEffect) {
			cardBorderEffect.style.filter = `url('#${borderFilterId}')`;
		}
		if (cardGooEffect) {
			cardGooEffect.style.filter = `url('#${gooFilterId}')`;
		}

		// Update goo effect on hover
		const updateGooFilter = (value: number) => {
			const filter = cardElement.querySelector(`#${gooFilterId} feGaussianBlur`);
			if (filter) {
				filter.setAttribute('stdDeviation', value.toString());
			}
		};

		// Subscribe to gooEffect changes
		const unsubscribe = gooEffect.subscribe((value) => {
			updateGooFilter(value);
		});

		cardElement.addEventListener('mouseenter', () => {
			gooEffect.set(10);
		});

		cardElement.addEventListener('mouseleave', () => {
			gooEffect.set(1);
		});

		return () => {
			unsubscribe();
		};
	});
</script>

<div bind:this={cardElement} id="projectCardWrapper">
	<a {href}>
		<div id="cardBorderEffect-{uniqueId}">
			<div id="cardGooEffect-{uniqueId}">
				<div
					id="projectCard"
					class="px-5 pt-5 pb-0 sm:pb-6 w-[350px] h-auto sm:w-[400px] sm:h-[200px] relative"
				>
					<div class="flex flex-col gap-4 h-full">
						<h3 class="main-text font-audiowide">{title}</h3>
						<div class="flex justify-between">
							<p class="secondary-text font-exo2 w-[60%]">{description}</p>
							<div class="w-[38%] aspect-square translate-x-3 -translate-y-2">
								<img
									src={imgSrc}
									alt="Project thumbnail"
									class="object-fill w-full h-full"
									style="mask-image: radial-gradient(ellipse at center, black 95%, transparent 70%);"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</a>
</div>

<style>
	#projectCard {
		clip-path: polygon(
			0 1.5rem,
			1rem 0.5rem,
			3rem 0.5rem,
			3.5rem 0,
			6.5rem 0,
			7rem 0.5rem,
			calc(100% - 5rem) 0.5rem,
			calc(100% - 4.5rem) 1rem,
			calc(100% - 4.5rem) 2.5rem,
			calc(100% - 4rem) 3rem,
			calc(100% - 0.5rem) 3rem,
			100% 3.5rem,
			100% calc(100% - 0.5rem),
			calc(100% - 0.5rem) 100%,
			calc(100% - 9rem) calc(100% - 0rem),
			calc(100% - 9.5rem) calc(100% - 0.5rem),
			calc(100% - 13rem) calc(100% - 0.5rem),
			calc(100% - 13.5rem) calc(100% - 0rem),
			3rem calc(100% - 0rem),
			2.5rem 100%,
			1rem 100%,
			0 calc(100% - 1rem)
		);
		background: black;
	}
</style>

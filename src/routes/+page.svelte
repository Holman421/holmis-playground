<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Layout from './+layout.svelte';

	const projects = [
		{
			href: '/svelte-todo',
			title: 'Todo flip',
			description: 'Simple todo app with Svelte and gsap flip aniamtion',
			technologies: ['Svetle', 'GSAP', 'GSAP-Flip', 'Svelte-state']
		},
		{
			href: '/flip',
			title: 'Flip 2',
			description: 'Training with flip animation',
			technologies: ['Svetle', 'GSAP', 'GSAP-Flip', 'Svelte-state']
		},
		{
			href: '/training-store',
			title: 'Svelte stores',
			description: 'Very simple counter with utilization of Svelte stores',
			technologies: ['Svelte', 'Svelte-stores']
		},
		{
			href: '/three-js-lights',
			title: 'Three.js Lights',
			description: 'Training with Three.js lights and GUI',
			technologies: ['Three.js', 'Lights', 'Three.js GUI']
		},
		{
			href: '/three-js-hounted-house',
			title: 'Three.js Hounted house',
			description: 'Bigger Three.js project with textures and geometries',
			technologies: ['Three.js', 'Textures', 'Geometries']
		},
		{
			href: '/three-js-particles',
			title: 'Three.js Matrix',
			description: 'Simple training of rendering particles in Matrix style',
			technologies: ['Three.js', 'Particles']
		},
		{
			href: '/three-js-galaxy',
			title: 'Three.js Galaxy generator',
			description: 'Bigger Three.js project with particles',
			technologies: ['Three.js', 'Particles', 'GUI', 'Trigonometry']
		}
	];

	const gooEffect = 3;

	$effect(() => {});
</script>

<div
	class="text-black mx-auto flex gap-4 flex-wrap w-full justify-center p-4 bg-black/90 min-h-[calc(100vh-56px)]"
>
	{#each projects as { href, title, description, technologies }}
		<ProjectCard {href} {title} {description} {technologies} />
	{/each}

	<svg
		style="visibility: hidden; position: absolute;"
		width="0"
		height="0"
		xmlns="http://www.w3.org/2000/svg"
		version="1.1"
	>
		<defs>
			<filter id="goo">
				<feGaussianBlur in="SourceGraphic" stdDeviation={gooEffect.toString()} result="blur" />
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

	<svg width="0" height="0">
		<filter id="borderSVG" x="-50%" y="-50%" width="200%" height="200%">
			<!-- Expand the border area -->
			<feMorphology operator="dilate" radius="2" in="SourceAlpha" result="expanded" />

			<!-- Fill the border area with solid red -->
			<feFlood flood-color="white" result="color" />

			<!-- Apply the red color to the expanded area -->
			<feComposite in="color" in2="expanded" operator="in" result="border" />

			<!-- Merge the red border with the original content -->
			<feMerge>
				<feMergeNode in="border" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</svg>
</div>

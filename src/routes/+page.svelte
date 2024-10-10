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
</script>

<div class="text-black mx-auto flex gap-4 mt-10 flex-wrap">
	{#each projects as { href, title, description, technologies }}
		<ProjectCard {href} {title} {description} {technologies} />
	{/each}
</div>

<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Layout from './+layout.svelte';

	const projects = [
		{
			href: '/svelte-todo',
			text: 'Todo training',
			technologies: ['Svetle', 'GSAP', 'GSAP-Flip', 'Svelte-state']
		},
		{
			href: '/flip',
			text: 'Flip 2',
			technologies: ['Svetle', 'GSAP', 'GSAP-Flip', 'Svelte-state']
		},
		{
			href: '/training-store',
			text: 'Svelte global state',
			technologies: ['Svelte', 'Svelte-stores']
		},
		{
			href: '/three-js-lights',
			text: 'Three.js Lights',
			technologies: ['Three.js', 'Lights', 'Three.js GUI']
		},
		{ href: '/three-js-hounted-house', text: 'Three.js Hounted house', technologies: ['Three.js'] },
		{ href: '/three-js-particles', text: 'Three.js Particles Matrix', technologies: ['Three.js'] },
		{ href: '/three-js-galaxy', text: 'Three.js Galaxy particles', technologies: ['Three.js'] }
	];
</script>

<div class="text-black mx-auto flex gap-4 mt-10 flex-wrap">
	{#each projects as { href, text, technologies }}
		<ProjectCard {href} title={text} {technologies} />
	{/each}
</div>

<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Layout from './+layout.svelte';
	import { projects } from '$lib/data/projects';
	import gsap from 'gsap';

	$effect(() => {
		const cards = document.querySelectorAll('#projectCardWrapper');
		console.log(cards);
		gsap.fromTo(
			cards,
			{
				opacity: 0,
				y: 50
			},
			{
				opacity: 1,
				y: 0,
				ease: 'back.out(1.2)',
				stagger: {
					amount: 0.3,
					from: 'start'
				}
			}
		);
	});

	const filteredProjects = projects.filter((project) => project.shared);
</script>

<div class="text-black mx-auto mt-10 flex gap-8 flex-wrap w-full justify-center p-4">
	{#each filteredProjects as { href, title, description, technologies }}
		<ProjectCard {href} {title} {description} {technologies} />
	{/each}
</div>

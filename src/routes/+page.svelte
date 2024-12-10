<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { projects } from '$lib/data/projects';
	import gsap from 'gsap';

	$effect(() => {
		const cards = document.querySelectorAll('#projectCardWrapper');
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

	let showAllProjects = $state(false);

	const filteredProjects = projects.filter((project) => project.shared);
	const allProjects = projects;
	let currentProjects = $derived(() => (showAllProjects ? allProjects : filteredProjects));
</script>

<div class="w-full flex justify-center mt-10">
	<button
		class="border py-2 px-4"
		onclick={() => {
			showAllProjects = !showAllProjects;
		}}>{showAllProjects ? 'Show only representable projects' : 'Show all projects'}</button
	>
</div>
<div class="text-black mx-auto mt-10 flex gap-8 flex-wrap w-full justify-center p-4">
	{#each currentProjects() as { href, title, description, technologies }}
		<ProjectCard {href} {title} {description} {technologies} />
	{/each}
</div>

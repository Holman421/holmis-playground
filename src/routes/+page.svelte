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
	let showNextTuesdayProjects = $state(false);

	const filteredProjects = projects.filter((project) => project.shared);
	const projectsForNextTuesday = projects.filter((project) => project.isForNextTuesday);
	const allProjects = projects;
	let currentProjects = $derived(() => {
		if (showNextTuesdayProjects) {
			return projectsForNextTuesday;
		} else if (showAllProjects) {
			return allProjects;
		} else {
			return filteredProjects;
		}
	});
</script>

<div class="w-full flex justify-center mt-10 gap-5">
	<button
		class="border py-2 px-4"
		onclick={() => {
			showAllProjects = !showAllProjects;
			showNextTuesdayProjects = false;
		}}>{showAllProjects ? 'Show only representable projects' : 'Show all projects'}</button
	>
	<button
		class="border py-2 px-4"
		onclick={() => {
			showNextTuesdayProjects = !showNextTuesdayProjects;
			showAllProjects = false;
		}}>{showNextTuesdayProjects ? 'Show representable projects' : 'Show new projects'}</button
	>
</div>
<div class="text-black mx-auto mt-10 flex gap-8 flex-wrap w-full justify-center p-4">
	{#each currentProjects() as { href, title, description, technologies }}
		<ProjectCard {href} {title} {description} {technologies} />
	{/each}
</div>

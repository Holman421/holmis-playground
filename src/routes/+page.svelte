<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { projects } from '$lib/data/projects';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
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

	// Initialize state from URL parameters
	let showAllProjects = $state($page.url.searchParams.get('view') === 'all');
	let showNextTuesdayProjects = $state($page.url.searchParams.get('view') === 'next');

	function updateURL(view: string | null) {
		const url = new URL(window.location.href);
		if (view) {
			url.searchParams.set('view', view);
		} else {
			url.searchParams.delete('view');
		}
		goto(url.toString(), { replaceState: true });
	}

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
	<Button
		variant={showAllProjects ? 'active' : 'default'}
		onClick={() => {
			showAllProjects = true;
			showNextTuesdayProjects = false;
			updateURL('all');
		}}
	>
		All projects
	</Button>
	<Button
		variant={!showAllProjects && !showNextTuesdayProjects ? 'active' : 'default'}
		onClick={() => {
			showAllProjects = false;
			showNextTuesdayProjects = false;
			updateURL(null);
		}}
	>
		Representable projects
	</Button>
	<Button
		variant={showNextTuesdayProjects ? 'active' : 'default'}
		onClick={() => {
			showNextTuesdayProjects = true;
			showAllProjects = false;
			updateURL('next');
		}}
	>
		New projects
	</Button>
</div>
<div class="text-black mx-auto mt-10 flex gap-8 flex-wrap w-full justify-center p-4">
	{#each currentProjects() as { href, title, description, technologies, imgSrc }}
		<ProjectCard {href} {title} {description} {technologies} {imgSrc} />
	{/each}
</div>

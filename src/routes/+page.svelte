<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { projects } from '$lib/data/projects';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import gsap from 'gsap';

	// Helper function to determine media type from file extension
	function getMediaType(src: string): 'image' | 'video' {
		const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
		const lowerSrc = src.toLowerCase();
		return videoExtensions.some((ext) => lowerSrc.endsWith(ext)) ? 'video' : 'image';
	}

	// Mobile detection
	let isMobile = $state(false);

	// Check if device is mobile on component mount
	function checkMobile() {
		isMobile = window.innerWidth <= 768;
	}

	// Run on mount and when window resizes
	$effect(() => {
		checkMobile();

		const handleResize = () => {
			checkMobile();
		};

		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	// Transform video URLs to static image URLs for mobile
	function getOptimizedSrc(src: string): string {
		if (isMobile && src.toLowerCase().endsWith('.mp4')) {
			return src.replace('.mp4', '.png');
		}
		return src;
	}

	// Reactive state
	let showAllProjects = $state($page.url.searchParams.get('view') === 'all');
	let showNextTuesdayProjects = $state($page.url.searchParams.get('view') === 'next');

	// Filtered project lists
	const filteredProjects = projects.filter((p) => p.shared);
	const projectsForNextTuesday = projects.filter((p) => p.isForNextTuesday);
	const allProjects = projects;

	// Derived reactive projects
	const currentProjects = $derived(
		showNextTuesdayProjects
			? projectsForNextTuesday
			: showAllProjects
				? allProjects
				: filteredProjects
	);

	// Animation effect (re-runs when filters change)
	// $effect(() => {
	// 	// Track filter states to trigger re-runs
	// 	showAllProjects;
	// 	showNextTuesdayProjects;

	// 	const cards = document.querySelectorAll('.project-card'); // Use a class instead of ID
	// 	const animation = gsap.fromTo(
	// 		cards,
	// 		{ opacity: 0, y: 50 },
	// 		{
	// 			opacity: 1,
	// 			y: 0,
	// 			ease: 'back.out(1.2)',
	// 			stagger: { each: 0.05, from: 'start' },
	// 			duration: 0.5
	// 		}
	// 	);

	// 	return () => animation.kill(); // Cleanup
	// });

	// Update URL and state
	function updateURL(view: string | null) {
		const url = new URL(window.location.href);
		view ? url.searchParams.set('view', view) : url.searchParams.delete('view');
		goto(url.toString(), { replaceState: true });
	}
</script>

<div class="w-full flex justify-center mt-10 gap-5 flex-col sm:flex-row items-center relative">
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
	<div class="absolute top-auto -bottom-10 translate-x-1/2 right-1/2">
		Project Counter: {currentProjects.length}
	</div>
</div>

<!-- Animated project grid -->
<div class="text-black mx-auto mt-16 flex gap-8 flex-wrap w-full justify-center p-4">
	{#each currentProjects as { href, title, description, technologies, imgSrc, usedInRealProject }}
		<ProjectCard
			{href}
			{title}
			{description}
			{technologies}
			usedInRealProject={usedInRealProject ?? false}
		>
			{#if getMediaType(getOptimizedSrc(imgSrc)) === 'video'}
				<video src={getOptimizedSrc(imgSrc)} muted loop preload="metadata"></video>
			{:else}
				<img src={getOptimizedSrc(imgSrc)} alt="Project thumbnail" />
			{/if}
		</ProjectCard>
	{/each}
</div>

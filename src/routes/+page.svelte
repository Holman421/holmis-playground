<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { projects } from '$lib/data/projects';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	function getMediaType(src: string): 'image' | 'video' {
		const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
		const lowerSrc = src.toLowerCase();
		return videoExtensions.some((ext) => lowerSrc.endsWith(ext))
			? 'video'
			: 'image';
	}

	let isMobile = $state(false);

	function checkMobile() {
		isMobile = window.innerWidth <= 768;
	}

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

	function getOptimizedSrc(src: string): string {
		if (isMobile && src.toLowerCase().endsWith('.mp4')) {
			return src.replace('.mp4', '.png');
		}
		return src;
	}

	let showAllProjects = $state($page.url.searchParams.get('view') === 'all');

	const filteredProjects = projects.filter((p) => p.shared);
	const allProjects = projects;

	const currentProjects = $derived(
		showAllProjects ? allProjects : filteredProjects
	);

	function updateURL(view: string | null) {
		const url = new URL(window.location.href);
		view ? url.searchParams.set('view', view) : url.searchParams.delete('view');
		goto(url.toString(), { replaceState: true });
	}
</script>

<div
	class="w-full flex justify-center mt-10 gap-5 flex-col sm:flex-row items-center relative"
>
	<Button
		variant={showAllProjects ? 'active' : 'default'}
		onClick={() => {
			showAllProjects = true;
			updateURL('all');
		}}
	>
		All projects
	</Button>
	<Button
		variant={!showAllProjects ? 'active' : 'default'}
		onClick={() => {
			showAllProjects = false;
			updateURL(null);
		}}
	>
		Representable projects
	</Button>
	<div class="absolute top-auto -bottom-10 translate-x-1/2 right-1/2">
		Project Counter: {currentProjects.length}
	</div>
</div>

<div
	class="text-black mx-auto mt-16 flex gap-8 flex-wrap w-full justify-center p-4"
>
	{#each currentProjects as { href, date, title, description, technologies, imgSrc, usedInRealProject }}
		<ProjectCard
			{href}
			{title}
			{description}
			{technologies}
			{date}
			usedInRealProject={usedInRealProject ?? false}
		>
			{#if getMediaType(getOptimizedSrc(imgSrc)) === 'video'}
				<video src={getOptimizedSrc(imgSrc)} muted loop preload="metadata"
				></video>
			{:else}
				<img src={getOptimizedSrc(imgSrc)} alt="Project thumbnail" />
			{/if}
		</ProjectCard>
	{/each}
</div>

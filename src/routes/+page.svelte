<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import LazyMedia from '$lib/components/LazyMedia.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { projects } from '$lib/data/projects';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import AboutMeCard from '$lib/components/AboutMeCard.svelte';

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

	type Section = 'all' | 'representable' | 'about';

	let activeSection = $state<Section>(
		(() => {
			const view = $page.url.searchParams.get('view');
			if (view === 'all' || view === 'about') return view;
			return 'representable';
		})()
	);

	const sections: { id: Section; label: string }[] = [
		{ id: 'all', label: 'All projects' },
		{ id: 'representable', label: 'Representable projects' },
		{ id: 'about', label: 'About me' }
	];

	const filteredProjects = projects.filter((p) => p.shared);
	const allProjects = projects;

	const currentProjects = $derived(
		activeSection === 'all'
			? allProjects
			: activeSection === 'representable'
				? filteredProjects
				: []
	);

	function updateURL(view: string | null) {
		const url = new URL(window.location.href);
		view ? url.searchParams.set('view', view) : url.searchParams.delete('view');
		goto(url.toString(), { replaceState: true });
	}

	function setSection(section: Section) {
		activeSection = section;
		if (section === 'representable') updateURL(null);
		else updateURL(section);
	}

	function variantFor(section: Section) {
		return activeSection === section ? 'active' : 'default';
	}
</script>

<div
	class="w-full flex justify-center mt-10 gap-5 flex-col sm:flex-row items-center relative"
>
	{#each sections as { id, label }}
		<Button variant={variantFor(id)} onClick={() => setSection(id)}>
			{label}
		</Button>
	{/each}
	{#if activeSection !== 'about'}
		<div class="absolute top-auto -bottom-10 translate-x-1/2 right-1/2">
			Project Counter: {currentProjects.length}
		</div>
	{/if}
</div>

<div
	class="text-black mx-auto mt-16 flex gap-8 flex-wrap w-full justify-center p-4"
>
	{#if activeSection !== 'about'}
		{#each currentProjects as { href, date, title, description, technologies, imgSrc, usedInRealProject }, index}
			<ProjectCard
				{href}
				{title}
				{description}
				{technologies}
				{date}
				usedInRealProject={usedInRealProject ?? false}
			>
				<LazyMedia
					src={getOptimizedSrc(imgSrc)}
					mediaType={getMediaType(getOptimizedSrc(imgSrc))}
					alt="Project thumbnail"
					{index}
				/>
			</ProjectCard>
		{/each}
	{:else}
		<div><AboutMeCard /></div>
	{/if}
</div>

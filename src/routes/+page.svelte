<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Layout from './+layout.svelte';
	import { projects } from '$lib/data/projects';
	const gooEffect = 3;

	$effect(() => {});
</script>

<div class="text-black mx-auto flex gap-8 flex-wrap w-full justify-center p-4">
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
			<feMorphology operator="dilate" radius="2" in="SourceAlpha" result="expanded" />
			<feFlood flood-color="white" result="color" />
			<feComposite in="color" in2="expanded" operator="in" result="border" />
			<feMerge>
				<feMergeNode in="border" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</svg>
</div>

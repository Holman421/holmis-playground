<script lang="ts">
	import Badge from './ui/badge/badge.svelte';
	import Button from './ui/button/button.svelte';
	import Card from './ui/card/card.svelte';

	const { title, description, href, technologies } = $props<{
		title: string;
		description: string;
		href: string;
		technologies: string[];
	}>();
</script>

<Card>
	<div class="px-6 py-4 max-w-[300px]">
		<div class="font-bold text-xl mb-2">{title}</div>
		<div>
			<p class="text-gray-700 text-base mt-4">{description}</p>
		</div>
		<div class="flex gap-2 mt-4 flex-wrap">
			{#each technologies as technology}
				<Badge variant="outline">{technology}</Badge>
			{/each}
		</div>
	</div>
	<div class="px-6 py-4">
		<a {href}>
			<Button>View project</Button>
		</a>
	</div>
</Card>

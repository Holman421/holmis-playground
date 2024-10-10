<script lang="ts">
	import '../app.css';
	import { getCounterState, setCounterState } from '../stores/store.svelte';

	setCounterState();

	$effect(() => {
		getCounterState().restoreFromLocalStorage();
	});
</script>

<div class="w-full min-h-screen flex flex-col">
	<nav class="bg-neutral-600 h-[56px] flex justify-center items-center">
		<a href="/">
			<h1 class="font-bold text-2xl text-white">Holmis Playground</h1>
		</a>
	</nav>

	<slot class="flex-1" />
</div>

<style>
</style>

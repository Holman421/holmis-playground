<script lang="ts">
	import '../app.css';
	import { getCounterState, setCounterState } from '../stores/store.svelte';

	setCounterState();

	$effect(() => {
		getCounterState().restoreFromLocalStorage();
	});
</script>

<div class="w-full min-h-screen flex flex-col">
	<nav class="h-[56px] flex justify-center items-center border-[#a6a8b1] border-b">
		<a href="/">
			<h1 class="font-bold text-2xl font-audiowide">Holmis Playground</h1>
		</a>
	</nav>

	<slot class="flex-1" />
</div>

<style>
</style>

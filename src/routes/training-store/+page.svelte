<script lang="ts">
	import Decrement from '$lib/components/Decrement.svelte';
	import Increment from '$lib/components/Increment.svelte';
	import { getCounterState } from '../../stores/store.svelte';
	const counterState = getCounterState();

	$effect(() => {
		console.log('counterState', counterState);
	});
</script>

<div>
	<Increment />
	{counterState.getCount()}
	<Decrement />
</div>

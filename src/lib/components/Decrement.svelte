<script lang="ts">
	import { getCounterState } from '../../stores/store.svelte';

	const counterState = getCounterState();
</script>

<button onclick={() => counterState.decrement()} class="border">Decrement</button>

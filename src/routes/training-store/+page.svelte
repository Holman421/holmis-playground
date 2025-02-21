<script lang="ts">
	import { getCounterState } from '../../stores/store.svelte';
</script>

<svg
	style="visibility: hidden; position: absolute;"
	width="0"
	height="0"
	xmlns="http://www.w3.org/2000/svg"
	version="1.1"
>
	<defs>
		<filter id="roundedFilter">
			<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
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

<div class="mt-20 m-auto flex justify-center items-center bg-white w-[400px] h-[200px] relative">
	<div style="filter: url(#roundedFilter);">
		<button
			class="bg-black text-white py-5 px-7 rounded-xl uppercase [clip-path:polygon(2rem_0%,_100%_0,_100%_100%,_0_100%,_0_2rem)]"
		>
			start building
		</button>
	</div>
</div>

<style>
	button {
		position: relative;
		z-index: 1;
	}
</style>

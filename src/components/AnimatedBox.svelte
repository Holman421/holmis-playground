<script lang="ts">
	export let cols = 1;
	export let rows = 1;
</script>

<div
	class="animated-box relative overflow-hidden w-full h-full"
	style="grid-column: span {cols}; grid-row: span {rows}"
>
	<div class="layer-1 w-full h-full">
		<div class="top-side w-full h-1/2 bg-[#070809] z-30 absolute left-0 top-0"></div>
		<div class="left-side w-1/2 h-full bg-[#070809] z-30 absolute left-0 top-0"></div>
		<div class="bottom-side w-full h-1/2 bg-[#070809] z-30 absolute left-0 bottom-0"></div>
		<div class="right-side w-1/2 h-full bg-[#070809] z-30 absolute right-0 top-0"></div>
	</div>
	<div class="layer-2 w-full h-full">
		<div class="top-side w-full h-1/2 bg-blue-700 absolute z-20 left-0 top-0"></div>
		<div class="left-side w-1/2 h-full bg-blue-700 absolute z-20 left-0 top-0"></div>
		<div class="bottom-side w-full h-1/2 bg-blue-700 absolute z-20 left-0 bottom-0"></div>
		<div class="right-side w-1/2 h-full bg-blue-700 absolute z-20 right-0 top-0"></div>
	</div>
	<div class="layer-3 w-full h-full">
		<div class="top-side w-full h-1/2 bg-blue-200 absolute z-10 left-0 top-0"></div>
		<div class="left-side w-1/2 h-full bg-blue-200 absolute z-10 left-0 top-0"></div>
		<div class="bottom-side w-full h-1/2 bg-blue-200 absolute z-10 left-0 bottom-0"></div>
		<div class="right-side w-1/2 h-full bg-blue-200 absolute z-10 right-0 top-0"></div>
	</div>
</div>

<script lang="ts">
	export let text: string;
	export let class_: string = '';
</script>

<h1
	class="absolute w-[140px] lg:w-[250px] -translate-y-1/2 text-sm lg:text-2xl font-audiowide bg-black rounded-full py-1 px-3 lg:py-2 lg:px-4 border border-white/50 whitespace-nowrap {class_}"
>
	{text}
</h1>

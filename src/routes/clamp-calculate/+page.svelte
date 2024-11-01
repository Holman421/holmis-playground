<script lang="ts">
	import { onMount } from 'svelte';

	let minValue = $state(14);
	let maxValue = $state(20);
	let showCopied = $state(false);
	let screenWidth = $state(0);
	let divWidth = $state('');

	const minWidth = 1280;
	const maxWidth = 1920;

	function pxToRem(px: number) {
		return trimNumber(+(px / 16).toFixed(4));
	}

	function trimNumber(num: number) {
		return num.toFixed(4).replace(/\.?0+$/, '');
	}

	function getClampString(shouldRenderForTailwind = false) {
		const pixelDiff = maxValue - minValue;
		const widthDiff = maxWidth - minWidth;

		const slope = pixelDiff / widthDiff;
		const vw = slope * 100;

		const intercept = minValue - slope * minWidth;

		const minValueRem = pxToRem(minValue);
		const maxValueRem = pxToRem(maxValue);
		const interceptRem = pxToRem(intercept);

		if (!shouldRenderForTailwind) {
			return `clamp(${trimNumber(minValue / 16)}rem, ${trimNumber(vw)}vw + ${trimNumber(intercept / 16)}rem, ${trimNumber(maxValue / 16)}rem)`;
		}

		if (intercept < 0) {
			return `clamp(${trimNumber(+minValueRem)}rem,${trimNumber(vw)}vw${trimNumber(+interceptRem)}rem,${trimNumber(+maxValueRem)}rem)`;
		} else if (intercept === 0) {
			return `clamp(${trimNumber(+minValueRem)}rem,${trimNumber(vw)}vw,${trimNumber(+maxValueRem)}rem)`;
		} else {
			return `clamp(${trimNumber(+minValueRem)}rem,${trimNumber(vw)}vw+${trimNumber(+interceptRem)}rem,${trimNumber(+maxValueRem)}rem)`;
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(getClampString(true));
			showCopied = true;
			setTimeout(() => (showCopied = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	onMount(() => {
		screenWidth = window.innerWidth;
		const divElement = document.getElementById('divElement');
		if (divElement) {
			divWidth = getComputedStyle(divElement).width;
		}
		window.addEventListener('resize', () => {
			screenWidth = window.innerWidth;
			const divElement = document.getElementById('divElement');
			if (divElement) {
				divWidth = getComputedStyle(divElement).width;
			}
		});
	});
</script>

<div class="px-5">
	<div class=" p-6 rounded-lg shadow-lg max-w-xl mx-auto mt-10">
		<div class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="minValue" class="block main-text mb-2">Min (px)</label>
					<input
						id="minValue"
						type="number"
						bind:value={minValue}
						class="w-full px-3 py-2 border border-gray-300 bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-black"
					/>
				</div>
				<div>
					<label for="maxValue" class="block main-text mb-2">Max (px)</label>
					<input
						id="maxValue"
						type="number"
						bind:value={maxValue}
						class="w-full px-3 py-2 border border-gray-300 bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-black"
					/>
				</div>
			</div>

			<div class="mt-4 relative">
				<div class="flex flex-col md:flex-row gap-4">
					<code
						class="block flex-1 p-3 w-full rounded-l border border-gray-200 text-sm main-textmono"
					>
						{getClampString(true)}
					</code>
					<button
						onclick={copyToClipboard}
						class="px-4 py-3 bg-blue-500 rounded-sm text-white rounded-r hover:bg-blue-600 transition-colors border border-blue-600 min-w-[80px]"
					>
						{showCopied ? 'Copied!' : 'Copy'}
					</button>
				</div>
				<div class="mt-2 text-sm text-gray-500">
					<span class="inline-block mr-4">Min: {pxToRem(minValue)}rem ({minValue}px)</span>
					<span>Max: {pxToRem(maxValue)}rem ({maxValue}px)</span>
				</div>
			</div>
		</div>
	</div>
</div>

<div class="px-5 mx-auto mt-10">
	<div id="divElement" class="h-4 bg-red-500" style="width: {getClampString(false)};"></div>

	<div class="mt-4 text-white flex flex-col gap-2">
		<p class="main-text">Current screen width <b>{screenWidth}</b></p>
		<p class="main-text">Current div width <b>{divWidth}</b></p>
		<p class="secondary-text">
			This div is properly scaling from {minValue}px({pxToRem(minValue)}rem) to {maxValue}px ({pxToRem(
				maxValue
			)}rem)
		</p>
	</div>
</div>

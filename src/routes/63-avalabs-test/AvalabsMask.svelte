<script lang="ts">
	export let width = '100%';
	export let height = '100%';
</script>

<svg
	{width}
	{height}
	viewBox="0 0 722 628"
	preserveAspectRatio="none"
	xmlns="http://www.w3.org/2000/svg"
>
	<defs>
		<clipPath id="avalabsClip">
			<path
				d="M548.831 381.485C560.015 362.435 587.792 362.435 598.853 381.485L717.703 584.525C728.887 603.575 714.876 627.296 692.63 627.296H454.932C432.686 627.296 418.797 603.575 429.859 584.525L548.831 381.485Z"
			/>
			<path
				d="M477.034 246.295C487.849 227.367 487.849 204.015 477.034 184.965L379.57 14.9872C368.631 -4.06311 341.346 -4.06311 330.408 14.9872L4.21765 584.407C-6.7209 603.457 6.92156 627.301 28.7987 627.301H223.603C245.358 627.301 265.391 615.625 276.207 596.697L476.911 246.295H477.034Z"
			/>
		</clipPath>
	</defs>

	<foreignObject width="100%" height="100%" clip-path="url(#avalabsClip)">
		<div style="width: 100%; height: 100%;">
			<slot />
		</div>
	</foreignObject>
</svg>

<script>
	import { Controller } from 'lil-gui';

	const colors = [
		'#FF6B6B', // Coral Red
		'#4ECDC4', // Turquoise
		'#45B7D1', // Sky Blue
		'#96CEB4', // Sage Green
		'#FFEEAD', // Pale Yellow
		'#D4A5A5', // Dusty Rose
		'#9B59B6', // Purple
		'#3498DB', // Blue
		'#E74C3C', // Red
		'#2ECC71' // Emerald Green
	];

	$effect(() => {
		const container = document.querySelector('.grid');
		const items = document.querySelectorAll('.grid > .grid-item');
		const highlight = document.querySelector('#highlight-div');

		items.forEach((item, index) => {
			item.dataset.color = colors[index % colors.length];
		});

		const moveToElement = (element) => {
			if (element) {
				const rect = element.getBoundingClientRect();
				const containerRect = container.getBoundingClientRect();

				highlight.style.width = `${rect.width}px`;
				highlight.style.height = `${rect.height}px`;
				highlight.style.transform = `translate(${rect.left - containerRect.left}px, ${rect.top - containerRect.top}px)`;
				highlight.style.backgroundColor = element.dataset.color;
			}
		};

		const onHover = (event) => {
			const hoveredItem = event.target.closest('.grid > .grid-item');
			if (hoveredItem) {
				moveToElement(hoveredItem);
			} else {
				const containerRect = container.getBoundingClientRect();
				highlight.style.width = '0';
				highlight.style.height = '0';
				highlight.style.transform = `translate(${containerRect.width / 2}px, ${containerRect.height / 2}px)`;
			}
		};

		container.addEventListener('mouseover', onHover);
		// items.forEach((item, index) => {
		// 	item.style.backgroundColor = colors[index % colors.length];
		// });
	});
</script>

<div class="size-full min-h-[calc(100vh-56px)] flex justify-center items-center">
	<div class="grid md:grid-cols-12 w-full max-w-[1500px] p-4 relative">
		<div
			id="highlight-div"
			class="absolute transition-all ease-in-out duration-300 top-0 left-0 pointer-events-none -z-10"
		></div>
		<div
			class="grid-item border col-span-6 lg:col-span-3 p-6 flex items-center justify-center aspect-[100/50]"
		>
			( CSS )
		</div>
		<div
			class="grid-item border col-span-6 lg:col-span-3 p-6 flex items-center justify-center aspect-[100/50]"
		>
			( React )
		</div>
		<div
			class="grid-item border col-span-6 lg:col-span-3 p-6 flex items-center justify-center aspect-[100/50]"
		>
			( Svelte )
		</div>
		<div
			class="grid-item border col-span-6 lg:col-span-3 p-6 flex items-center justify-center aspect-[100/50]"
		>
			( Vue )
		</div>

		<div
			class="grid-item border col-span-3 md:col-span-2 p-4 flex items-center justify-center aspect-[100/75]"
		>
			( HTML )
		</div>
		<div
			class="grid-item border col-span-3 md:col-span-2 p-4 flex items-center justify-center aspect-[100/75]"
		>
			( Next.js )
		</div>
		<div
			class="grid-item border col-span-3 md:col-span-2 p-4 flex items-center justify-center aspect-[100/75]"
		>
			( Three.js )
		</div>
		<div
			class="grid-item border col-span-3 md:col-span-2 p-4 flex items-center justify-center aspect-[100/75]"
		>
			( GSAP )
		</div>
		<div
			class="grid-item border col-span-3 md:col-span-2 p-4 flex items-center justify-center aspect-[100/75]"
		>
			( Astro )
		</div>
		<div
			class="grid-item border col-span-3 md:col-span-2 p-4 flex items-center justify-center aspect-[100/75]"
		>
			( Tailwind )
		</div>
	</div>
</div>

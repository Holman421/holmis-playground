<script lang="ts">
	import { gsap } from 'gsap';
	import Flip from 'gsap/dist/Flip';
	import { tick } from 'svelte';
	gsap.registerPlugin(Flip);

	type Item = {
		id: number;
		name: string;
		color: string;
	};

	let items = $state<Item[]>([
		{ id: 1, name: 'item 1', color: '#EF4444' },
		{ id: 2, name: 'item 2', color: '#10B981' },
		{ id: 3, name: 'item 3', color: '#3B82F6' },
		{ id: 4, name: 'item 4', color: '#F59E0B' },
		{ id: 5, name: 'item 5', color: '#8B5CF6' },
		{ id: 6, name: 'item 6', color: '#EC4899' },
		{ id: 7, name: 'item 7', color: '#6366F1' },
		{ id: 8, name: 'item 8', color: '#6B7280' }
	]);

	let newItemColor = $state('#6B7280');

	let showNewItem;

	async function filterItems() {
		const itemsState = Flip.getState('#item');
		await tick();
		Flip.from(itemsState, {
			duration: 0.5,
			ease: 'power1.out',
			absolute: '#item',
			onEnter: (elements) => {
				gsap.fromTo(
					elements,
					{
						opacity: 0,
						scale: 0
					},
					{
						duration: 0.5,
						opacity: 1,
						scale: 1
					}
				);
			},
			onLeave: (elements) => {
				gsap.to(elements, {
					duration: 0.3,
					opacity: 0,
					scale: 0
				});
			}
		});
	}

	let isContainerOpen = $state(false);

	async function toggleIsContainerOpen() {
		const itemsState = Flip.getState(
			'#items-container, #flip-button, #item, #form-container, #form-todo-container'
		);

		isContainerOpen = !isContainerOpen;
		await tick();
		Flip.from(itemsState, {
			duration: 1,
			ease: 'power2.inOut',
			absolute: true,
			nested: true,
			onEnter: (elements) => {
				gsap.fromTo(
					elements,
					{
						opacity: 0,
						scale: 0
					},
					{
						opacity: 1,
						scale: 1,
						stagger: {
							amount: 0.4,
							ease: 'power2.out'
						}
					}
				);
			},
			onLeave: (elements) => {
				gsap.to(elements, {
					duration: 0.5,
					opacity: 0,
					scale: 0
				});
			}
		});
	}

	function shuffleArray(array: Item[]) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}

	async function shuffleItems() {
		const itemsState = Flip.getState('#item');
		items = shuffleArray([...items]);
		await tick();
		Flip.from(itemsState, {
			duration: 0.4,
			ease: 'power1.out',
			stagger: 0.1,
			spin: true,
			toggleClass: '!origin-center'
		});
	}

	async function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			const itemsState = Flip.getState('#item, #form-todo-container, #items-container');
			const newItemId = (document.querySelector('.new-item') as HTMLElement)!.dataset.flipId!;
			items = [
				...items,
				{
					id: +newItemId,
					name: `item ${items.length + 1}`,
					color: newItemColor
				}
			];
			newItemColor = '';
			await tick();
			Flip.from(itemsState, {
				duration: 1,
				ease: 'power1.out',
				targets: '#item'
			});
		}
	}

	async function removeItem(event: MouseEvent) {
		const itemsState = Flip.getState('#item');
		console.log(event.currentTarget);
		const id = ((event.currentTarget as HTMLButtonElement).firstChild as HTMLElement)!.dataset.id;
		items = items.filter((item) => item.id !== Number(id));
		await tick();
		Flip.from(itemsState, {
			duration: 0.5,
			ease: 'power1.out',
			targets: '#item'
		});
	}
</script>

<div id="flip-page-container" class="flex items-center justify-center flex-col gap-10 flex-grow">
	<div
		id="form-todo-container"
		class="flex flex-col border border-slate-500 rounded-md items-start p-10 gap-10"
	>
		<div id="form-container" class="min-w-[400px]">
			<h2 class="text-lg mb-2">Add Item</h2>
			<div class="flex gap-5">
				<input
					type="text"
					placeholder="Enter item color"
					bind:value={newItemColor}
					onkeydown={onKeyDown}
					class="border px-2 py-2 rounded-md border-slate-700 text-black"
				/>
				{#if newItemColor.length > 0}
					<div
						class="w-10 h-10 rounded-md border bg-black new-item"
						style="background-color: {newItemColor}"
						data-flip-id={Date.now()}
						id="item"
					></div>
				{/if}
				<button
					id="flip-button"
					onclick={() => {
						onKeyDown({ key: 'Enter' } as KeyboardEvent);
					}}
					class="ml-4 p-2 bg-gray-500 text-white rounded whitespace-nowrap"
				>
					Add new item
				</button>
			</div>
		</div>
		<div id="container" class="flex gap-3 items-center">
			<div
				id="items-container"
				class="border w-auto border-slate-950 grid grid-cols-4 gap-4 p-5 rounded-md"
				class:w-12={!isContainerOpen}
				class:h-12={!isContainerOpen}
			>
				{#each items as item (item.id)}
					<button onclick={removeItem} aria-label="asd">
						<div
							id="item"
							data-id={item.id}
							class:hidden={!isContainerOpen}
							data-flip-id={item.id}
							class="p-5 rounded-sm whitespace-nowrap transform origin-top"
							style="background-color: {item.color};"
						></div>
					</button>
				{/each}
			</div>
			<button
				id="flip-button"
				onclick={toggleIsContainerOpen}
				class="ml-4 p-2 bg-gray-500 text-white rounded whitespace-nowrap"
			>
				{isContainerOpen ? 'Hide' : 'Show'} Items
			</button>
			<!-- {#if isContainerOpen} -->
			<button
				id="flip-button"
				onclick={shuffleItems}
				class="ml-4 p-2 bg-gray-500 text-white rounded"
				class:hidden={!isContainerOpen}
			>
				Shuffle Items
			</button>
			<button
				id="flip-button"
				onclick={filterItems}
				class="ml-4 p-2 bg-gray-500 text-white rounded"
				class:hidden={!isContainerOpen}
			>
				Filter Items
			</button>
			<!-- {/if} -->
		</div>
	</div>
</div>

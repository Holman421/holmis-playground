<script lang="ts">
	import type { Todo } from '../../types';
	import { gsap } from 'gsap';
	import { onMount, tick } from 'svelte';

	const { todos, heading, editTodo, toggleTodo, removeTodo } = $props<{
		todos: Todo[];
		heading: string;
		editTodo: (event: Event) => void;
		toggleTodo: (event: Event) => void;
		removeTodo: (event: Event) => void;
	}>();

	onMount(async () => {
		await tick();
		const todos = gsap.utils.toArray(`.todo-item-${heading}`);
		gsap.fromTo(
			todos,
			{
				opacity: 0,
				y: 20,
				scale: 0.5
			},
			{
				duration: 0.5,
				opacity: 1,
				y: 0,
				scale: 1,
				stagger: 0.1
			}
		);
	});
</script>

<div id={`todo-list-${heading}`} class="flex flex-col gap-4 w-[300px]">
	<h2 class="text-lg font-medium">{heading}</h2>
	{#each todos as todo (todo.id)}
		<div
			id={`todo-item`}
			data-flip-id={todo.id}
			class={`todo-item-${heading} flex gap-2`}
			role="listitem"
		>
			<div class="relative">
				<input
					oninput={editTodo}
					data-id={todo.id}
					value={todo.text}
					type="text"
					class="pr-10 py-2 pl-3 rounded-lg border-gray-400 border bg-transparent"
					class:line-through={todo.done}
				/>
				<input
					onchange={toggleTodo}
					data-id={todo.id}
					checked={todo.done}
					type="checkbox"
					class="cursor-pointer bg-transparent"
				/>
			</div>
			<input
				type="button"
				value="X"
				data-id={todo.id}
				onclick={removeTodo}
				class="hover:text-red-500 cursor-pointer bg-transparent"
			/>
		</div>
	{/each}
</div>

<style>
	input[type='checkbox'] {
		border: 1px solid #ccc;
		border-radius: 0.5rem;
		height: 1rem;
		width: 1rem;
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		margin: 0;
	}
</style>

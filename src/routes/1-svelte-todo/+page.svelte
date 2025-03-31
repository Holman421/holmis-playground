<script lang="ts">
	import TodoList from '$lib/components/TodoList.svelte';
	import { tick } from 'svelte';
	import type { Todo } from '../../types';
	import { gsap } from 'gsap';
	import Flip from 'gsap/dist/Flip';
	gsap.registerPlugin(Flip);

	let todos = $state<Todo[]>([]);

	let doneTodos = $derived(() => todos.filter((todo) => todo.done));
	let remainingTodos = $derived(() => todos.filter((todo) => !todo.done));

	$effect(() => {
		const savedTodos = localStorage.getItem('todos');
		if (savedTodos) {
			todos = JSON.parse(savedTodos);
		}
	});

	$effect(() => {
		localStorage.setItem('todos', JSON.stringify(todos));
	});

	async function handleFlipAnimation(functionToExecute: () => void) {
		const state = Flip.getState('#todo-item, #todo-lists-container');
		functionToExecute();
		await tick();
		Flip.from(state, {
			duration: 0.4,
			ease: 'power1.out',
			targets: '#todo-item',
			absoluteOnLeave: true,
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
				gsap.fromTo(
					elements,
					{
						opacity: 1,
						x: 0
					},
					{
						duration: 0.5,
						opacity: 0,
						x: 20
					}
				);
			}
		});
	}

	async function addTodo(event: KeyboardEvent) {
		if (event.key !== 'Enter' || (event.target as HTMLInputElement).value.trim() === '') {
			return;
		}
		const addTodoFunction = () => {
			const text = (event.target as HTMLInputElement).value.trim();
			todos = [
				{
					id: Date.now().toString(),
					text: text,
					done: false,
					lastModified: Date.now()
				},
				...todos
			];
			(event.target as HTMLInputElement).value = '';
		};

		handleFlipAnimation(addTodoFunction);
	}

	function editTodo(event: Event) {
		const id = (event.target as HTMLInputElement).dataset.id!;
		todos = todos.map((todo) => {
			if (todo.id === id) {
				return {
					...todo,
					text: (event.target as HTMLInputElement).value
				};
			}
			return todo;
		});
	}

	async function toggleTodo(event: any) {
		const toggleTodoFunction = () => {
			const id = (event.target as HTMLInputElement).dataset.id!;
			const checked = (event.target as HTMLInputElement).checked;
			todos = todos.map((todo) => {
				if (todo.id === id) {
					return {
						...todo,
						done: checked,
						lastModified: Date.now(),
						parentNode: checked ? 'completed' : 'unComplete'
					};
				}
				return todo;
			});
		};

		handleFlipAnimation(toggleTodoFunction);
	}

	async function removeTodo(event: Event) {
		const removeTodoFunction = () => {
			const id = (event.target as HTMLInputElement).dataset.id!;
			todos = [...todos.filter((todo) => todo.id !== id)];
		};

		handleFlipAnimation(removeTodoFunction);
	}

	function totalTodos() {
		return todos.length;
	}
</script>

<div class="flex flex-col gap-4 mt-20 mx-auto w-fit p-5 rounded-md">
	<h1 class="h1 text-3xl font-medium">Svelte Todo App</h1>
	<input
		class="py-2 border px-4 border-slate-400 rounded-lg bg-transparent"
		onkeydown={addTodo}
		placeholder="Add todo"
		type="text"
	/>
	<div id="todo-lists-container" class="flex min-w-[700px]">
		<TodoList todos={remainingTodos()} {editTodo} {toggleTodo} {removeTodo} heading={'Remaining'} />
		<div class="w-[1px] bg-slate-500 mx-8"></div>
		<TodoList todos={doneTodos()} {editTodo} {toggleTodo} {removeTodo} heading={'Done'} />
	</div>
	<p class="mt-2">{totalTodos()} total items</p>
</div>

<style>
</style>

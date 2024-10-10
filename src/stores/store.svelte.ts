import { getContext, setContext } from 'svelte';

export class Counter {
	private count: number = $state(0);
	private isLocalStorageAvailable: boolean = $state(false);

	constructor() {}

	increment() {
		this.count += 1;
		this.updateLocalStorage();
	}

	decrement() {
		this.count -= 1;
		this.updateLocalStorage();
	}

	getCount() {
		return this.isLocalStorageAvailable ? this.count : 'Loading';
	}

	private updateLocalStorage() {
		localStorage.setItem('count', this.count.toString());
	}

	restoreFromLocalStorage() {
		this.count = +(localStorage.getItem('count') || 0);
		this.isLocalStorageAvailable = true;
	}
}

const COUNTER_KEY = Symbol('COUNTER');

export function setCounterState() {
	return setContext(COUNTER_KEY, new Counter());
}

export function getCounterState() {
	return getContext<ReturnType<typeof setCounterState>>(COUNTER_KEY);
}

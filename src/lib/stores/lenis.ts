import Lenis from '@studio-freight/lenis';
import { writable } from 'svelte/store';

export const lenisStore = writable<Lenis | null>(null);

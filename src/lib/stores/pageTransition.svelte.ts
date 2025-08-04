import { writable } from 'svelte/store';
import { goto as svelteGoto } from '$app/navigation';

export interface PageTransitionState {
	isTransitioning: boolean;
	transitionType: 'fade' | 'slide' | 'scale';
	direction: 'in' | 'out';
}

function createPageTransitionStore() {
	const initialState: PageTransitionState = {
		isTransitioning: false,
		transitionType: 'slide',
		direction: 'in'
	};

	const { subscribe, set, update } = writable(initialState);

	return {
		subscribe,
		startTransition: (type: 'fade' | 'slide' | 'scale' = 'fade') => {
			set({
				isTransitioning: true,
				transitionType: type,
				direction: 'out'
			});
		},
		finishTransition: () => {
			update(state => ({
				...state,
				direction: 'in'
			}));
			
			// Complete transition after animation
			setTimeout(() => {
				set({
					isTransitioning: false,
					transitionType: 'fade',
					direction: 'in'
				});
			}, 300);
		}
	};
}

export const pageTransitionStore = createPageTransitionStore();

// Enhanced goto function with transitions
export async function gotoWithTransition(
	url: string, 
	opts?: { 
		replaceState?: boolean;
		transitionType?: 'fade' | 'slide' | 'scale';
	}
) {
	const { transitionType = 'fade', ...gotoOpts } = opts || {};
	
	// Start transition
	pageTransitionStore.startTransition(transitionType);
	
	// Wait for transition out animation
	await new Promise(resolve => setTimeout(resolve, 300));
	
	// Navigate
	await svelteGoto(url, gotoOpts);
	
	// Finish transition
	pageTransitionStore.finishTransition();
}

<script lang="ts">
	import Decrement from '$lib/components/Decrement.svelte';
	import Increment from '$lib/components/Increment.svelte';
	import { getCounterState } from '../../stores/store.svelte';
	import { onMount, onDestroy } from 'svelte';

	const counterState = getCounterState();
	let audioContext: AudioContext;
	let analyser: AnalyserNode;
	let microphone: MediaStreamAudioSourceNode;
	let fontSize = 24; // base font size
	let h1Element: HTMLHeadingElement;

	async function setupMicrophone() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			audioContext = new AudioContext();
			analyser = audioContext.createAnalyser();
			microphone = audioContext.createMediaStreamSource(stream);
			microphone.connect(analyser);

			analyser.fftSize = 2048; // Increased for better frequency resolution
			const dataArray = new Uint8Array(analyser.frequencyBinCount);

			function updateSize() {
				analyser.getByteFrequencyData(dataArray);
				const volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

				// Calculate dominant frequency
				let maxValue = 0;
				let maxIndex = 0;
				for (let i = 0; i < dataArray.length; i++) {
					if (dataArray[i] > maxValue) {
						maxValue = dataArray[i];
						maxIndex = i;
					}
				}

				// Convert index to frequency
				const frequency = (maxIndex * audioContext.sampleRate) / analyser.fftSize;
				console.log('Dominant frequency:', frequency);

				fontSize = 24 + volume;
				if (h1Element) {
					h1Element.style.fontSize = `${fontSize}px`;
					h1Element.style.color = getColorFromFrequency(frequency);
				}

				requestAnimationFrame(updateSize);
			}

			updateSize();
		} catch (error) {
			console.error('Error accessing microphone:', error);
		}
	}

	function getColorFromFrequency(frequency: number): string {
		// Map frequency (typically 20Hz-2000Hz) to a 0-1 range
		// Adjust these values based on your needs
		const minFreq = 20;
		const maxFreq = 2000;
		const normalized = Math.max(0, Math.min(1, (frequency - minFreq) / (maxFreq - minFreq)));

		// Convert to RGB (red to green)
		const red = Math.round(255 * (1 - normalized));
		const green = Math.round(255 * normalized);
		return `rgb(${red}, ${green}, 0)`;
	}

	onMount(() => {
		setupMicrophone();
	});

	onDestroy(() => {
		if (audioContext) {
			audioContext.close();
		}
	});

	$effect(() => {
		console.log('counterState', counterState);
	});
</script>

<div>
	<!-- <Increment />
	{counterState.getCount()}
	<Decrement /> -->
</div>

<h1 bind:this={h1Element}>Test audio</h1>

<style>
	h1 {
		text-align: center;
		margin: 2rem 0;
	}
</style>

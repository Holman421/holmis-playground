<script lang="ts">
	import VirusCard from '$lib/components/VirusCard.svelte';

	const futuristicVirusCards = [
		{
			name: 'OblivionX-9',
			description:
				'A bioengineered virus designed as a weapon, OblivionX-9 disrupts cellular regeneration, causing rapid tissue necrosis. It spreads through airborne particles and contaminated water sources.',
			symptoms: [
				'Skin discoloration',
				'Extreme fatigue',
				'Internal hemorrhaging',
				'Loss of consciousness'
			],
			mortalityRate: '92%',
			regionsAffected: ['Global urban centers', 'High-density populations'],
			transmissionMode: 'Airborne and waterborne',
			uniforms: {
				uPositionFrequency: 0.83,
				uTimeFrequency: 0.27,
				uStrength: 0.57,
				uWarpPositionFrequency: 3.2,
				uWarpTimeFrequency: 0.35,
				uWarpStrength: 0.61,
				uColorA: '#cc0000',
				uColorB: '#4876fe'
			}
		},
		{
			name: 'XenoPlague Zeta',
			description:
				'XenoPlague Zeta, derived from alien microbes in deep-space mining, rewrites host biology. With 0% mortality, survivors mutate into hive-controlled drones, losing individuality.',
			symptoms: [
				'Bioluminescent skin lesions',
				'Unnatural limb elongation',
				'Excessive saliva production',
				'Loss of independent thought'
			],
			mortalityRate: '0%',
			regionsAffected: ['Polar regions', 'Temperate zones during winter'],
			transmissionMode: 'Contact with contaminated surfaces and frozen aerosols',
			uniforms: {
				uPositionFrequency: 0.1,
				uTimeFrequency: 0.9,
				uStrength: 1.64,
				uWarpPositionFrequency: 1.8,
				uWarpTimeFrequency: 2.4,
				uWarpStrength: 0.64,
				uColorA: '#e1ff00',
				uColorB: '#1100ff'
			}
		},
		{
			name: 'NecroForge Pathogen',
			description:
				"Engineered as a failed immortality experiment, the NecroForge Pathogen overrides the host's nervous system, transforming them into relentless, reanimated predators.",
			symptoms: [
				'Loss of cognitive function',
				'Hyper-aggression',
				'Tissue necrosis',
				'Insatiable hunger for living tissue'
			],
			mortalityRate: '100%',
			regionsAffected: ['Densely populated urban areas', 'Bioengineering labs', 'Quarantine zones'],
			transmissionMode: 'Bites, scratches, airborne nanospore exposure',
			uniforms: {
				uPositionFrequency: 0.57,
				uTimeFrequency: 1.37,
				uStrength: 1.37,
				uWarpPositionFrequency: 1.25,
				uWarpTimeFrequency: 1.37,
				uWarpStrength: 1.05,
				uColorA: '#158000',
				uColorB: '#5c0000'
			}
		}
	];

	const generateUniqueId = () => crypto.randomUUID();
</script>

<div>
	<div class="w-full flex flex-wrap gap-10 justify-center py-10">
		{#each futuristicVirusCards as card}
			<VirusCard
				title={card.name}
				description={card.description}
				href=""
				technologies={card.symptoms}
				canvasId={generateUniqueId()}
				mortalityRate={card.mortalityRate}
				uniforms={card.uniforms}
			/>
		{/each}
	</div>
</div>

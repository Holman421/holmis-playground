import type { AnimatedBox, BoxMaterials } from './types';
import { gsap } from 'gsap';

export const ANIMATION_CONFIG = {
	gentle: {
		upDuration: 0.5,
		downDuration: 0.8,
		easeUp: 'power2.out',
		easeDown: 'power2.inOut',
		downDelay: 0.5
	},
	accelerating: {
		initialVelocity: 0.1,
		accelerationRate: 0.3,
		totalDuration: 4,
		fadeOutStart: 3.5,
		fadeOutDuration: 0.5,
		fadeInDuration: 0.4,
		fadeInEase: 'power1.out'
	}
};

export function handleGentleAnimation(
	box: AnimatedBox,
	intensity: number,
	timeline: gsap.core.Timeline
) {
	const config = ANIMATION_CONFIG.gentle;

	timeline.kill();
	return gsap
		.timeline()
		.to(box.position, {
			z: intensity,
			duration: config.upDuration,
			ease: config.easeUp
		})
		.to(
			box.position,
			{
				z: 0,
				duration: config.downDuration,
				ease: config.easeDown
			},
			`+=${config.downDelay}`
		);
}

export function handleAcceleratingAnimation(
	box: AnimatedBox,
	materials: BoxMaterials,
	velocity: number,
	randomDelay: number,
	elapsed: number
) {
	const config = ANIMATION_CONFIG.accelerating;

	if (elapsed < config.totalDuration) {
		if (elapsed > randomDelay) {
			const normalizedTime = (elapsed - randomDelay) / 2;
			velocity += config.accelerationRate * normalizedTime;
			box.position.z -= velocity;

			if (elapsed > config.fadeOutStart) {
				const fadeOutProgress = (elapsed - config.fadeOutStart) / config.fadeOutDuration;
				materials.mainMaterial.uniforms!.opacity.value = 1 - fadeOutProgress;
				materials.lineMaterial.opacity = 1 - fadeOutProgress;
			}
		}
	} else {
		resetBoxWithDelay(box, materials, randomDelay);
	}

	return velocity;
}

function resetBoxWithDelay(box: AnimatedBox, materials: BoxMaterials, delay: number) {
	const config = ANIMATION_CONFIG.accelerating;
	box.position.z = -4;

	gsap.delayedCall(delay, () => {
		gsap.to(materials.lineMaterial, {
			opacity: 1,
			duration: config.fadeInDuration,
			ease: config.fadeInEase
		});

		gsap.to(materials.mainMaterial.uniforms!.opacity, {
			value: 1,
			duration: config.fadeInDuration,
			ease: config.fadeInEase
		});

		gsap.to(box.position, {
			z: 0,
			duration: config.fadeInDuration,
			ease: config.fadeInEase
		});
	});
}

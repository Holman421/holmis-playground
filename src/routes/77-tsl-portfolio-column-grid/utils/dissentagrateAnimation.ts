import { gsap } from 'gsap';
import type DisintegrateMesh from '$lib/utils/meshes/DisintegrateMesh';

interface DisintegrateAnimationConfig {
	duration: number; // How long each 0→1 cycle takes (seconds)
}

export default class DisintegrateAnimation {
	private disintegrateMesh: DisintegrateMesh;
	private progressTarget = { value: 0 };
	private duration: number;

	constructor(
		disintegrateMesh: DisintegrateMesh,
		config: DisintegrateAnimationConfig
	) {
		this.disintegrateMesh = disintegrateMesh;
		this.duration = config.duration;
	}

	playAnimation(): void {
		this.disintegrateMesh.updateProgress(0);
		gsap.set(this.progressTarget, { value: 0 });
		gsap.to(this.progressTarget, {
			value: 1,
			duration: this.duration,
			ease: 'linear',
			onUpdate: () => {
				this.disintegrateMesh.updateProgress(this.progressTarget.value);
			}
		});
	}

	stop(): void {
		this.progressTarget.value = 0;
		this.disintegrateMesh.updateProgress(0);
	}
}

import type { PerspectiveCamera } from 'three';
import type { Vector3 } from 'three';

interface CameraMovementConfig {
	smoothFactor?: number;
	xSensitivity?: number;
	ySensitivity?: number;
	basePosition?: { x: number; y: number; z: number };
}

export function setupCameraMovement(
	camera: PerspectiveCamera,
	lookAtTarget: Vector3,
	config: CameraMovementConfig = {},
	isActive: boolean
) {
	if (!isActive) {
		return {
			updateCamera: () => {},
			cleanup: () => {}
		};
	}
	const {
		smoothFactor = 0.05,
		xSensitivity = 0.175,
		ySensitivity = 0.1,
		basePosition = { x: 0, y: 0, z: 1 }
	} = config;

	const mouse = {
		x: 0,
		y: 0,
		targetX: 0,
		targetY: 0
	};

	const onMouseMove = (event: MouseEvent) => {
		const width = window.innerWidth;
		const height = window.innerHeight - 56; // Adjusting for header height
		mouse.targetX = (event.clientX / width - 0.5) * 2;
		mouse.targetY = (event.clientY / height - 0.5) * 2;
	};

	const updateCamera = () => {
		mouse.x += (mouse.targetX - mouse.x) * smoothFactor;
		mouse.y += (mouse.targetY - mouse.y) * smoothFactor;

		camera.position.x = basePosition.x + mouse.x * xSensitivity;
		camera.position.y = basePosition.y - mouse.y * ySensitivity;
		camera.position.z = basePosition.z;
		camera.lookAt(lookAtTarget);
	};

	window.addEventListener('mousemove', onMouseMove);

	return {
		updateCamera,
		cleanup: () => {
			window.removeEventListener('mousemove', onMouseMove);
		}
	};
}

import * as THREE from 'three/webgpu';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import { MSDFTextGeometry, MSDFTextNodeMaterial } from '../src/index';
import type { Pane } from 'tweakpane';

interface TextMeshConfig {
	text: string;
	position: THREE.Vector3;
	scale: THREE.Vector3;
	rotation: THREE.Euler;
}

interface TextHandlerOptions {
	scene: THREE.Scene;
	pane?: Pane;
	enableTweakpane?: boolean;
	fontAtlasPath?: string;
	fontDataPath?: string;
	material?: {
		color?: string;
		opacity?: number;
	};
	mainTextConfig?: TextMeshConfig;
	staticTextConfig?: TextMeshConfig;
}

export default class TextHandler {
	private scene: THREE.Scene;
	private pane?: Pane;
	private enableTweakpane: boolean;
	private fontAtlasPath: string;
	private fontDataPath: string;
	private materialConfig: {
		color: string;
		opacity: number;
	};
	
	public mainTextMesh?: THREE.Mesh;
	public staticTextMesh?: THREE.Mesh;
	private font?: any;
	private atlas?: THREE.Texture;
	private material?: MSDFTextNodeMaterial;
	private isDisposed: boolean = false;
	
	private mainTextConfig: TextMeshConfig;
	private staticTextConfig: TextMeshConfig;

	constructor(options: TextHandlerOptions) {
		this.scene = options.scene;
		this.pane = options.pane;
		this.enableTweakpane = options.enableTweakpane ?? false;
		this.fontAtlasPath = options.fontAtlasPath ?? '/fonts/Audiowide-msdf.png';
		this.fontDataPath = options.fontDataPath ?? '/fonts/Audiowide-msdf.json';
		
		this.materialConfig = {
			color: options.material?.color ?? '#ffffffff',
			opacity: options.material?.opacity ?? 1.0
		};

		// Default text configurations
		this.mainTextConfig = options.mainTextConfig ?? {
			text: 'ALES HOLMAN',
			position: new THREE.Vector3(-25.6, 1.4, 67.4),
			scale: new THREE.Vector3(0.01, 0.01, 0.01),
			rotation: new THREE.Euler(0, Math.PI * (125 / 180), Math.PI * 1.0)
		};

		this.staticTextConfig = options.staticTextConfig ?? {
			text: 'Hi, I am',
			position: new THREE.Vector3(-25.6, 2.0, 67.4),
			scale: new THREE.Vector3(0.01, 0.01, 0.01),
			rotation: new THREE.Euler(0, Math.PI * (125 / 180), Math.PI * 1.0)
		};
	}

	async initialize(): Promise<void> {
		try {
			const [atlas, font] = await Promise.all([
				this.loadFontAtlas(this.fontAtlasPath),
				this.loadFont(this.fontDataPath)
			]);

			this.atlas = atlas;
			this.font = font.data;
			this.material = this.createMaterial();

			this.createTextMeshes();
			
			if (this.enableTweakpane && this.pane) {
				this.setupTweakpane();
			}
		} catch (error) {
			console.error('MSDF font load failed', error);
		}
	}

	private loadFontAtlas(path: string): Promise<THREE.Texture> {
		return new Promise((resolve, reject) => {
			const loader = new THREE.TextureLoader();
			loader.load(path, resolve, undefined, reject);
		});
	}

	private loadFont(path: string): Promise<any> {
		return new Promise((resolve, reject) => {
			const loader = new FontLoader();
			loader.load(path, resolve, undefined, reject);
		});
	}

	private createMaterial(): MSDFTextNodeMaterial {
		return new MSDFTextNodeMaterial({
			map: this.atlas,
			color: this.materialConfig.color,
			opacity: this.materialConfig.opacity
		});
	}

	private createTextMeshes(): void {
		if (!this.font || !this.material) {
			console.error('Font or material not loaded');
			return;
		}

		// Create main text mesh
		const mainGeometry = new MSDFTextGeometry({
			text: this.mainTextConfig.text,
			font: this.font,
			side: THREE.DoubleSide
		});

		this.mainTextMesh = new THREE.Mesh(mainGeometry as any, this.material as any);
		this.mainTextMesh.position.copy(this.mainTextConfig.position);
		this.mainTextMesh.scale.copy(this.mainTextConfig.scale);
		this.mainTextMesh.rotation.copy(this.mainTextConfig.rotation);
		
		// Store font reference for later use in updateText
		(this.mainTextMesh as any)._font = this.font;
		
		this.scene.add(this.mainTextMesh);

		// Create static text mesh
		const staticGeometry = new MSDFTextGeometry({
			text: this.staticTextConfig.text,
			font: this.font,
			side: THREE.DoubleSide
		});

		this.staticTextMesh = new THREE.Mesh(staticGeometry as any, this.material as any);
		this.staticTextMesh.position.copy(this.staticTextConfig.position);
		this.staticTextMesh.scale.copy(this.staticTextConfig.scale);
		this.staticTextMesh.rotation.copy(this.staticTextConfig.rotation);
		
		this.scene.add(this.staticTextMesh);
	}

	public updateMainText(text: string): void {
		if (this.mainTextMesh && this.font) {
			const geometry = new MSDFTextGeometry({
				text: text,
				font: this.font,
				side: THREE.DoubleSide
			});
			
			this.mainTextMesh.geometry.dispose();
			this.mainTextMesh.geometry = geometry;
		}
	}

	public updateStaticText(text: string): void {
		if (this.staticTextMesh && this.font) {
			const geometry = new MSDFTextGeometry({
				text: text,
				font: this.font,
				side: THREE.DoubleSide
			});
			
			this.staticTextMesh.geometry.dispose();
			this.staticTextMesh.geometry = geometry;
		}
	}

	public setMainTextPosition(x: number, y: number, z: number): void {
		if (this.mainTextMesh) {
			this.mainTextMesh.position.set(x, y, z);
		}
	}

	public setMainTextRotation(x: number, y: number, z: number): void {
		if (this.mainTextMesh) {
			this.mainTextMesh.rotation.set(x, y, z);
		}
	}

	public setMainTextScale(x: number, y: number, z: number): void {
		if (this.mainTextMesh) {
			this.mainTextMesh.scale.set(x, y, z);
		}
	}

	public setStaticTextPosition(x: number, y: number, z: number): void {
		if (this.staticTextMesh) {
			this.staticTextMesh.position.set(x, y, z);
		}
	}

	public setStaticTextRotation(x: number, y: number, z: number): void {
		if (this.staticTextMesh) {
			this.staticTextMesh.rotation.set(x, y, z);
		}
	}

	public setStaticTextScale(x: number, y: number, z: number): void {
		if (this.staticTextMesh) {
			this.staticTextMesh.scale.set(x, y, z);
		}
	}

	public centerTextInDisintegrateBox(
		disintegratePosition: THREE.Vector3,
		disintegrateBoxSize: { x: number; y: number; z: number },
		disintegrateRotation: { x: number; y: number; z: number },
		offsetFromLeft: number = 0.5, // Static distance from left side (0-1, where 0 is left edge, 1 is right edge)
		useExistingRotation: boolean = true // Use the existing text rotation instead of box rotation
	): void {
		if (this.mainTextMesh && this.staticTextMesh) {
			// Use the existing rotation from the static text (which has the correct rotation)
			const correctRotation = this.staticTextMesh.rotation.clone();
			
			// Calculate the centered position for the main text based on the disintegrate box
			// But use the correct text rotation for positioning calculations
			
			// Create a transformation matrix using the correct text rotation
			const textMatrix = new THREE.Matrix4();
			const position = disintegratePosition.clone();
			const rotation = correctRotation;
			const scale = new THREE.Vector3(1, 1, 1);
			
			textMatrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
			
			// Calculate local position within the box for the main text
			// Center vertically, position horizontally based on offsetFromLeft
			const localX = (offsetFromLeft - 2.3) * disintegrateBoxSize.x;
			const localY = 0.1; // Center vertically for main text
			const localZ = 0; // Center in depth
			
			const localPosition = new THREE.Vector3(localX, localY, localZ);
			
			// Transform local position to world space
			const worldPosition = localPosition.applyMatrix4(textMatrix);
			
			// Set the main text position and rotation
			this.mainTextMesh.position.copy(worldPosition);
			this.mainTextMesh.rotation.copy(correctRotation);
			
			// Position the static text ("Hi, I am") above the main text
			// Calculate offset for "Hi, I am" text to be above the main text
			const staticOffsetLocal = new THREE.Vector3(0, -1.0, 0); // Offset above main text in local space
			
			// Transform the offset to world space using the rotation
			const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(correctRotation);
			const staticOffsetWorld = staticOffsetLocal.applyMatrix4(rotationMatrix);
			
			const staticWorldPosition = worldPosition.clone().add(staticOffsetWorld);
			this.staticTextMesh.position.copy(staticWorldPosition);
			// Static text keeps its original rotation (which is already correct)
		}
	}

	public getMainTextMesh(): THREE.Mesh | undefined {
		return this.mainTextMesh;
	}

	public getStaticTextMesh(): THREE.Mesh | undefined {
		return this.staticTextMesh;
	}

	private setupTweakpane(): void {
		if (!this.pane || !this.mainTextMesh) return;

		const fontFolder = this.pane.addFolder({
			title: 'Font Transform',
			expanded: false
		});

		// Position controls
		const pos = {
			x: this.mainTextMesh.position.x,
			y: this.mainTextMesh.position.y,
			z: this.mainTextMesh.position.z
		};

		fontFolder
			.addBinding(pos, 'x', {
				min: -500,
				max: 500,
				step: 0.1,
				label: 'Pos X'
			})
			.on('change', (ev) => {
				if (this.mainTextMesh) this.mainTextMesh.position.x = ev.value as number;
			});

		fontFolder
			.addBinding(pos, 'y', {
				min: -500,
				max: 500,
				step: 0.1,
				label: 'Pos Y'
			})
			.on('change', (ev) => {
				if (this.mainTextMesh) this.mainTextMesh.position.y = ev.value as number;
			});

		fontFolder
			.addBinding(pos, 'z', {
				min: -500,
				max: 500,
				step: 0.1,
				label: 'Pos Z'
			})
			.on('change', (ev) => {
				if (this.mainTextMesh) this.mainTextMesh.position.z = ev.value as number;
			});

		// Rotation controls (in degrees)
		const rad2deg = (r: number) => (r * 180) / Math.PI;
		const deg2rad = (d: number) => (d * Math.PI) / 180;
		
		const rot = {
			x: rad2deg(this.mainTextMesh.rotation.x),
			y: rad2deg(this.mainTextMesh.rotation.y),
			z: rad2deg(this.mainTextMesh.rotation.z)
		};

		fontFolder
			.addBinding(rot, 'x', {
				min: -180,
				max: 180,
				step: 1,
				label: 'Rot X (deg)'
			})
			.on('change', (ev) => {
				if (this.mainTextMesh)
					this.mainTextMesh.rotation.x = deg2rad(ev.value as number);
			});

		fontFolder
			.addBinding(rot, 'y', {
				min: -180,
				max: 180,
				step: 1,
				label: 'Rot Y (deg)'
			})
			.on('change', (ev) => {
				if (this.mainTextMesh)
					this.mainTextMesh.rotation.y = deg2rad(ev.value as number);
			});

		fontFolder
			.addBinding(rot, 'z', {
				min: -180,
				max: 180,
				step: 1,
				label: 'Rot Z (deg)'
			})
			.on('change', (ev) => {
				if (this.mainTextMesh)
					this.mainTextMesh.rotation.z = deg2rad(ev.value as number);
			});
	}

	public dispose(): void {
		if (this.isDisposed) return; // Already disposed
		this.isDisposed = true;
		
		// Remove meshes from scene first
		if (this.mainTextMesh) {
			this.scene.remove(this.mainTextMesh);
			if (this.mainTextMesh.geometry) {
				this.mainTextMesh.geometry.dispose();
			}
			this.mainTextMesh = undefined;
		}
		
		if (this.staticTextMesh) {
			this.scene.remove(this.staticTextMesh);
			if (this.staticTextMesh.geometry) {
				this.staticTextMesh.geometry.dispose();
			}
			this.staticTextMesh = undefined;
		}
		
		// Dispose material after meshes are removed
		if (this.material) {
			try {
				(this.material as any).dispose();
			} catch (error) {
				console.warn('Error disposing material:', error);
			}
			this.material = undefined;
		}
		
		// Dispose atlas texture
		if (this.atlas) {
			try {
				this.atlas.dispose();
			} catch (error) {
				console.warn('Error disposing atlas:', error);
			}
			this.atlas = undefined;
		}
	}
}

declare module 'tsl-textures' {
    export function simplexNoise(options: {
        scale?: number;
        balance?: number;
        contrast?: number;
        color?: THREE.Color;
        background?: THREE.Color;
        seed?: number;
    }): any;
}

uniform vec3 uColorWaterDeep;
uniform vec3 uColorWaterSurface;
uniform vec3 uColorSand;
uniform vec3 uColorGrass;
uniform vec3 uColorRock;
uniform vec3 uColorSnow;

varying vec3 vWorldPosition;
varying float vElevation;
varying float vUpDot;

#include ../includes/simplexNoise2d.glsl

void main() {
    vec3 color = vec3(1.0);

    // Water
    float surfaceWaterMix = smoothstep(-1.0, -0.1, vElevation);
    color = mix(uColorWaterDeep, uColorWaterSurface, surfaceWaterMix);

    // Sand
    float sandMix = step(-0.1, vElevation);
    color = mix(color, uColorSand, sandMix);

    // Grass
    float grassMix = step(0.02, vElevation); // Adjust threshold
    color = mix(color, uColorGrass, grassMix);

    // Rock
    float rockMix = step(0.2, vElevation);
    // rockMix *= step(0.02, vElevation); // Adjust threshold
    color = mix(color, uColorRock, rockMix);

    // Snow
    float snowThreshold = 0.45;
    snowThreshold += simplexNoise2d(vWorldPosition.xz * 15.0) * 0.1;
    float snowMix = step(snowThreshold, vElevation);
    color = mix(color, uColorSnow, snowMix);

    gl_FragColor = vec4(color, 1.0);
}

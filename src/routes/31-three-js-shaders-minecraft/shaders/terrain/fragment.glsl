varying vec3 vColor;
varying float vElevation;

uniform vec3 uColorWaterDeep;
uniform vec3 uColorWaterSurface;
uniform vec3 uColorSand;
uniform vec3 uColorGrass;
uniform vec3 uColorRock;
uniform vec3 uColorSnow;

void main() {
    // Calculate height from elevation
    float height = floor((vElevation - 0.5) * 80.0) / 80.0;

    // Define threshold levels
    float waterLevel = 0.2;
    float waterDeepLevel = waterLevel * 0.4;
    float sandLevel = 0.25;
    float grassLevel = 0.55;
    float snowLevel = 0.9;

    // Use step function for sharp transitions
    vec3 color = uColorWaterDeep;
    color = mix(color, uColorWaterSurface, step(waterDeepLevel, height));
    color = mix(color, uColorSand, step(waterLevel, height));
    color = mix(color, uColorGrass, step(sandLevel, height));
    color = mix(color, uColorRock, step(grassLevel, height));
    color = mix(color, uColorSnow, step(snowLevel, height));

    csm_DiffuseColor = vec4(color, 1.0);
}

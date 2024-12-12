uniform vec3 uColorWaterDeep;
uniform vec3 uColorWaterSurface;
uniform vec3 uColorSand;
uniform vec3 uColorGrass;
uniform vec3 uColorRock;
uniform vec3 uColorSnow;

varying vec3 vWorldPosition;
varying float vElevation;
varying float vUpDot;
varying vec3 vLocalPosition;

#include ../includes/simplexNoise2d.glsl

void main() {
    // Increase multiplier from 20.0 to 40.0 for smaller blocks
    float height = floor((vLocalPosition.y - 0.5) * 80.0) / 80.0;

    // Define sharp threshold levels
    float waterLevel = 0.2;
    float sandLevel = 0.25;
    float grassLevel = 0.55;
    float rockLevel = 0.7;
    float snowLevel = 0.9;

    // Completely sharp color transitions
    vec3 color;
    if(height < waterLevel) {
        // Even water is now discrete
        color = (height < (waterLevel * 0.4)) ? uColorWaterDeep : uColorWaterSurface;
    } else if(height < sandLevel) {
        color = uColorSand;
    } else if(height < grassLevel) {
        color = uColorGrass;
    } else if(height < rockLevel) {
        color = uColorRock;
    } else if(height < snowLevel) {
        color = uColorRock;
    } else {
        color = uColorSnow;
    }

    csm_DiffuseColor = vec4(color, 1.0);
}

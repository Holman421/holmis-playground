#include ../includes/simplexNoise2d.glsl

uniform vec3 uColorWaterDeep;
uniform vec3 uColorWaterSurface;
uniform vec3 uColorSand;
uniform vec3 uColorGrass;
uniform vec3 uColorSnow;
uniform vec3 uColorRock;

varying vec3 vPosition;
varying float vUpDot;
varying float vElevation;

void main() {
    vec3 color = vec3(1.0);
    csm_DiffuseColor = vec4(0.5, 1.0, 0.2, 0.5);
}
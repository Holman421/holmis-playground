varying vec3 vPosition;
varying vec3 vNormal;
varying float vGlitchStrength;

uniform float uTime;
uniform vec3 uColor;

void main() {
    vec3 normal = normalize(vNormal);
    if(!gl_FrontFacing)
    normal *= -1.0;

    // Stripes
    float stripes = mod((vPosition.y - uTime * 0.02) * 20.0, 1.0);
    stripes = pow(stripes, 3.0);

    // Fresnel
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    float fresnel = dot(viewDirection, normal) + 1.0;
    fresnel = pow(fresnel, 2.0);

    // Falloff
    float falloff = smoothstep(0.8, 0.0, fresnel);

    // Holographic
    float holographic = stripes * fresnel;
    holographic += fresnel * 1.25;
    holographic *= falloff;

    // Glitch wave color change
    vec3 finalColor = mix(uColor, vec3(1.0, 0.0, 0.0), vGlitchStrength * 4.0);

    gl_FragColor = vec4(finalColor, holographic);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
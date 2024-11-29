uniform vec3 uColorA;
uniform vec3 uColorB;

varying float vWobble;

void main() {
    float colorMix = smoothstep(-1.0, 1.0, vWobble);
    csm_DiffuseColor = vec4(mix(uColorA, uColorB, colorMix), 1.0);
    csm_Metalness = smoothstep(0.0, 1.0, vWobble);
    csm_Roughness = 1.0 - smoothstep(-0.5, 0.0, vWobble);
}
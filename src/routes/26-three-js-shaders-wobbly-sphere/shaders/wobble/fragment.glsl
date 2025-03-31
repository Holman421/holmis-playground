uniform vec3 uColorA;
uniform vec3 uColorB;

varying float vWobble;

void main() {
    float colorMix = smoothstep(-1.0, 1.0, vWobble);
    csm_DiffuseColor = vec4(mix(uColorA, uColorB, colorMix), 1.0);
    float metalness = (colorMix + 1.0) / 2.0;
    csm_Metalness = pow(metalness, 2.0);
    csm_Roughness = 1.0 - pow(vWobble, 2.0);
}
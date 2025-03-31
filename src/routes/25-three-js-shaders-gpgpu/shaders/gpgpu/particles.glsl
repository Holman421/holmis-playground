uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;

#include ./simplexNoise4d.glsl

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 particle = texture2D(uParticles, uv);
    vec4 base = texture2D(uBase, uv);

    float time = uTime * 0.1;

    // Dead
    if(particle.a >= 1.0) {
        particle.a = mod(particle.a, 1.0);
        particle.xyz = base.xyz;
    } else {
        // Strength 
        float influence = (uFlowFieldInfluence - 0.5) * (-2.0);
        float strength = simplexNoise4d(vec4(base.xyz, time + 1.0));
        strength = smoothstep(influence, 1.0, strength);

        // Flow field
        vec3 flowField = vec3(simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 0.0, time)), simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 1.0, time)), simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 2.0, time)));
        flowField = normalize(flowField);
        particle.xyz += flowField * uDeltaTime * strength * uFlowFieldStrength;

        // Decay
        particle.a += uDeltaTime * 0.3;
    }

    gl_FragColor = particle;
}
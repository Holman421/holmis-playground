uniform float uProgress;
uniform sampler2D uState1;
uniform sampler2D uState2;
uniform vec2 uUserLocation;
uniform float uHasUserLocation;

varying vec2 vUv;

void main() {
    vec4 texture1 = texture2D(uState1, vUv);
    vec4 texture2 = texture2D(uState2, vUv);

    float dist = distance(vUv, vec2(0.5));
    float radius = 1.41;
    float outer_progress = clamp(1.1 * uProgress, 0.0, 1.0);
    float inner_progress = clamp(1.1 * uProgress - 0.05, 0.0, 1.0);

    float innerCircle = 1.0 - smoothstep((inner_progress - 0.1) * radius, inner_progress * radius, dist);
    float outerCircle = 1.0 - smoothstep((outer_progress - 0.1) * radius, outer_progress * radius, dist);

    // Add user location highlight
    float userLocationDist = distance(vUv, uUserLocation);
    // Adjust the glow radius and intensity
    float userLocationGlow = uHasUserLocation * (1.0 - smoothstep(0.0, 0.05, userLocationDist)) * 2.0;

    float displacement = outerCircle - innerCircle;
    float scale = mix(texture1.r, texture2.r, innerCircle);

    // Store the user location in the blue channel instead of adding to displacement
    float locationSignal = userLocationGlow * 1.0;

    vec4 finalColor = mix(texture1, texture2, uProgress);

    gl_FragColor = vec4(displacement, scale, locationSignal, 1.0);
}

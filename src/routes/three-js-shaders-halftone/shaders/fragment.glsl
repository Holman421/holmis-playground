varying vec3 vPosition;
varying vec3 vNormal;

uniform vec3 uColor;
uniform vec2 uResolution;

#include ../includes/ambientLight.glsl
#include ../includes/directionalLight.glsl
#include ../includes/pointLight.glsl

vec3 halftone(
    vec3 color,
    float repetitions,
    vec3 direction,
    float low,
    float high,
    vec3 pointColor,
    vec3 normal) {
    float intensity = dot(normal, direction);
    intensity = smoothstep(low, high, intensity);

    vec2 uv = gl_FragCoord.xy / uResolution.y;
    uv *= repetitions;
    uv = mod(uv, 1.0);

    float point = distance(uv, vec2(0.5));
    point = 1.0 - step(0.5 * intensity, point);

    return mix(color, pointColor, point);
}

void main() {
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    vec3 color = uColor;

    // Lights
    vec3 light = vec3(0.0);
    light += ambientLight(vec3(1.0), // Light color
        1.0); // Light intensity,
    light += directionalLight(vec3(1.0, 1.0, 1.0), 1.0, normal, vec3(1.0, 1.0, 0.0), viewDirection, 1.0);
    color *= light;

    // Halftone

    color = halftone(color, 100.0, vec3(0.0, -1.0, 0.0), -1.0, 1.5, vec3(1.0, 0.0, 0.0), normal);

    color = halftone(color, 150.0, vec3(1.0, 1.0, 0.0), 0.5, 1.5, vec3(0.94, 0.91, 0.75), normal);

    gl_FragColor = vec4(color, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
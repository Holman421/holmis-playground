varying vec3 vColor;
varying float vDisplacementIntensity;

void main() {
    vec2 uv = gl_PointCoord;
    float distanceToCenter = distance(uv, vec2(0.5));

    // if(distanceToCenter > 0.5) {
    //     discard;
    // }

    float finalDisplecement = 1.0 - vDisplacementIntensity;

    finalDisplecement = pow(finalDisplecement, 2.0);
    gl_FragColor = vec4(0.5, 0.0, 0.6, vDisplacementIntensity);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
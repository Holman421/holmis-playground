varying vec3 vColor;
uniform float uOpacity;

void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);

    if(distanceToCenter > 0.5)
    discard;

    gl_FragColor = vec4(vColor, uOpacity);

#include <tonemapping_fragment>
#include <colorspace_fragment>
}
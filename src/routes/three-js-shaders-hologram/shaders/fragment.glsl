varying vec3 vPosition;
void main() {
    gl_FragColor = vec4(vPosition, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}

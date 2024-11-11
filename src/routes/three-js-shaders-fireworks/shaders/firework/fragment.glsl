uniform sampler2D uTexture;
uniform vec3 uColor;

void main() {
    float textureAplha = texture(uTexture, gl_PointCoord).r;
    gl_FragColor = vec4(uColor, textureAplha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
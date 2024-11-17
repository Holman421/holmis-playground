uniform sampler2D uTexture;
uniform vec3 uColor;

varying float vProgress;

void main() {
    float textureAplha = texture(uTexture, gl_PointCoord).r;
    float alphaProgress = textureAplha * 1.0 - vProgress;
    alphaProgress *= 1.2;
    gl_FragColor = vec4(uColor, alphaProgress);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
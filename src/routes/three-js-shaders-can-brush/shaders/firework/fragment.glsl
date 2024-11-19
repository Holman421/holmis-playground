uniform sampler2D uTexture;
uniform vec3 uColor;

varying float vProgress;

void main() {
    float textureAplha = texture(uTexture, gl_PointCoord).r;
    float alphaProgress = textureAplha * 0.5 - vProgress;
    alphaProgress *= 0.8;
    gl_FragColor = vec4(uColor, alphaProgress);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
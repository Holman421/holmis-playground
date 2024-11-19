uniform sampler2D uTexture;
uniform vec3 uColor;

varying float vProgress;
varying float vRotation;

void main() {
    // Center and rotate UV coordinates
    vec2 center = vec2(0.5, 0.5);
    vec2 uv = gl_PointCoord - center;

    float c = cos(vRotation);
    float s = sin(vRotation);
    mat2 rotationMatrix = mat2(c, -s, s, c);

    uv = rotationMatrix * uv + center;

    // Use your original alpha calculation with rotated UVs
    float textureAplha = texture(uTexture, uv).r;
    float alphaProgress = textureAplha * 0.5 - vProgress;
    alphaProgress *= 0.8;

    // Discard pixels outside texture bounds
    if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        discard;
    }

    gl_FragColor = vec4(uColor, alphaProgress);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
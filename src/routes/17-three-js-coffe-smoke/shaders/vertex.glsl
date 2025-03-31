uniform float uTime;
uniform sampler2D uPerlinTexture;

varying vec2 vUv;

float PI = 3.14159265359;

vec2 rotate2D(vec2 value, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat2 m = mat2(c, s, -s, c);
    return m * value;
}

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.z += sin(modelPosition.y + uTime) * 0.3;
    modelPosition.x += modelPosition.z * (modelPosition.y * 0.2);
    float twistPerlin = texture2D(uPerlinTexture, vec2(0.5, uv.y * 0.2)).r;
    float angle = twistPerlin * 10.0;
    modelPosition.xz = rotate2D(modelPosition.xz, angle + uTime * 0.25);

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    vUv = uv;
}
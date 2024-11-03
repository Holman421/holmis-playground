uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform vec2 uFrequency;
uniform float uTime;
uniform vec3 uColor;

attribute vec3 position;
attribute float aRandom;

varying float vGreen;
varying float vRed;
varying float vBlue;
varying vec3 vColor;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.z += sin(modelPosition.x * uFrequency.x + uTime + aRandom) * 0.25;
    modelPosition.z += sin(modelPosition.y * uFrequency.y + uTime + aRandom) * 0.25;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    vGreen = modelPosition.z * 2.0;
    vRed = modelPosition.z * -2.0;
    vBlue = 0.3;
    vColor = uColor;
}

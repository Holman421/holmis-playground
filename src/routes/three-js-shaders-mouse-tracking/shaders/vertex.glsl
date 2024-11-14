attribute vec2 aTrailPosition;

uniform vec2 uMousePosition;

varying vec2 vUv;
varying vec2 vTrailPosition;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    vUv = uv;
    vTrailPosition = aTrailPosition;
}
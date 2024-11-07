varying vec2 vUv;

float PI = 3.14159265359;

void main() {
    // Position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Final position
    vec4 projectionPosition = projectionMatrix * viewMatrix * modelPosition;

    gl_Position = projectionPosition;
}
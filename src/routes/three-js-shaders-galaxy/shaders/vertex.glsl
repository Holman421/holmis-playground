attribute float aScale;
attribute vec3 aRandomness;

uniform float uSize;
uniform float uTime;

varying vec3 vColor;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Spin
    float angle = atan(modelPosition.x, modelPosition.y);
    float distanceToCenter = length(modelPosition.xy);
    float angleOffset = (1.0 / distanceToCenter) * uTime * 0.2;
    angle += angleOffset;
    modelPosition.x = cos(angle);
    modelPosition.z = sin(angle);

    modelPosition.y = 1.0 - abs(modelPosition.y);

    // Randomness 
    modelPosition.xyz += aRandomness;
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    gl_PointSize = uSize * (random(modelPosition.xy));
    gl_PointSize *= max((1.0 / -viewPosition.z), 0.5);

    vColor = color;
}
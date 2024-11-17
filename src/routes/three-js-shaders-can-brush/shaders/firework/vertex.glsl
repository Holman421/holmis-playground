uniform float uSize;
uniform vec2 uResolution;
uniform float uProgress;
uniform vec2 uMousePosition;

attribute float aSize;
attribute float aTimeMultiplier;

varying float vProgress;

void main() {
    vec3 newPosition = vec3(position.xy, 0.0);

    float progress = uProgress * aTimeMultiplier;

    newPosition *= 0.1;

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);

    modelPosition.x *= uMousePosition.x * 10.0;
    modelPosition.y *= uMousePosition.y * 0.0;

    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    gl_PointSize = uSize * uResolution.y * aSize * 0.5;
    gl_PointSize *= 1.0 / -viewPosition.z;

    if(gl_PointSize < 1.0) {
        gl_Position = vec4(9999.0);
    }

    vProgress = progress;
}
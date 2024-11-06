void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (random(modelPosition.xy));
    gl_PointSize *= max((1.0 / -viewPosition.z), 0.5);

    vColor = color;
}
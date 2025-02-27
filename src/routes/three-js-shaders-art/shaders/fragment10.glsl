varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;

vec3 line(vec2 uv, vec2 start, vec2 end, float width, float height, vec3 lineColor) {
    vec2 dir = end - start;
    vec2 norm = normalize(vec2(-dir.y, dir.x));
    vec2 pos = uv - start;

    float projLength = dot(pos, normalize(dir));
    float lineLength = length(dir);
    float dist = abs(dot(pos, norm));

    float alongLine = smoothstep(-width, 0.0, projLength) *
    smoothstep(lineLength + width, lineLength, projLength);

    float crossLine = smoothstep(width, 0.0, dist);

    alongLine = 1.0 - step(alongLine, 0.5);
    crossLine = 1.0 - step(crossLine, 0.5);
    float finalLine = alongLine * crossLine;

    return lineColor * finalLine;
}

void main() {
    float length = distance(vUv - 0.5, vec2(0.0)) * 2.0;

    length -= 0.5;
    length = abs(length);
    length = 1.0 - length;
    length = smoothstep(0.8, 1.0, length);
    length = step(0.5, length);

    gl_FragColor = vec4(vec3(length), 1.0);
}

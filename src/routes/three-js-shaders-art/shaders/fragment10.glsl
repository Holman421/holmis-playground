varying vec2 vUv;
uniform float uTime;

#define PI 3.1415926535897932384626433832795
#define RS(a,b,x) (smoothstep(a-1.0,a+1.0,x)*(1.0-smoothstep(b-1.0,b+1.0,x)))

float rand(float n) {
    return fract(sin(n) * 43758.5453123);
}

float noise(float p) {
    float fl = floor(p);
    float fc = fract(p);
    return mix(rand(fl), rand(fl + 1.0), fc);
}

vec3 circle(vec2 uv, float radius, float width, vec3 color) {
    float dist = length(uv);
    dist = abs(dist - radius);
    float circle_value = 1.0 - smoothstep(width, width + 0.0025, dist);
    return color * circle_value;
}

vec3 _cross(vec2 uv, vec2 center, float radius, vec3 color) {
    vec2 d = uv - center;        // Get displacement vector from center
    float r = length(d);         // Calculate distance from center

    if(r > radius)
    return vec3(0.0);   // Outside the circle radius

    // Create thin lines along x=y and x=-y
    float lineWidth = 0.0025;
    float line1 = smoothstep(lineWidth, 0.0, abs(d.x - d.y));
    float line2 = smoothstep(lineWidth, 0.0, abs(d.x + d.y));

    return color * max(line1, line2);
}

vec2 wave(vec2 uv) {
    float angle = atan(uv.y, uv.x);
    angle = mod(angle + uTime * 1.5, 2.0 * PI);

    // Create a half-circle wide gradient (PI/2 width)
    float halfCircle = PI / 1.0;
    float normalizedAngle = mod(angle, halfCircle) / halfCircle;

    // Create gradient effect only within the first half of the circle
    float isInFirsthalf = step(0.0, angle) * step(angle, halfCircle);

    // Full intensity gradient (0 to 1)
    float waveFullIntensity = smoothstep(1.0, 0.0, normalizedAngle) * isInFirsthalf;

    // Half intensity gradient (0 to 0.5)
    float waveHalfIntensity = waveFullIntensity * 0.5;

    float fullCircle = length(uv);
    fullCircle = smoothstep(0.7, 0.701, fullCircle);
    fullCircle = 1.0 - fullCircle;

    return vec2(waveHalfIntensity * fullCircle, waveFullIntensity * fullCircle);
}

float pulseCircle(vec2 uv, vec3 color, float time) {
    float scaledTime = time * 0.15;
    vec2 translate = vec2(cos(scaledTime + noise(time * 0.45)), sin(scaledTime));
    vec2 center = uv + translate * 0.35;

    float pulse = step(0.0, sin(time * 15.0));
    float innerCircle = length(center);
    innerCircle = smoothstep(0.015, 0.02, innerCircle);
    vec3 outerRing = circle(center, 0.03, 0.0025, color);
    float outerRingValue = outerRing.r;

    float pulseWave = length(center) - mod(time * 0.2, 0.35) + 1.0;
    pulseWave = smoothstep(0.9, 1.0, pulseWave);
    float pulseWaveCutOff = step(1.0, pulseWave);
    pulseWaveCutOff = 1.0 - pulseWaveCutOff;
    pulseWave = pulseWaveCutOff * pulseWave;

    innerCircle = 1.0 - innerCircle;
    return innerCircle * pulse + outerRingValue + pulseWave;
}

float triangles(vec2 uv, vec2 center, float radius) {
    vec2 d = uv - center;
    return RS(-8.0, 0.0, d.x - radius) * (1.0 - smoothstep(7.0 + d.x - radius, 9.0 + d.x - radius, abs(d.y))) + RS(0.0, 8.0, d.x + radius) * (1.0 - smoothstep(7.0 - d.x - radius, 9.0 - d.x - radius, abs(d.y))) + RS(-8.0, 0.0, d.y - radius) * (1.0 - smoothstep(7.0 + d.y - radius, 9.0 + d.y - radius, abs(d.x))) + RS(0.0, 8.0, d.y + radius) * (1.0 - smoothstep(7.0 - d.y - radius, 9.0 - d.y - radius, abs(d.x)));
}

mat2 rotate2d(float _angle) {
    return mat2(cos(_angle), -sin(_angle), sin(_angle), cos(_angle));
}

vec3 triangle(vec2 uv, float radius, float width) {
    int N = 3;

    // Angle and radius from the current pixel
    float a = atan(uv.x, uv.y) + PI;
    float r = (PI * 2.0) / float(N);

    // Shaping function that modulate the distance
    float d = cos(floor(.5 + a / r) * r - a) * length(uv);

    return vec3(1.0 - smoothstep(.02, .025, d));
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;

    vec3 colorBlue = vec3(0.44, 0.78, 0.97);
    vec3 colorBlueDark = vec3(0.16, 0.3, 0.45);
    vec3 colorWhite = vec3(1.0);
    vec3 colorOrange = vec3(1.0, 0.36, 0.25);
    vec3 colorGray = vec3(0.5, 0.5, 0.5); // Gray color for the cross

    // Wave now returns vec2 with (halfIntensity, fullIntensity)
    vec2 waveValues = wave(uv);
    float waveHalfIntensity = waveValues.x; // 0-0.5 range for color mixing
    float waveFullIntensity = waveValues.y; // 0-1 range for pulse masking

    float pulse1 = pulseCircle(uv, colorOrange, uTime);
    pulse1 = pulse1 * waveFullIntensity; // Use full intensity gradient (0-1) as mask

    float pulse2 = pulseCircle(uv, colorBlue, uTime + 10.0);
    pulse2 = pulse2 * waveFullIntensity; // Use full intensity gradient (0-1) as mask

    // Create colored circles
    vec3 circle1 = circle(uv, 0.025, 0.001, colorBlue);
    vec3 circle2 = circle(uv, 0.3, 0.001, colorBlue);
    vec3 circle3 = circle(uv, 0.5, 0.001, colorBlue);
    vec3 circle4 = circle(uv, 0.7, 0.003, colorBlue);
    vec3 circle5 = circle(uv, 0.75, 0.003, colorBlueDark);
    vec3 circle6 = circle(uv, 0.85, 0.006, colorWhite);

    vec3 cross = _cross(uv, vec2(0.0), 0.7, colorGray);

    float circle5CutOff = abs(uv.y);
    circle5CutOff = step(sin(uTime) * 0.125 + 0.17, circle5CutOff);
    circle5CutOff -= step(abs(uv.x), sin(uTime) * 0.125 + 0.17);
    circle5 = circle5 * vec3(circle5CutOff);

    float circle6CutOff = abs(uv.y);
    circle6CutOff = step(0.05, circle6CutOff);
    circle6CutOff -= step(abs(uv.x), 0.05);
    float testCutOff = abs(uv.x + uv.y);
    testCutOff = step(0.1, testCutOff);
    float testCutOff2 = abs(uv.x - uv.y);
    testCutOff2 = step(0.1, testCutOff2);
    testCutOff = min(testCutOff, testCutOff2);
    circle6CutOff *= testCutOff;
    circle6 = circle6 * vec3(circle6CutOff);

    // Number of sides of your shape

    float scaledOscilation = sin(uTime * 2.0) * 0.05 + 0.05;

    vec2 triangleRotatedUv1 = uv * rotate2d(PI * 1.0);
    vec2 triangleRotatedUv2 = uv * rotate2d(PI * 0.5);
    vec2 triangleRotatedUv3 = uv * rotate2d(PI * 1.5);
    vec3 triangleValue1 = triangle(vec2(triangleRotatedUv1.x, triangleRotatedUv1.y + 0.815 + scaledOscilation), 0.5, 0.0025);
    vec3 triangleValue2 = triangle(vec2(uv.x, uv.y + 0.815 + scaledOscilation), 0.5, 0.0025);
    vec3 triangleValue3 = triangle(vec2(triangleRotatedUv2.x, triangleRotatedUv2.y + 0.815 + scaledOscilation), 0.5, 0.0025);
    vec3 triangleValue4 = triangle(vec2(triangleRotatedUv3.x, triangleRotatedUv3.y + 0.815 + scaledOscilation), 0.5, 0.0025);

    // gl_FragColor = vec4(triangleValue1, 1.0);

    // Combine the circles
    vec3 color = circle1 + circle2 + circle3 + circle4 + circle5 + circle6 + cross + triangleValue1 + triangleValue2 + triangleValue3 + triangleValue4;
    color = mix(color, colorBlue, waveHalfIntensity); // Use half intensity gradient (0-0.5) for colors
    color = mix(color, colorOrange, pulse1);
    color = mix(color, colorBlue, pulse2);

    gl_FragColor = vec4(color, 1.0);
}

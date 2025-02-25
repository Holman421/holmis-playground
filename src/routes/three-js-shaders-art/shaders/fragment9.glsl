varying vec2 vUv;
uniform float uTime;
uniform float uNoiseScale;
uniform float uSpeed;
uniform int uOctaves;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uOffsetX;
uniform float uOffsetY;
uniform float uZoom;  // Add this line

float scaledTime() {
    // Remove speed multiplication since we handle it in JavaScript
    return uTime * 0.5 * uSpeed;
}

const mat2 mtx = mat2(0.80, 0.60, -0.60, 0.80);

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);

    float res = mix(mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x), mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
}

float fbm(vec2 x, float H) {
    float G = exp2(-H);
    float f = 1.0 * (0.2 + uNoiseScale * 0.1);
    float a = 1.0;
    float t = 0.0;
    for(int i = 0; i < uOctaves; i++) {
        t += a * noise(f * x);
        x = mtx * x; // Apply rotation matrix to distort domain
        f *= 2.0;
        a *= G * 0.75;
    }
    return t;
}

float pattern(vec2 p, float H) {
    vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + scaledTime() * 0.1, H), fbm(p + vec2(5.2, 1.3), H));
    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2), H), fbm(p + 4.0 * q + scaledTime() * 0.1 + vec2(8.3, 2.8), H));
    vec2 w = vec2(fbm(p + 2.2 * r + vec2(7.1, 2.7), H), fbm(p + 2.2 * r + vec2(1.3, 7.2), H));
    vec2 a = vec2(fbm(p + 1.2 * w * scaledTime() * 0.1 + vec2(0.4, 8.7), H), fbm(p + 6.2 * w + vec2(1.9, 2.2), H));

    return fbm(p + 4.0 * a + scaledTime(), H);
}

vec3 colorGradient(float t) {
    // Use uniform colors instead of hardcoded values
    vec3 color1 = uColor1;
    vec3 color2 = uColor2;
    vec3 color3 = uColor3;
    vec3 color4 = uColor4;

    // Blend between multiple colors based on `t`
    if(t < 0.33)
        return mix(color1, color2, t * 3.0);
    else if(t < 0.66)
        return mix(color2, color3, (t - 0.33) * 3.0);
    else
        return mix(color3, color4, (t - 0.66) * 3.0);
}

vec3 lightDir = normalize(vec3(-0.5, 0.8, 1.0));

vec3 getNormal(vec2 uv) {
    float e = 0.002; // Small offset
    float n = pattern(uv, 0.5);
    float nx = pattern(uv + vec2(e, 0.0), 0.5) - n;
    float ny = pattern(uv + vec2(0.0, e), 0.5) - n;

    vec3 normal = normalize(vec3(nx, ny, 0.1)); // Approximate surface normal
    return normal;
}

void main() {
    // Center UV coordinates around (0,0)
    vec2 centeredUv = vUv - 0.5;

    // Apply zoom before other transformations
    centeredUv /= uZoom;

    // Scale around center point
    centeredUv *= (1.0 + uNoiseScale);

    // Apply offsets after scaling to maintain consistent movement
    centeredUv += vec2(uOffsetX, uOffsetY);

    float noisePattern = pattern(centeredUv, 0.5);
    noisePattern = smoothstep(0.0, 1.0, noisePattern);

    vec3 col = colorGradient(noisePattern);

    // Compute fake shading
    vec3 normal = getNormal(centeredUv);
    float diffuse = dot(normal, lightDir);
    diffuse = clamp(diffuse * 0.5 + 0.5, 0.0, 1.0);

    // Apply shading
    col *= diffuse;

    gl_FragColor = vec4(col, 1.0);
}
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;

//-----constants-----//
const int PUDDLES = 0, PLAD = 1, HORIZONTAL_WAVES = 2, VERTICAL_WAVES = 3;
const vec3 COLOR_A = vec3(0.3, 0.3, 0.3), COLOR_B = vec3(0.8, 0.8, 0.8), COLOR_C = vec3(0.01, 0.01, 0.01);
const float SPEED_A = 0.05, SPEED_B = -0.05, REC_MULT = 2.2;
const float BLEND_T = 20.0, START_T = 20.0;
const vec3 FBM_Ws_FROM = vec3(1.0, 2.0, 4.0), FBM_Ws_TO = vec3(1.0);
const int RECURSIONS = 0, ROTATIONS = 10, DEGREE = 3;
const bool VIGNETTE = true, SHARPEN = true;

//-----initialized variables-----//
mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
int VARIANT = PUDDLES;

float fbm_w(int i) {
    float t = smoothstep(START_T, START_T + BLEND_T, uTime);
    if(i == 0)
    return mix(FBM_Ws_FROM.x, FBM_Ws_TO.x, t);
    if(i == 1)
    return mix(FBM_Ws_FROM.y, FBM_Ws_TO.y, t);
    if(i == 2)
    return mix(FBM_Ws_FROM.z, FBM_Ws_TO.z, t);
    return 0.0;
}

float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return -1.0 + 2.0 * fract(sin(h) * 43758.5453123);
}

float bilinear(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    vec2 f_pow = f;
    for(int i = 0; i < DEGREE - 1; i++) {
        f_pow *= f;
    }
    vec2 u = f_pow * (3.0 - 2.0 * f);

    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm_helper(in vec2 p) {
    float f = 0.0;
    float accum = 0.0;
    for(int i = 0; i < ROTATIONS; i++) {
        float w = pow(0.5, float(i));
        accum += w;
        f += w * bilinear(p);
        p = m * p * REC_MULT;
    }
    return f / accum;
}

vec2 fbm(vec2 p) {
    if(VARIANT == PUDDLES) {
        return vec2(fbm_helper(p.xy), fbm_helper(p.yx));
    } else if(VARIANT == PLAD) {
        return vec2(fbm_helper(p.xx), fbm_helper(p.yy));
    } else if(VARIANT == HORIZONTAL_WAVES) {
        return vec2(fbm_helper(p.xy), fbm_helper(p.yy));
    } else if(VARIANT == VERTICAL_WAVES) {
        return vec2(fbm_helper(p.xy), fbm_helper(p.xx));
    }
    return vec2(0.0);
}

vec3 map(vec2 p) {
    float f = dot(fbm(fbm_w(0) * (SPEED_A * uTime + p + fbm(SPEED_B * uTime + fbm_w(1) * (p + fbm(fbm_w(2) * p))))), vec2(1.0, -1.0));

    float wA_B = smoothstep(-0.8, 0.8, f);
    float wAB_C = smoothstep(-1.0, 1.0, fbm_helper(p));
    return mix(mix(COLOR_A, COLOR_B, wA_B), COLOR_C, wAB_C);
}

void main() {
    vec2 p = (-uResolution.xy + 2.0 * vUv * uResolution.xy) / uResolution.y;
    vec3 col = map(p);

    vec2 uv = vUv;
    vec3 mixer = vec3(uv, 0.5 + 0.5 * sin(uTime));

    if(SHARPEN) {
        float e = 0.0045;
        vec3 colc = map(p);
        float g = dot(colc, vec3(0.333));
        vec3 cola = map(p + vec2(e, 0.0));
        float dx = dot(cola, vec3(0.333));
        vec3 colb = map(p + vec2(0.0, e));
        float dy = dot(colb, vec3(0.333));

        col = colc;
        float t = smoothstep(0.0, START_T, uTime);
        col += t * mixer * 3.0 * abs(2.0 * g - dx - dy);
    }

    if(VIGNETTE) {
        col *= pow(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.1);
    }

    gl_FragColor = vec4(col, 1.0);
}
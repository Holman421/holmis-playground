varying vec2 vUv;
uniform float uTime;

const int NUM_OF_STEPS = 128;
const float MIN_DIST_TO_SDF = 0.001;
const float MAX_DIST_TO_TRAVEL = 64.0;

float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

float sdfSphere(vec3 p, vec3 c, float r) {
    return length(p - c) - r;
}

float sdfPlane(vec3 p, vec3 n, float h) {
    return dot(p, n) + h;
}

float map(vec3 p) {
    float radius = 0.5;
    vec3 center = vec3(0.0);

    center = vec3(0.0, -0.4 + sin(uTime * 1.0) * 0.5, 0.0);

    float sphere = sdfSphere(p, center, radius);
    float m = sphere;

    float h = 1.0;
    vec3 normal = vec3(0.0, 1.0, 0.0);
    float plane = sdfPlane(p, normal, h);
    m = min(m, plane);

    m = opSmoothUnion(m, plane, 0.5);

    return m;
}

vec3 getNormal(vec3 p) {
    vec2 d = vec2(0.01, 0.0);
    float gx = map(p + d.xyy) - map(p - d.xyy);
    float gy = map(p + d.yxy) - map(p - d.yxy);
    float gz = map(p + d.yyx) - map(p - d.yyx);
    return normalize(vec3(gx, gy, gz));
}

float rayMarch(vec3 ro, vec3 rd, float maxDist) {
    float dist = 0.0;
    for(int i = 0; i < NUM_OF_STEPS; i++) {
        vec3 currentPos = ro + rd * dist;
        float distToSdf = map(currentPos);

        if(distToSdf < MIN_DIST_TO_SDF) {
            break;
        }

        dist += distToSdf;

        if(dist >= maxDist) {
            break;
        }
    }
    return dist;
}

void main() {
    vec2 centeredUv = (vUv - 0.5) * 2.0;
    vec3 finalColor = vec3(0.0);

    vec3 ro = vec3(0.0, 0.0, -2.0);
    vec3 rd = vec3(centeredUv, 1.0);

    float dist = rayMarch(ro, rd, MAX_DIST_TO_TRAVEL);

    if(dist < MAX_DIST_TO_TRAVEL) {
        finalColor = vec3(1.0);

        vec3 p = ro + rd * dist;
        vec3 normal = getNormal(p);
        finalColor = normal;

        vec3 lightColor = vec3(1.0);
        vec3 lightSource = vec3(2.5, 2.5, -1.0);
        float diffuseStrength = max(0.0, dot(normalize(lightSource), normal));
        vec3 diffuse = lightColor * diffuseStrength;

        vec3 viewSource = normalize(ro);
        vec3 reflectSourse = normalize(reflect(-lightSource, normal));
        float specularStrength = pow(max(0.0, dot(viewSource, reflectSourse)), 64.0);
        vec3 specular = lightColor * specularStrength;

        vec3 lighting = diffuse * 0.75 + specular * 0.25;
        finalColor = lighting;

        vec3 lightDirection = normalize(lightSource);
        float distToLightSource = length(lightSource - p);
        ro = p + normal * 0.1;
        rd = lightDirection;
        float dist = rayMarch(ro, rd, distToLightSource);
        if(dist < distToLightSource) {
            finalColor *= 0.25;
        }

        finalColor = pow(finalColor, vec3(1.0 / 2.2));
    }

    gl_FragColor = vec4(finalColor, 1.0);
    // gl_FragColor = vec4(testColor, 1.0);
}

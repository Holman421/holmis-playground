uniform vec2 uMousePosition;
uniform vec2 uPreviousMousePosition;
uniform sampler2D uTrailTexture;
uniform vec2 uResolution;
uniform float uMouseRadius;
varying vec2 vUv;

float distToLine(vec2 p, vec2 a, vec2 b) {
    // If points are very close, just use distance to current point to avoid artifacts
    if (length(b - a) < 0.001) {
        return length(p - a);
    }
    vec2 pa = p - a;
    vec2 ba = b - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * t);
}

void main() {
    vec2 pixelCoord = vUv * uResolution;
    vec2 mousePixelCoord = uMousePosition * uResolution;
    vec2 prevMousePixelCoord = uPreviousMousePosition * uResolution;
    
    float dist = distToLine(pixelCoord, mousePixelCoord, prevMousePixelCoord);
    
    // Smoother falloff for better trail quality
    float strength = smoothstep(uMouseRadius, 0.0, dist);
    
    // Get previous trail value
    vec4 previousTrail = texture2D(uTrailTexture, vUv);
    
    // Prevent excessive buildup by capping the maximum intensity
    float maxIntensity = 0.8; // Maximum allowable intensity
    float currentIntensity = previousTrail.r + strength * 0.5; // Lower strength value (was 0.7)
    
    // Apply capping to avoid excessive white
    float cappedIntensity = min(currentIntensity, maxIntensity);
    
    // Create new color with capped intensity
    vec4 color = vec4(cappedIntensity);
    
    // Apply decay
    color *= 0.96;
    
    gl_FragColor = color;
}

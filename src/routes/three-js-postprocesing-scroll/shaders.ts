export const CustomShaderMaterial = {
	uniforms: {
		map: { value: null },
		opacity: { value: 1.0 },
		grayscale: { value: 0.0 }
	},
	vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
	fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        uniform float grayscale;
        varying vec2 vUv;

        void main() {
            vec4 texColor = texture2D(map, vUv);
            
            // Convert to grayscale
            float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
            vec3 grayColor = vec3(gray);
            
            // Interpolate between color and grayscale based on grayscale uniform
            vec3 finalColor = mix(texColor.rgb, grayColor, grayscale);
            
            gl_FragColor = vec4(finalColor, texColor.a * opacity);
        }
    `
};

export const ChromaticAberrationShader = {
	uniforms: {
		tDiffuse: { value: null },
		uOffset: { value: 0.0 }
	},
	vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
	fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uOffset;
        varying vec2 vUv;

        void main() {
            float x = vUv.x * 2.0 - 1.0;
            
            // Calculate distortion strength (always positive direction)
            float distortionStrength = pow(abs(x), 5.0) * 1.25;
            distortionStrength *= abs(uOffset) * 0.1;

            // Use fixed direction regardless of scroll direction
            float direction = x < 0.0 ? 1.0 : -1.0;
            
            // Keep stretch direction consistent
            float yStretch = 1.0 + (abs(uOffset) * 0.1);
            float yOffset = (vUv.y - 0.5) * yStretch + 0.5;
            
            // Apply consistent direction warp
            vec2 offsetUV = vec2(0.0, distortionStrength * direction);
            vec2 finalUV = vec2(vUv.x, yOffset) + offsetUV;
            
            vec4 distortedColor = texture2D(tDiffuse, finalUV);
            
            gl_FragColor = distortedColor;
        }
    `
};

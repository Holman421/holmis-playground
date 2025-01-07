import { Vector2 } from 'three';

/**
 * Dot screen shader
 * based on glfx.js sepia shader
 * https://github.com/evanw/glfx.js
 */

const CustomPass = {
	name: 'CustomPass',

	uniforms: {
		tDiffuse: { value: null },
		tSize: { value: new Vector2(512, 384) },
		center: { value: new Vector2(0.7, 0.3) },
		angle: { value: 2.14 },
		uTime: { value: 0.0 },
		uProgress: { value: 0.0 },
		uScale: { value: 1.0 },
		uTimeSpeed: { value: 1.0 }
	},

	vertexShader: /* glsl */ `

        varying vec2 vUv;

        void main() {

            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        }`,

	fragmentShader: /* glsl */ `

        uniform vec2 center;
        uniform float angle;
        uniform vec2 tSize;
        uniform float uTime;
        uniform float uProgress;
        uniform float uScale;
        uniform float uTimeSpeed;

        uniform sampler2D tDiffuse;

        varying vec2 vUv;

        void main() {

            vec2 newUV = vUv;

            vec2 p = vUv - 0.5;
            p += 0.15*cos(uScale*2.3*p.yx + uTime * uTimeSpeed + vec2(1.4, 2.3));
            p += 0.12*cos(uScale*3.1*p.yx + uTime * uTimeSpeed * 1.5 + vec2(2.1, 0.8));
            p += 0.2*cos(uScale*4.2*p.yx + uTime * uTimeSpeed * 2.2 + vec2(1.7, 2.9));
            p += 0.34*cos(uScale*5.7*p.yx + uTime * uTimeSpeed * 2.8 + vec2(0.9, 1.3));

            newUV.x = mix(vUv.x, length(p), uProgress);
            newUV.y = mix(vUv.y, 0.0, uProgress);
            
            vec4 color = texture2D( tDiffuse, newUV );
            gl_FragColor = color;
            // gl_FragColor = vec4(length(p), 0.0, 0.0, 1.0);

        }`
};

export { CustomPass };

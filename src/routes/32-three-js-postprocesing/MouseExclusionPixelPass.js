// Custom shader to extend RenderPixelatedPass with mouse exclusion zone
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Shader that pixelates the scene but excludes a rectangular area around the mouse
export const MouseExclusionPixelPass = {
	uniforms: {
		tDiffuse: { value: null },
		resolution: { value: new THREE.Vector2() },
		pixelSize: { value: 6.0 },
		mousePosition: { value: new THREE.Vector2(0.5, 0.5) },
		targetPosition: { value: new THREE.Vector2(0.5, 0.5) }, // Target position for staggered movement
		exclusionActive: { value: false },
		exclusionSize: { value: 0.15 }, // Size as a percentage of screen height
		borderWidth: { value: 0.003 }, // Border width as percentage of screen height
		borderColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) } // Border color (white)
	},
	vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
	fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelSize;
    uniform vec2 mousePosition;
    uniform vec2 targetPosition;
    uniform bool exclusionActive;
    uniform float exclusionSize;
    uniform float borderWidth;
    uniform vec3 borderColor;
    
    varying vec2 vUv;
    
    void main() {
      // Calculate pixel grid size based on pixelSize
      vec2 dxy = pixelSize / resolution;
      
      // Calculate aspect ratio for proper rectangle sizing
      float aspectRatio = resolution.x / resolution.y;
      
      // Define rectangle dimensions
      float rectWidth = exclusionSize / aspectRatio; 
      float rectHeight = exclusionSize;
      
      // Check if current pixel is inside the mouse rectangle exclusion zone
      bool insideExclusion = false;
      bool onBorder = false;
      
      if (exclusionActive) {
        // Calculate distance from current UV to target position (staggered mouse position)
        vec2 diff = abs(vUv - targetPosition);
        
        // Check if we're inside the outer rectangle (including border)
        bool insideOuter = (diff.x < (rectWidth/2.0 + borderWidth)) && (diff.y < (rectHeight/2.0 + borderWidth));
        
        // Check if we're inside the inner rectangle (excluding border)
        insideExclusion = (diff.x < rectWidth/2.0) && (diff.y < rectHeight/2.0);
        
        // On border if inside outer but not inside inner
        onBorder = insideOuter && !insideExclusion;
      }
      
      // Apply different sampling based on exclusion test
      vec2 pixelatedUv;
      vec4 finalColor;
      
      if (insideExclusion) {
        // Inside exclusion zone - use original texture coordinates (no pixelation)
        pixelatedUv = vUv;
        finalColor = texture2D(tDiffuse, pixelatedUv);
      } else if (onBorder) {
        // On border - apply the border color
        pixelatedUv = vUv;
        finalColor = texture2D(tDiffuse, pixelatedUv);
        // Mix with border color
        finalColor.rgb = mix(finalColor.rgb, borderColor, 0.7);
      } else {
        // Outside exclusion zone - apply pixelation
        // Snap UVs to nearest pixel grid point
        pixelatedUv = dxy * floor(vUv / dxy);
        finalColor = texture2D(tDiffuse, pixelatedUv);
      }
      
      gl_FragColor = finalColor;
    }
  `
};

// Create the pass
export function createMouseExclusionPixelPass(renderer) {
	const pass = new ShaderPass(MouseExclusionPixelPass);
	pass.renderToScreen = true;

	// Set resolution based on renderer
	const size = new THREE.Vector2();
	renderer.getSize(size);
	pass.uniforms.resolution.value.set(size.x, size.y);

	// Set default exclusion to active for testing
	pass.uniforms.exclusionActive.value = true;

	// Initialize target position to match mouse position
	pass.uniforms.targetPosition.value.copy(pass.uniforms.mousePosition.value);

	// Initialize with default pixel size matching the main pixelation
	pass.uniforms.pixelSize.value = 6.0;

	return pass;
}

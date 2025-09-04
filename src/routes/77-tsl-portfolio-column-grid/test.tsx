// 			const finalRotatedPos = mix(
// 				baseRotPos,
// 				atRotZ,
// 				isAtTargetState.select(float(1.0), float(0.0))


// const blendStart = float(0.8); // start blending at 80% progress
// 			const blendWidth = float(0.2); // reach full blend by 100%
// 			const rawBlend = animationProgressAttr
// 				.sub(blendStart)
// 				.div(blendWidth)
// 				.clamp(0.0, 1.0);
// 			// Smoothstep-like easing: b*b*(3 - 2*b)
// 			const blendEased = rawBlend
// 				.mul(rawBlend)
// 				.mul(float(3.0).sub(rawBlend.mul(2.0)));

// 			// While animating: blend from current animated rotation to the final at-target rotation
// 			const blendedDuringAnim = mix(baseRotPos, atRotZ, blendEased);
// 			// When state is AT_TARGET, use full at-target rotation
// 			const finalRotatedPos = isAtTargetState.select(atRotZ, blendedDuringAnim);
varying vec2 vUv;

void main() {
    //Patter 3
    // float strength = vUv.x;

    //Patter 4
    // float strength = vUv.y;

    //Patter 5
    // float strength = 1.0 - vUv.y;

    //Patter 6
    // float strength = vUv.y * 10.0;

    //Patter 7
    // float strength = mod(vUv.y * 10.0, 1.0);

    //Patter 8
    // float strength = mod(vUv.y * 10.0, 1.0);
    // strength = step(0.5, strength);

    //Patter 9
    // float strength = mod(vUv.y * 10.0, 1.0);
    // strength = step(0.8, strength);

    //Patter 10
    // float strength = mod(vUv.x * 10.0, 1.0);
    // strength = step(0.8, strength);

    // //Patter 11
    // float strength = step(0.8, mod(vUv.x * 10.0, 1.0));
    // strength += step(0.8, mod(vUv.y * 10.0, 1.0));

    // //Patter 12
    // float strength = step(0.8, mod(vUv.x * 10.0, 1.0));
    // strength *= step(0.8, mod(vUv.y * 10.0, 1.0));

    // //Patter 13
    // float strength = step(0.8, mod(vUv.y * 10.0, 1.0));
    // strength -= step(0.6, mod(vUv.x * 10.0, 1.0));

    //Patter 14
    float barX = step(0.4, mod(vUv.x * 10.0, 1.0));
    barX *= step(0.8, mod(vUv.y * 10.0, 1.0));

    float barY = step(0.8, mod(vUv.x * 10.0, 1.0));
    barY *= step(0.4, mod(vUv.y * 10.0, 1.0));

    float strength = barX + barY;

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}
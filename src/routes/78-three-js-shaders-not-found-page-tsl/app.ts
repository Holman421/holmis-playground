import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import {
	pass,
	time,
	instanceIndex,
	vertexIndex,
	sin,
	cos,
	vec2,
	vec3,
	vec4,
	float,
	Fn,
	mix,
	uniform,
	smoothstep,
	instancedArray,
	length,
	atan,
	normalize,
	abs,
	pow,
	add,
	sub,
	If,
	fract
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { simplexNoise3d } from '$lib/utils/webGPU/simplexNoise3d';

interface SketchOptions {
  dom: HTMLElement;
}

type UniformNode<T> = ReturnType<typeof uniform<T>>;

interface SketchUniforms {
  currentMouse: UniformNode<THREE.Vector2>;
  mouseMode: UniformNode<number>;
  clickPullProgress: UniformNode<number>;
  noiseScale: UniformNode<number>;
  noiseStrength: UniformNode<number>;
  circleNoiseDivisor: UniformNode<number>;
  streamNoiseDivisor: UniformNode<number>;
  circularForce: UniformNode<number>;
  rotationSpeed: UniformNode<number>;
  attractionStrength: UniformNode<number>;
  progress: UniformNode<number>;
  bloomStrength: UniformNode<number>;
  bloomRadius: UniformNode<number>;
  bloomThreshold: UniformNode<number>;
  simTime: UniformNode<number>;
  fadingSpeed: UniformNode<number>;
}

export default class Sketch {
  scene: THREE.Scene;
  container: HTMLElement;
  width: number;
  height: number;
  pixelRatio: number;
  renderer: THREE.WebGPURenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  isPlaying: boolean;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;

  dummy!: THREE.Mesh;
  targetMouse: THREE.Vector3;
  size: number;
  count: number;

  uniforms!: SketchUniforms;
  particlesPositionsBuffer!: THREE.StorageBufferNode;
  particlesInfoBuffer!: THREE.StorageBufferNode;

  material!: THREE.PointsNodeMaterial;
  points!: THREE.Points;

  computeNode!: THREE.ComputeNode;

  circleCount: number;
  streamCount: number;

  postProcessing!: THREE.PostProcessing;
  bloomPass!: THREE.Node;
  clock!: THREE.Clock;
  onPointerMove?: (e: PointerEvent) => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onResize?: () => void;
  onButtonClick?: () => void;
  onButtonMouseEnter?: () => void;
  onButtonMouseLeave?: () => void;
  hoverButton?: HTMLElement;

  constructor(options: SketchOptions) {
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.renderer = new THREE.WebGPURenderer();
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(new THREE.Color(0x000000), 1);
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 1000);
    this.camera.position.set(0.0, 0.0, 4.0);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.targetMouse = new THREE.Vector3(0, 0, 0);

    this.size = 256;
    this.circleCount = this.size ** 2;
    this.streamCount = 75000;
    this.count = this.circleCount + this.streamCount;

    this.uniforms = {
      currentMouse: uniform(new THREE.Vector2(0, 0)),
      mouseMode: uniform(1.0),
      clickPullProgress: uniform(0.0),
      noiseScale: uniform(4.0),
      noiseStrength: uniform(0.15),
      circleNoiseDivisor: uniform(100.0),
      streamNoiseDivisor: uniform(150.0),
      circularForce: uniform(0.7),
      rotationSpeed: uniform(0.15),
      attractionStrength: uniform(0.1),
      progress: uniform(0.0),
      bloomStrength: uniform(0.3),
      bloomRadius: uniform(0.75),
      bloomThreshold: uniform(0.05),
      simTime: uniform(0.0),
      fadingSpeed: uniform(0.25),
    };

    this.isPlaying = true;
    this.setupLights();
    this.setUpCompute();
    this.addObjects();
    this.setupBloom();
    this.setUpResize();
    this.setupRaycaster();
    this.setUpSettings();
    this.setupButtonHover();

    this.computeNode = this.createComputeShader();

    this.init();
  }

  async init() {
    await this.renderer.init();
    this.render();
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  }

  setUpCompute() {
    const positions = new Float32Array(this.count * 3);
    const infoArray = new Float32Array(this.count * 4);

    // SETUP CIRCLE
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i + j * this.size;
        const theta = Math.random() * Math.PI * 2;
        const r = 0.5 + Math.random() * 0.5;
        positions[index * 3 + 0] = Math.cos(theta) * r;
        positions[index * 3 + 1] = Math.sin(theta) * r;
        positions[index * 3 + 2] = 0;

        infoArray[index * 4 + 0] = 0.5 + Math.random();
        infoArray[index * 4 + 1] = 0.5 + Math.random();
        infoArray[index * 4 + 2] = 1;
        infoArray[index * 4 + 3] = 1;
      }
    }

    // SETUP STREAM
    for (let i = 0; i < this.streamCount; i++) {
      const index = this.circleCount + i;

      const speed = 0.2 + Math.random() * 0.3;
      const streamType = i % 2; // 0: Straight, 1: Bent
      const systemIndex = Math.floor(i / 2) % 2; // 0: Left, 1: Right
      const randomOffset = Math.random();

      // Match compute shader target at simTime = 0 so particles spawn in-stream.
      const life = randomOffset;
      const scale = 2.1;

      const startX = 0.0;
      const startY = 0.475 * scale;
      const endVerticalX = 0.0;
      const endVerticalY = -0.525 * scale;
      const turnPointX = -0.4 * scale;
      const turnPointY = 0.1 * scale;
      const endBentX = 0.4 * scale;
      const endBentY = 0.1 * scale;

      let targetX = 0.0;
      let targetY = 0.0;

      if (streamType < 0.5) {
        targetX = startX + (endVerticalX - startX) * life;
        targetY = startY + (endVerticalY - startY) * life;
      } else {
        const split = 0.41;
        if (life < split) {
          const t = life / split;
          targetX = startX + (turnPointX - startX) * t;
          targetY = startY + (turnPointY - startY) * t;
        } else {
          const t = (life - split) / (1.0 - split);
          targetX = turnPointX + (endBentX - turnPointX) * t;
          targetY = turnPointY + (endBentY - turnPointY) * t;
        }
      }

      targetX += systemIndex < 0.5 ? -2.0 : 2.25;

      const laneOffsetX = Math.sin(randomOffset * 132.5) * 0.065;
      const laneOffsetY = Math.cos(randomOffset * 452.1) * 0.065;

      positions[index * 3 + 0] = targetX + laneOffsetX;
      positions[index * 3 + 1] = targetY + laneOffsetY;
      positions[index * 3 + 2] = Math.sin(randomOffset * 0.01) * 0.05;

      infoArray[index * 4 + 0] = speed;
      infoArray[index * 4 + 1] = streamType;
      infoArray[index * 4 + 2] = systemIndex;
      infoArray[index * 4 + 3] = randomOffset;
    }

    this.particlesPositionsBuffer = instancedArray(positions, "vec3");
    this.particlesInfoBuffer = instancedArray(infoArray, "vec4");
  }

  private createComputeShader() {
    const computeFn = Fn(() => {
      const pos = this.particlesPositionsBuffer.element(instanceIndex);
      const info = this.particlesInfoBuffer.element(instanceIndex);

      const newPos = pos.toVar();
      const mouse = this.uniforms.currentMouse;
      const uCircularForce = this.uniforms.circularForce;
      const uAttractionStrength = this.uniforms.attractionStrength;
      const uClickPullProgress = this.uniforms.clickPullProgress;
      const uNoiseScale = this.uniforms.noiseScale;
      const uNoiseStrength = this.uniforms.noiseStrength;
      const uCircleNoiseDivisor = this.uniforms.circleNoiseDivisor;
      const uStreamNoiseDivisor = this.uniforms.streamNoiseDivisor;
      const uMouseMode = this.uniforms.mouseMode;
      const uRotationSpeed = this.uniforms.rotationSpeed;
      const uProgress = this.uniforms.progress;

      // ---------- CIRCLE LOGIC ----------
      If(instanceIndex.lessThan(this.circleCount), () => {
        const radius = float(length(newPos.xy)).mul(0.25).add(0.75).toVar();

        const distToRadius = abs(newPos.x.sub(radius));
        const circularForce = float(1.0)
          .sub(smoothstep(0.0, 0.4, distToRadius))
          .toVar();

        const rotMix = mix(float(0.7), float(0.8), circularForce.mul(uCircularForce));
        const angle = atan(newPos.y, newPos.x).sub(info.y.mul(uRotationSpeed).mul(rotMix)).toVar();

        const targetRadius = mix(info.x, float(0.9), float(1.65));
        const radiusMix = mix(float(0.2), float(0.5), circularForce.mul(uCircularForce));
        radius.addAssign(targetRadius.sub(radius).mul(radiusMix));

        const targetPos = vec3(cos(angle), sin(angle), float(0.0)).mul(radius);

        newPos.xy.addAssign(targetPos.xy.sub(newPos.xy).mul(uAttractionStrength));

        const scaledRandom = pow(abs(info.x.sub(0.25)), 10.0);
        const scaledProgress = pow(uProgress, 2.0);
        const zVal = scaledRandom.mul(scaledProgress).mul(50.0).add(scaledProgress.mul(5.0));
        newPos.z.assign(zVal);

        // ---------- STREAM LOGIC ----------
      }).Else(() => {
        const targetPos2D = vec2(0.0).toVar();
        const simTime = this.uniforms.simTime;
        const life = fract(simTime.mul(info.x).add(info.w)).toVar();

        const scale = float(2.1);
        const startP = vec2(0.0, 0.475).mul(scale);
        const endVertical = vec2(0.0, -0.525).mul(scale);

        const turnPoint = vec2(-0.4, 0.1).mul(scale);
        const endBent = vec2(0.4, 0.1).mul(scale);

        If(info.y.lessThan(0.5), () => {
          targetPos2D.assign(mix(startP, endVertical, life));
        }).Else(() => {
          const split = float(0.41);
          If(life.lessThan(split), () => {
            const t = life.div(split);
            targetPos2D.assign(mix(startP, turnPoint, t));
          }).Else(() => {
            const t = life.sub(split).div(float(1.0).sub(split));
            targetPos2D.assign(mix(turnPoint, endBent, t));
          });
        });

        If(info.z.lessThan(0.5), () => {
          targetPos2D.x.addAssign(-2.0);
        }).Else(() => {
          targetPos2D.x.addAssign(2.25);
        });

        // 1. DIFFERENT ATTRACTION POINTS (Parallel Lanes)
        // We use their unique random seed to assign them a permanent, dedicated offset from the center.
        const laneOffset = vec2(sin(info.w.mul(132.5)), cos(info.w.mul(452.1))).mul(0.065); // Controls the total width of the stream

        // This is the particle's unique target coordinate
        const personalTarget = targetPos2D.add(laneOffset);
        const zBase = sin(info.w.mul(0.01)).mul(0.05);

        If(life.lessThan(0.05), () => {
          newPos.xy.assign(personalTarget);
          newPos.z.assign(zBase);
        }).Else(() => {
          // 2. THE "SLACK LEASH" FIX
          const distToTarget = length(personalTarget.sub(newPos.xy));

          // If they are within 0.08 units of their lane, attraction drops to 0.
          // This creates a "dead zone" where the curl noise can freely group and clump them
          // without the jitter fiercely fighting to separate them again!
          const freedomMask = smoothstep(0.0, 0.08, distToTarget);

          // Mouse Interaction Mask (same as before)
          const distToMouse = length(newPos.xy.sub(mouse));
          const interactionMask = smoothstep(0.0, 0.3, distToMouse);

          const effectiveAttraction = uAttractionStrength
            .mul(0.4)
            .mul(freedomMask)
            .mul(interactionMask);

          newPos.xy.addAssign(personalTarget.sub(newPos.xy).mul(effectiveAttraction));
          newPos.z.assign(zBase);
        });
      });

      // ---------- COMMON PHYSICS ----------

      const simTime = this.uniforms.simTime;
      const noiseTime = simTime.mul(0.25);

      // Use projected 2D position (Z=0) for noise sampling to ensure all particles
      // (streams and circle) flow in identical coherent lines, avoiding lack of clumping.
      const noisePos = vec3(newPos.xy, float(0.0)).mul(uNoiseScale);
      const noisePosTime = vec3(noisePos.x, noisePos.y, noisePos.z.add(noiseTime));

      const noiseFn = simplexNoise3d as unknown as (v: THREE.Node) => THREE.Node;
      const dx = sub(
        noiseFn(add(noisePosTime, vec3(0.1, 0, 0))),
        noiseFn(sub(noisePosTime, vec3(0.1, 0, 0))),
      );
      const dy = sub(
        noiseFn(add(noisePosTime, vec3(0, 0.1, 0))),
        noiseFn(sub(noisePosTime, vec3(0, 0.1, 0))),
      );

      // Cross gradient approximating curl noise
      const curlVec = vec2(dy.negate(), dx).mul(10.0);

      // Apply noise force - unified strength
      If(instanceIndex.lessThan(this.circleCount), () => {
        newPos.xy.addAssign(curlVec.mul(uNoiseStrength).div(uCircleNoiseDivisor));
      }).Else(() => {
        newPos.xy.addAssign(curlVec.mul(uNoiseStrength).div(uStreamNoiseDivisor));
      });

      const dir = normalize(newPos.xy.sub(mouse));
      const clickMode = float(1.0).sub(uMouseMode).mul(0.5);
      const repelMode = uMouseMode.add(1.0).mul(0.5);

      // Default mode: preserve original repel interaction exactly.
      const repelDist = length(newPos.xy.sub(mouse)).sub(0.1);
      const repelInteraction = smoothstep(0.05, 0.0, repelDist);

      // Click mode: use ~3x larger magnetic radius.
      const pullDist = length(newPos.xy.sub(mouse)).sub(0.75);
      const pullInteraction = smoothstep(0.15, 0.0, pullDist);

      // Pseudo-random per-particle mask that gradually includes more particles
      // as click is held, eventually covering all particles.
      const pullSeed = fract(sin(info.x.mul(127.1).add(info.y.mul(311.7))).mul(43758.5453));
      const pullMask = smoothstep(pullSeed.sub(0.05), pullSeed.add(0.05), uClickPullProgress);

      const repelForce = dir.mul(0.1).mul(repelInteraction).mul(repelMode);
      const pullForce = dir.negate().mul(0.07).mul(pullInteraction).mul(clickMode).mul(pullMask);

      newPos.xy.addAssign(repelForce.add(pullForce));

      return pos.assign(newPos);
    });

    return computeFn().compute(this.count);
  }

  setupStreamData() {
    // Removed
  }

  createStreamComputeShader() {
    // Removed
  }

  addStreamObjects() {
    // Removed
  }

  addObjects() {
    this.material = new THREE.PointsNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const uTime = time;
    const uProgress = this.uniforms.progress;

    // Use vertexIndex to access the buffer for points
    const bufferIndex = vertexIndex;

    this.material.positionNode = Fn(() => {
      return this.particlesPositionsBuffer.element(bufferIndex);
    })();

    this.material.sizeNode = Fn(() => {
      return float(0.0075);
    })();

    this.material.colorNode = Fn(() => {
      const finalColor = vec4(0.0).toVar();
      const info = this.particlesInfoBuffer.element(bufferIndex);

      If(bufferIndex.lessThan(this.circleCount), () => {
        const pos = this.particlesPositionsBuffer.element(bufferIndex);
        const angle = atan(pos.y, pos.x);
        const dimFactor = smoothstep(-0.5, 0.75, sin(angle.add(uTime.mul(0.6)))).toVar();
        const animatedColor = mix(
          vec3(1.0, 0.18039216, 0.14117648),
          vec3(0.2, 0.23529412, 0.85490196),
          dimFactor,
        );
        const colorBrightness = float(0.05).add(float(0.95).mul(dimFactor));
        const circleAlpha = float(1.0).add(float(0.0).mul(dimFactor));
        const scaledProgress = smoothstep(0.0, 0.25, uProgress);
        const progressFade = float(1.0).sub(scaledProgress.mul(0.15));
        const finalCircleColor = animatedColor.mul(colorBrightness).mul(progressFade);
        finalColor.assign(vec4(finalCircleColor, circleAlpha.mul(progressFade)));
      }).Else(() => {
        const simTime = this.uniforms.simTime;
        const life = fract(simTime.mul(info.x).add(info.w));

        // Create a moving wave of opacity along the stream
        // life (0-1) acts as the spatial coordinate along the path
        const wave = sin(life.mul(4.5).sub(simTime.mul(2.0)));
        const dimFactor = smoothstep(-0.6, 0.7, wave).toVar();
        const animatedAlpha = float(1.0).add(float(0.0).mul(dimFactor));
        const animatedColor = mix(
          vec3(1.0, 0.18039216, 0.14117648),
          vec3(0.1, 0.13529412, 0.65490196),
          dimFactor,
        );
        const colorBrightness = float(0.2).add(float(0.8).mul(dimFactor));
        const finalStreamColor = animatedColor.mul(colorBrightness);

        // Fade in/out at ends: much sharper fade out
        const edgeFade = smoothstep(0.0, 0.2, life).mul(smoothstep(1.0, 0.7, life));

        const fadeOut = float(1.0).sub(uProgress.mul(7.5));

        finalColor.assign(vec4(finalStreamColor, animatedAlpha.mul(edgeFade).mul(fadeOut)));
      });

      return finalColor;
    })();

    // Create a geometry with enough vertices to match the particle count
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(this.count * 3), 3),
    );

    this.points = new THREE.Points(geometry, this.material);
    this.scene.add(this.points);
  }

  setupBloom() {
    const scenePass = pass(this.scene, this.camera);
    const outputPass = scenePass.getTextureNode();

    this.bloomPass = bloom(
      outputPass,
      this.uniforms.bloomStrength as unknown as number,
      this.uniforms.bloomRadius as unknown as number,
      this.uniforms.bloomThreshold as unknown as number,
    );

    this.postProcessing = new THREE.PostProcessing(this.renderer);
    this.postProcessing.outputNode = outputPass.add(this.bloomPass);
  }

  setupRaycaster() {
    this.dummy = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100, 1, 1),
      new THREE.MeshBasicMaterial({ visible: false }),
    );

    this.onPointerMove = (e: PointerEvent) => {
      this.pointer.x = (e.clientX / this.width) * 2 - 1;
      // 56px offset because of header
      this.pointer.y = -((e.clientY - 56) / this.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const intersects = this.raycaster.intersectObject(this.dummy);

      const firstIntersect = intersects[0];
      if (firstIntersect) {
        this.targetMouse.copy(firstIntersect.point);
      }
    };
    window.addEventListener("pointermove", this.onPointerMove);

    this.onMouseDown = () => {
      this.uniforms.mouseMode.value = -1.0;
    };
    window.addEventListener("mousedown", this.onMouseDown);

    this.onMouseUp = () => {
      this.uniforms.mouseMode.value = 1.0;
    };
    window.addEventListener("mouseup", this.onMouseUp);
  }

  setUpResize() {
    this.onResize = this.resize.bind(this);
    window.addEventListener("resize", this.onResize);
  }

  setUpSettings() {}

  resize() {
    this.width = this.container.offsetWidth;
    // Include subtraction if container needs it
    this.height = this.container.offsetHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  setupButtonHover() {
    const button = document.getElementById("explore-btn");
    if (!button) return;
    this.hoverButton = button;

    type HoverUniformKey =
      | "noiseStrength"
      | "rotationSpeed"
      | "noiseScale"
      | "streamNoiseDivisor"
      | "circleNoiseDivisor";

    type HoverMode = {
      targets: Partial<Record<HoverUniformKey, number>>;
    };

    const animateUniformTargets = (targets: Partial<Record<HoverUniformKey, number>>) => {
      for (const [uniformKey, value] of Object.entries(targets) as [HoverUniformKey, number][]) {
        gsap.to(this.uniforms[uniformKey], {
          value,
          duration: 0.5,
          ease: "power2.out",
        });
      }
    };

    const hoverResetTargets: Record<HoverUniformKey, number> = {
      noiseStrength: 0.15,
      rotationSpeed: 0.15,
      noiseScale: 4.0,
      streamNoiseDivisor: 150.0,
      circleNoiseDivisor: 100.0,
    };

    this.onButtonClick = () => {
      const currentProgress = this.uniforms.progress.value as number;
      const targetProgress = currentProgress < 0.5 ? 1 : 0;

      gsap.to(this.uniforms.progress, {
        value: targetProgress,
        duration: 4,
        ease: "none",
      });
    };
    button.addEventListener("click", this.onButtonClick);

    const hoverModes: HoverMode[] = [
      { targets: { noiseStrength: 0 } },
      { targets: { noiseStrength: 0.6 } },
      { targets: { rotationSpeed: 0.7, circleNoiseDivisor: 25 } },
      { targets: { noiseScale: 10, rotationSpeed: 0.04, streamNoiseDivisor: 50 } },
    ];
    let currentModeIndex = Math.floor(Math.random() * hoverModes.length);

    this.onButtonMouseEnter = () => {
      const mode = hoverModes[currentModeIndex];
      if (!mode) return;

      animateUniformTargets(mode.targets);
      currentModeIndex = (currentModeIndex + 1) % hoverModes.length;
    };
    button.addEventListener("mouseenter", this.onButtonMouseEnter);

    this.onButtonMouseLeave = () => {
      animateUniformTargets(hoverResetTargets);
    };
    button.addEventListener("mouseleave", this.onButtonMouseLeave);
  }

  async render() {
    if (!this.isPlaying) return;

    const currentMouse = this.uniforms.currentMouse.value as THREE.Vector2;
    currentMouse.x += (this.targetMouse.x - currentMouse.x) * 0.5;
    currentMouse.y += (this.targetMouse.y - currentMouse.y) * 0.5;

    const dt = this.clock.getDelta();
    const attractionStrength = this.uniforms.attractionStrength.value as number;
    const isClicking = (this.uniforms.mouseMode.value as number) < 0;
    const clickPullProgress = this.uniforms.clickPullProgress.value as number;

    const nextClickPullProgress = isClicking
      ? Math.min(1, clickPullProgress + dt * 0.45)
      : Math.max(0, clickPullProgress - dt * 1.2);
    this.uniforms.clickPullProgress.value = nextClickPullProgress;

    // Base factor 8.0 tuned to match original speed when strength is ~0.1-0.15
    // Previous speed was time * 1.0. With attr=0.1, we need factor 10.0 to match.
    (this.uniforms.simTime.value as number) += dt * attractionStrength * 5.0;

    this.controls.update();

    this.renderer.compute(this.computeNode);
    this.postProcessing.render();

    requestAnimationFrame(this.render.bind(this));
  }

  stop() {
    this.isPlaying = false;
  }

  destroy() {
    this.stop();

    if (this.onPointerMove) {
      window.removeEventListener("pointermove", this.onPointerMove);
    }
    if (this.onMouseDown) {
      window.removeEventListener("mousedown", this.onMouseDown);
    }
    if (this.onMouseUp) {
      window.removeEventListener("mouseup", this.onMouseUp);
    }
    if (this.onResize) {
      window.removeEventListener("resize", this.onResize);
    }

    if (this.hoverButton) {
      if (this.onButtonClick) {
        this.hoverButton.removeEventListener("click", this.onButtonClick);
      }
      if (this.onButtonMouseEnter) {
        this.hoverButton.removeEventListener("mouseenter", this.onButtonMouseEnter);
      }
      if (this.onButtonMouseLeave) {
        this.hoverButton.removeEventListener("mouseleave", this.onButtonMouseLeave);
      }
    }

    this.renderer.dispose();
    const canvas = this.renderer.domElement;
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}

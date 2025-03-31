import * as THREE from "three";
import {REVISION} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import fragment from "./shader/fragment.glsl";
import fragmentFBO from "./shader/fbo.glsl";
import vertex from "./shader/vertex.glsl";
import GUI from 'lil-gui'; 
import gsap from "gsap";

import t from '../ball.png?url'


export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();

    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.width, this.height);
    // this.renderer.setClearColor(0xeeeeee, 1); 

    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      0.01,
      1000
    );

    // let frustumSize = 10;
    // let aspect = this.width / this.height;
    // this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
    this.camera.position.set(0, 0, 2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = 0;

    const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`
    this.dracoLoader = new DRACOLoader( new THREE.LoadingManager() ).setDecoderPath( `${THREE_PATH}/examples/jsm/libs/draco/gltf/` );
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerPos = new THREE.Vector3();

    this.whiteTarget = new THREE.WebGLRenderTarget(this.width, this.height);
    this.whiteScene = new THREE.Scene();
    this.whitebg = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100), 
      new THREE.MeshBasicMaterial({color: 0xffffff})
    )
    this.whiteScene.add(this.whitebg)
    this.whitebg.position.z = -1;

    this.box = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshBasicMaterial({color: 0x00ff00})
    )
    // this.whiteScene.add(this.box)



    this.isPlaying = true;
    this.setupPipeline()
    this.mouseEvents()
    this.addObjects();
    this.resize();
    this.render();
    this.setupResize();
    // this.setUpSettings();
  }

  mouseEvents(){
    this.raycastPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100), 
      new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide})
    );

    this.dummy = new THREE.Mesh(
      // new THREE.PlaneGeometry(0.5, 0.5, 20,20),
      new THREE.SphereGeometry(0.2, 30,30),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        // map: new THREE.TextureLoader().load(t),
        // transparent: true
      })
    )
    this.scene.add(this.dummy)
    window.addEventListener('mousemove', (e)=>{
      this.pointer.x = (e.clientX / this.width) * 2 - 1;
      this.pointer.y = -(e.clientY / this.height) * 2 + 1;

      this.raycaster.setFromCamera( this.pointer, this.camera );
      const intersects = this.raycaster.intersectObjects( [this.raycastPlane] );
      if ( intersects.length > 0 ) {
        this.dummy.position.copy(intersects[0].point)
      }

    })
  }

  setUpSettings() {
    this.settings = {
      progress: 0,
    };
    this.gui = new GUI();
    this.gui.add(this.settings, "progress", 0, 1, 0.01).onChange((val)=>{})
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  addObjects() {
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector4() },
      },
      // wireframe: true,
      // transparent: true,
      vertexShader: vertex,
      fragmentShader: fragment
    });

    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);

    this.plane = new THREE.Mesh(this.geometry, this.material);
    // this.scene.add(this.plane);
  }

  addLights() {
    const light1 = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    light2.position.set(0.5, 0, 0.866); // ~60º
    this.scene.add(light2);
  }

  stop() {
    this.isPlaying = false;
  }

  play() {
    if(!this.isPlaying){
      this.isPlaying = true;
      this.render()
    }
  }

  setupPipeline() {
    this.sourceTarget = new THREE.WebGLRenderTarget(this.width, this.height);


    this.targetA = new THREE.WebGLRenderTarget(this.width, this.height);
    this.targetB = new THREE.WebGLRenderTarget(this.width, this.height);

    this.renderer.setRenderTarget(this.whiteTarget);
    this.renderer.render(this.whiteScene, this.camera);


    

    this.fboScene = new THREE.Scene();
    this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fboMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        tDiffuse: { value: null },
        tPrev: { value: this.whiteTarget.texture },
        resolution: { value: new THREE.Vector4(this.width,this.height,1,1) },
      },
      vertexShader: vertex,
      fragmentShader: fragmentFBO
    });

    this.fboQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.fboMaterial);
    this.fboScene.add(this.fboQuad);




    this.finalScene = new THREE.Scene();
    this.finalQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({map: this.targetA.texture}));
    this.finalScene.add(this.finalQuad);

  }

  render() {
    if (!this.isPlaying) return;
    this.time += 0.05;
    this.material.uniforms.time.value = this.time;
    requestAnimationFrame(this.render.bind(this));


    // RENDERING THE SOURCE
    this.renderer.setRenderTarget(this.sourceTarget);
    this.renderer.render(this.scene, this.camera);

   


    // running PING PONG
    this.renderer.setRenderTarget(this.targetA);
    this.renderer.render(this.fboScene, this.fboCamera);

    this.fboMaterial.uniforms.tDiffuse.value = this.sourceTarget.texture;
    this.fboMaterial.uniforms.tPrev.value = this.targetA.texture;
    this.fboMaterial.uniforms.time.value = this.time;


    // final OUTPUT
    this.finalQuad.material.map = this.targetA.texture;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.finalScene, this.fboCamera);




    


    // swap
    let temp = this.targetA;
    this.targetA = this.targetB;
    this.targetB = temp;






  }
}

new Sketch({
  dom: document.getElementById("container")
});

import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
} from '@angular/core';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

@Component({
  selector: 'app-avatar3d',
  standalone: true,
  templateUrl: './avatar3d.component.html',
  styleUrls: ['./avatar3d.component.scss'],
})
export class Avatar3DComponent implements OnInit, OnDestroy, OnChanges {
  @Input() currentMessage: string | null | undefined = null;

  // These can be either a URL or a Base64 audio string
  @Input() audioUrl?: string | null | undefined = null;
  @Input() avatarAudio?: string | null | undefined = null;

  @Input() animation?: string | null | undefined = null;
  @Input() facialExpression?: string | null | undefined = null;

  // Example format: { METADATA: {duration: number, soundFile: string }, MOUTH_CUES: [{start, end, value}, ...] }
  @Input() lipSyncData?: { [key: string]: any } | null | undefined = null;

  @Output() avatarEvent = new EventEmitter<string>();

  @ViewChild('threeCanvas', { static: true }) threeCanvas!: ElementRef<HTMLCanvasElement>;

  // Three.js & Animation
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationFrameId!: number;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();

  // Avatar & Animations
  private mainModel!: THREE.Group;
  private mainMixer!: THREE.AnimationMixer;
  private mixers: THREE.AnimationMixer[] = [];
  private animationClips: THREE.AnimationClip[] = [];
  private currentAction: THREE.AnimationAction | null = null;
  private currentAnimationName: string = 'Idle';  // Default animation

  // Morphs & Lip-Sync
  private morphMeshes: THREE.SkinnedMesh[] = [];
  private isBlinking = false;
  private isWinkLeft = false;
  private isWinkRight = false;
  private blinkTimeout!: any;

  // Audio
  private audioPlayer: HTMLAudioElement | null = null;

  constructor() {}

  // -------------------------
  // Lifecycle Hooks
  // -------------------------
  ngOnInit(): void {
    this.initThree();
    this.loadMainAvatar();
    this.loadExtraAnimations();
    this.animate();
    this.startBlinkLoop();
    setTimeout(() => {
      this.setIdleState();
    }, 1000); // Adjust the delay as necessary based on your asset loading times
  
    // Remove or comment out the initial avatarEvent.emit to prevent premature emissions
    // this.avatarEvent.emit('Avatar finished an animation!');
  
    // Log the initial animation state
    console.log('Current Animation:', this.currentAnimationName);
    // Removed the initial avatarEvent.emit to avoid incorrect emission
  }

  ngOnChanges(changes: SimpleChanges): void {
    // If new audio arrived (URL or Base64), start playback + set animation
    if (changes['audioUrl'] && this.audioUrl) {
      console.log('Received audioUrl:', this.audioUrl);
      this.handleAudioPlayback(this.audioUrl);
    }
    if (changes['avatarAudio'] && this.avatarAudio) {
      console.log('Received avatarAudio:', this.avatarAudio);
      this.handleAudioPlayback(this.avatarAudio, true);
    }

    // If new animation arrived
    if (changes['animation'] && this.animation) {
      console.log('Received animation:', this.animation);
      this.updateAnimation(this.animation);
    }

    // If new facial expression arrived
    if (changes['facialExpression'] && this.facialExpression) {
      console.log('Received facialExpression:', this.facialExpression);
      this.updateFacialExpression(this.facialExpression);
    }

    // If lip-sync data arrived
    if (changes['lipSyncData'] && this.lipSyncData) {
      console.log('Received lipSyncData:', this.lipSyncData);
      // Lip-syncing will be handled in updateFacialMorphs
    }

    // If currentMessage changed
    if (changes['currentMessage']) {
      console.log('Received currentMessage:', this.currentMessage);
      if (!this.audioPlayer) {
        // If there's no audio, ensure Idle animation and default expression
        this.setIdleState();
      }
    }
  }

  ngOnDestroy(): void {
    // Stop requestAnimationFrame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    clearTimeout(this.blinkTimeout);

    // Stop any playing audio
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.src = '';
      this.audioPlayer = null;
    }

    // Dispose Three.js resources
    this.disposeThree();
  }

  // -------------------------
  // Audio Handling
  // -------------------------
  private handleAudioPlayback(audioSrc: string, isBase64: boolean = false): void {
    // If an audio is already playing, stop it
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.src = '';
      this.audioPlayer = null;
    }

    // Determine if audioSrc is a URL or a Base64 string
    let src: string;
    if (isBase64) {
      src = `data:audio/mp3;base64,${audioSrc}`;
    } else {
      src = audioSrc;
    }

    // Create new HTMLAudioElement
    this.audioPlayer = new Audio(src);
    this.audioPlayer
      .play()
      .then(() => {
        console.log('Audio started playing.');
        this.avatarEvent.emit('Audio started playing.');

        // If custom animation or expression were provided, apply them
        if (this.animation) {
          this.updateAnimation(this.animation);
        } else {
          // If none provided, ensure we have a default "Talking" or fallback
          this.updateAnimation('Talking_1'); // Or any "talking" animation you have
        }
        if (this.facialExpression) {
          this.updateFacialExpression(this.facialExpression);
        } else {
          // If none, use some talking expression or fallback
          this.updateFacialExpression('smile'); // For example
        }
      })
      .catch((error) => {
        console.error('Audio Playback Error:', error);
      });

    // On audio end, revert to Idle & default expression
    this.audioPlayer.onended = () => {
      console.log('Audio playback ended.');
      this.avatarEvent.emit('Audio playback ended.');
      this.setIdleState();
    };
  }

  private setIdleState(): void {
    this.updateAnimation('Idle');
    this.updateFacialExpression('default');
  }

  // -------------------------
  // Animation Handling
  // -------------------------
  private updateAnimation(animationName: string): void {
    if (!this.mainMixer) {
      console.log('AnimationMixer not initialized.');
      return;
    }
    const clip = this.animationClips.find((a) => a.name === animationName);
    console.log(`Searching for animation: ${animationName}`, clip);

    if (clip) {
      const newAction = this.mainMixer.clipAction(clip);
      console.log(`Found animation clip: ${animationName}`, newAction);

      if (this.currentAction) {
        console.log(
          `Fading out current animation: ${this.currentAction.getClip().name}`
        );
        this.currentAction.fadeOut(0.5);
      }

      console.log(`Fading in new animation: ${animationName}`);
      newAction.reset().fadeIn(0.5).play();

      this.currentAction = newAction;
      this.currentAnimationName = animationName;

      this.avatarEvent.emit(`Animation changed to ${animationName}`);
      console.log(`Animation changed to ${animationName}`);
    } else {
      //if clip not found, play idle animation
      console.log(`Animation not found: ${animationName}. Playing Idle.`);
      this.setIdleState();
    }
  }

  private updateFacialExpression(expression: string): void {
    // Define facial expressions similar to React example
    const facialExpressions: { [key: string]: { [key: string]: number } } = {
      default: {},
      smile: {
        browInnerUp: 0.17,
        eyeSquintLeft: 0.4,
        eyeSquintRight: 0.44,
        noseSneerLeft: 0.17,
        noseSneerRight: 0.14,
        mouthPressLeft: 0.61,
        mouthPressRight: 0.41,
      },
      funnyFace: {
        jawLeft: 0.63,
        mouthPucker: 0.53,
        noseSneerLeft: 1,
        noseSneerRight: 0.39,
        mouthLeft: 1,
        eyeLookUpLeft: 1,
        eyeLookUpRight: 1,
        cheekPuff: 0.9999925,
        mouthDimpleLeft: 0.4147439,
        mouthRollLower: 0.32,
        mouthSmileLeft: 0.3549973,
        mouthSmileRight: 0.3549973,
      },
      sad: {
        mouthFrownLeft: 1,
        mouthFrownRight: 1,
        mouthShrugLower: 0.78341,
        browInnerUp: 0.452,
        eyeSquintLeft: 0.72,
        eyeSquintRight: 0.75,
        eyeLookDownLeft: 0.5,
        eyeLookDownRight: 0.5,
        jawForward: 1,
      },
      surprised: {
        eyeWideLeft: 0.5,
        eyeWideRight: 0.5,
        jawOpen: 0.351,
        mouthFunnel: 1,
        browInnerUp: 1,
      },
      angry: {
        browDownLeft: 1,
        browDownRight: 1,
        eyeSquintLeft: 1,
        eyeSquintRight: 1,
        jawForward: 1,
        jawLeft: 1,
        mouthShrugLower: 1,
        noseSneerLeft: 1,
        noseSneerRight: 0.42,
        eyeLookDownLeft: 0.16,
        eyeLookDownRight: 0.16,
        cheekSquintLeft: 1,
        cheekSquintRight: 1,
        mouthClose: 0.23,
        mouthFunnel: 0.63,
        mouthDimpleRight: 1,
      },
      crazy: {
        browInnerUp: 0.9,
        jawForward: 1,
        noseSneerLeft: 0.57,
        noseSneerRight: 0.51,
        eyeLookDownLeft: 0.3943577,
        eyeLookUpRight: 0.40397614,
        eyeLookInLeft: 0.961848,
        eyeLookInRight: 0.961848,
        jawOpen: 0.961848,
        mouthDimpleLeft: 0.961848,
        mouthDimpleRight: 0.961848,
        mouthStretchLeft: 0.278936,
        mouthStretchRight: 0.288554,
        mouthSmileLeft: 0.557872,
        mouthSmileRight: 0.3847392,
        tongueOut: 0.961848,
      },
    };

    const exprMap = facialExpressions[expression] || facialExpressions['default'];

    // Apply expression morph targets
    this.morphMeshes.forEach((mesh) => {
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;
      if (!dict || !influences) return;

      // For targets in this expression
      Object.keys(exprMap).forEach((key) => {
        const idx = dict[key];
        if (idx !== undefined) {
          influences[idx] = THREE.MathUtils.lerp(influences[idx], exprMap[key], 0.1);
        }
      });

      // For any other morph targets not in this expression, reset to 0
      Object.keys(dict).forEach((key) => {
        if (!(key in exprMap)) {
          const idx = dict[key];
          influences[idx] = THREE.MathUtils.lerp(influences[idx], 0, 0.1);
        }
      });
    });

    this.avatarEvent.emit(`Facial expression updated to ${expression}`);
    console.log(`Facial expression updated to ${expression}`);
  }

  // -------------------------
  // Lip-Sync Handling
  // -------------------------


  // -------------------------
  // Three.js Initialization
  // -------------------------
  private initThree(): void {
    const canvasEl = this.threeCanvas.nativeElement;
    const width = canvasEl.clientWidth;
    const height = canvasEl.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
    this.camera.position.set(0, 1.5, 1.5);
    this.camera.lookAt(0, 1.5, 0);
    this.scene.add(this.camera);

    this.controls = new OrbitControls(this.camera, canvasEl);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.5, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    // Floor Shadow
    const shadowPlaneGeo = new THREE.PlaneGeometry(10, 10);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.7 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
    shadowPlane.position.y = 0;
  }

  private animate(): void {
    const delta = this.clock.getDelta();
    this.mixers.forEach((m) => m.update(delta));

    this.controls.update();
    this.updateFacialMorphs(delta); // Blinking + Lip-Sync
    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(() => this.animate());

  }

  // -------------------------
  // Avatar Loading
  // -------------------------
  private loadMainAvatar(): void {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      'assets/models/64f1a714fe61576b46f27ca2.glb',
      (gltf) => {
        this.mainModel = gltf.scene;
        this.scene.add(this.mainModel);

        // Adjust scale/position
        this.mainModel.scale.set(1, 1, 1);
        this.mainModel.position.set(0, 0, 0);

        // Collect morph targets
        this.mainModel.traverse((obj: THREE.Object3D) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = false;
          }
          if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
            const skinnedMesh = obj as THREE.SkinnedMesh;
            if (skinnedMesh.morphTargetDictionary) {
              this.morphMeshes.push(skinnedMesh);
            }
          }
        });

        // Main mixer
        this.mainMixer = new THREE.AnimationMixer(this.mainModel);
        this.mixers.push(this.mainMixer);

        // Load main animations
        this.animationClips = gltf.animations;
        console.log('Main Avatar Animations:', this.animationClips);

        // Play "Idle" animation if exists
        const idleClip = this.animationClips.find((clip) => clip.name === 'Idle');
        if (idleClip) {
          const action = this.mainMixer.clipAction(idleClip);
          action.play();
          this.currentAction = action;
          this.currentAnimationName = 'Idle';
          console.log('Playing Idle animation.');
        } else if (this.animationClips.length > 0) {
          // fallback
          const action = this.mainMixer.clipAction(this.animationClips[0]);
          action.play();
          this.currentAction = action;
          this.currentAnimationName = this.animationClips[0].name;
          console.log(`Playing fallback animation: ${this.currentAnimationName}`);
        } else {
          console.warn('No animations found in the main avatar GLB.');
        }
      },
      undefined,
      (err) => console.error('Error loading main avatar:', err)
    );
  }

  private loadExtraAnimations(): void {
    const loader = new GLTFLoader();
  
    // Initialize DRACOLoader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/'); // Ensure this path is correct
    loader.setDRACOLoader(dracoLoader);
  
    loader.load(
      'assets/models/animations.glb',
      (gltf) => {
        console.log('Extra animations loaded:', gltf.animations);
  
        // Merge extra animations into the main animationClips array
        gltf.animations.forEach((clip) => {
          this.animationClips.push(clip);
          // Optionally, add the clip to the mainMixer if you plan to play them immediately
          // this.mainMixer.clipAction(clip);
        });
  
        console.log('Combined Animation Clips:', this.animationClips);
  
        // Optionally, verify that 'Talking_1' exists
        const talkingClip = this.animationClips.find((clip) => clip.name === 'Talking_1');
        if (talkingClip) {
          console.log('Talking_1 animation is loaded.');
        } else {
          console.warn('Talking_1 animation is NOT loaded. Please check your animations.glb file.');
        }
      },
      undefined,
      (err) => console.error('Error loading extra animations:', err)
    );
  }
  

  // -------------------------
  // Blinking & Lip-Sync
  // -------------------------
  private startBlinkLoop(): void {
    const nextBlinkTime = THREE.MathUtils.randInt(3000, 7000); // random intervals
    this.blinkTimeout = setTimeout(() => {
      this.isBlinking = true;
      setTimeout(() => {
        this.isBlinking = false;
        this.startBlinkLoop();
      }, 200); // blink for 200ms
    }, nextBlinkTime);
  }

  private updateFacialMorphs(delta: number): void {
    // Handle blinking/winking
    for (const mesh of this.morphMeshes) {
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;
      if (!dict || !influences) continue;

      if (dict['eyeBlinkLeft'] !== undefined) {
        const idx = dict['eyeBlinkLeft'];
        const blinkVal = this.isBlinking || this.isWinkLeft ? 1 : 0;
        influences[idx] = THREE.MathUtils.lerp(influences[idx], blinkVal, 0.1);
      }
      if (dict['eyeBlinkRight'] !== undefined) {
        const idx = dict['eyeBlinkRight'];
        const blinkVal = this.isBlinking || this.isWinkRight ? 1 : 0;
        influences[idx] = THREE.MathUtils.lerp(influences[idx], blinkVal, 0.1);
      }
    }

    // Lip-Sync if audio is playing
    if (this.lipSyncData && this.audioPlayer && !this.audioPlayer.paused) {
      const currentTime = this.audioPlayer.currentTime;
      this.applyLipSync(currentTime);
    }
  }

  private applyLipSync(currentTime: number): void {
    const mouthCues: Array<{ start: number; end: number; value: string }> =
      this.lipSyncData?.['MOUTH_CUES'] || [];

    // Find the current mouth cue
    const cue = mouthCues.find(
      (c) => currentTime >= c.start && currentTime <= c.end
    );

    // Morph target mappings
    const corresponding: { [key: string]: string } = {
      A: 'viseme_PP',
      B: 'viseme_kk',
      C: 'viseme_I',
      D: 'viseme_AA',
      E: 'viseme_O',
      F: 'viseme_U',
      G: 'viseme_FF',
      H: 'viseme_TH',
      X: 'viseme_PP',
    };

    // Reset all visemes to 0
    Object.values(corresponding).forEach((viseme) => {
      this.morphMeshes.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        if (dict && dict[viseme] !== undefined && mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[dict[viseme]] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[dict[viseme]],
            0,
            0.1
          );
        }
      });
    });

    // Apply current viseme if any
    if (cue && corresponding[cue.value]) {
      const targetViseme = corresponding[cue.value];
      this.morphMeshes.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        if (
          dict &&
          dict[targetViseme] !== undefined &&
          mesh.morphTargetInfluences
        ) {
          mesh.morphTargetInfluences[dict[targetViseme]] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[dict[targetViseme]],
            1,
            0.2
          );
        }
      });
    }
  }

  // -------------------------
  // Disposal
  // -------------------------
  private disposeThree(): void {
    this.mixers.forEach((mixer) => mixer.uncacheRoot(this.mainModel));
    this.renderer.dispose();

    // Dispose geometry & materials
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();

        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });
  }

  // -------------------------
  // Helper Winks
  // -------------------------
  winkLeft() {
    this.isWinkLeft = true;
    setTimeout(() => {
      this.isWinkLeft = false;
    }, 300);
  }

  winkRight() {
    this.isWinkRight = true;
    setTimeout(() => {
      this.isWinkRight = false;
    }, 300);
  }
}

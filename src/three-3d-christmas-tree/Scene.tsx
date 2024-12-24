import React, { useRef, useEffect, useCallback } from 'react';
import { getAudioData, useAudioData, visualizeAudio, AudioData } from "@remotion/media-utils";
import {
  useCurrentFrame,
  Audio,
  AbsoluteFill,
  random,
  useVideoConfig,
  staticFile,
  delayRender,
  cancelRender, continueRender,
} from 'remotion';
import * as THREE from "three";

class ThreeSceneRemotion {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Group;
  private groundParticles: THREE.Points | null = null;
  private groundGeometry: THREE.BufferGeometry | null = null;
  private groundPositions: Float32Array | null = null;
  private baseGroundPositions: Float32Array | null = null;
  private width: number;
  private height: number;
  private audioUrl: string;
  private audioData?: AudioData;

  constructor(canvas: HTMLCanvasElement, width: number, height: number, audioUrl: string) {
    this.audioUrl = audioUrl;
    this.width = width;
    this.height = height;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#1c1c1c");

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 15, 40);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(2);

    // Create Christmas tree particles
    this.particles = this.createChristmasTree();
    this.scene.add(this.particles);

    // Add lights
    this.setupLights();

    // Add background stars
    this.createStars();
  }

  public async initializeForRemotion() {
    this.audioData = await getAudioData(this.audioUrl);
  }

  private createChristmasTree(): THREE.Group {
    // Create multiple particle systems for different sizes
    const smallParticles = this.createTreeParticles(5000, 0.1);
    const mediumParticles = this.createTreeParticles(200, 0.3, true);
    const largeParticles = this.createTreeParticles(50, 0.6, true);
    const groundParticles = this.createGroundParticles();

    // Combine all particle systems
    const group = new THREE.Group();
    group.add(smallParticles);
    group.add(mediumParticles);
    group.add(largeParticles);
    group.add(groundParticles);

    return group;
  }

  private createTreeParticles(
    count: number,
    size: number,
    decorative: boolean = false,
  ): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const treeHeight = 15; // 增加树高
    const maxRadius = 7; // 增加树的半径

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Calculate height percentage (0 to 1)
      const heightPercent = random(i + 10);
      const y = heightPercent * treeHeight;

      // Calculate radius at this height (conical shape)
      const radius = maxRadius * (1 - heightPercent);
      const angle = random(i + 20) * Math.PI * 2;

      // Add some randomness to make it look more natural
      const randomness = random(i + 30) * 0.2;

      positions[i3] = Math.cos(angle) * radius * (1 + randomness);
      positions[i3 + 1] = y - treeHeight / 2; // Center the tree
      positions[i3 + 2] = Math.sin(angle) * radius * (1 + randomness);

      if (decorative) {
        // Decorative particles are either gold or red
        if (random(i + 40) < 0.5) {
          // Gold ornaments
          colors[i3] = 1; // R
          colors[i3 + 1] = 0.8; // G
          colors[i3 + 2] = 0; // B
        } else {
          // Red ornaments
          colors[i3] = 1; // R
          colors[i3 + 1] = 0; // G
          colors[i3 + 2] = 0; // B
        }
      } else {
        // Color gradient from bottom to top (green to lighter green)
        const green = 0.4 + heightPercent * 0.3;
        colors[i3] = 0.1; // R
        colors[i3 + 1] = green; // G
        colors[i3 + 2] = 0.1; // B
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: size,
      vertexColors: true,
      transparent: true,
      opacity: decorative ? 1 : 0.8,
      depthWrite: !decorative,
    });

    return new THREE.Points(geometry, material);
  }

  private createGroundParticles(): THREE.Points {
    const count = 200;
    this.groundGeometry = new THREE.BufferGeometry();
    this.groundPositions = new Float32Array(count * 3);
    this.baseGroundPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const starRadius = 0.5;
    const treeHeight = 14;
    const starHeight = treeHeight / 2 + 1;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      const x = starRadius * Math.cos(theta) * Math.sin(phi);
      const y = starHeight + starRadius * Math.sin(theta) * Math.sin(phi);
      const z = starRadius * Math.cos(phi);

      this.baseGroundPositions[i3] = x;
      this.baseGroundPositions[i3 + 1] = y;
      this.baseGroundPositions[i3 + 2] = z;

      this.groundPositions[i3] = x;
      this.groundPositions[i3 + 1] = y;
      this.groundPositions[i3 + 2] = z;

      colors[i3] = 1.0;     // R
      colors[i3 + 1] = 0.9; // G
      colors[i3 + 2] = 0.2; // B
    }

    this.groundGeometry.setAttribute("position", new THREE.BufferAttribute(this.groundPositions, 3));
    this.groundGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.groundParticles = new THREE.Points(this.groundGeometry, material);
    return this.groundParticles;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);
  }

  private createStars(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsPositions = new Float32Array(1000 * 3);
    const starsColors = new Float32Array(1000 * 3);

    for (let i = 0; i < 1000; i++) {
      const i3 = i * 3;
      const radius = 50;
      const theta = random(i + 60) * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starsPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starsPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starsPositions[i3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + random(i + 50) * 0.5;
      starsColors[i3] = brightness;
      starsColors[i3 + 1] = brightness;
      starsColors[i3 + 2] = brightness;
    }

    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starsPositions, 3));
    starsGeometry.setAttribute("color", new THREE.BufferAttribute(starsColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  seek(frame: number): void {
    if (!this.audioData) return;

    const visualization = visualizeAudio({
      fps: 60,
      frame,
      audioData: this.audioData,
      numberOfSamples: 32,
    });
    
    const startRadius = 30;
    const endRadius = 20;
    const startHeight = 14;
    const endHeight = 4;
    const totalFrames = 15.5 * 60;
    const rotations = 0.2;

    const progress = Math.min(frame / totalFrames, 1);

    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const radius = startRadius - (startRadius - endRadius) * easeProgress;
    const angle = progress * Math.PI * 2 * rotations;
    const height = startHeight - (startHeight - endHeight) * easeProgress;

    this.camera.position.x = Math.cos(angle) * radius;
    this.camera.position.y = height;
    this.camera.position.z = Math.sin(angle) * radius;
    this.camera.lookAt(0, 0, 0);

    if (this.particles) {
      (this.particles as THREE.Group).rotation.y = frame * 0.01;
    }

    if (this.groundGeometry && this.groundPositions && this.baseGroundPositions && this.groundParticles) {
      const count = this.groundPositions.length / 3;
      
      const audioAmplitude = Math.max(...visualization) * 2.5;
      
      const material = this.groundParticles.material as THREE.PointsMaterial;
      material.size = 0.12 + audioAmplitude * 0.18;
      material.opacity = 0.6 + audioAmplitude * 0.4;
      
      const time = frame * 0.02;
      const pulseScale = 1 + audioAmplitude * 0.4;
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        
        const x = this.baseGroundPositions[i3];
        const y = this.baseGroundPositions[i3 + 1];
        const z = this.baseGroundPositions[i3 + 2];
        
        const centerY = 15 / 2 + 1;
        const relativeY = y - centerY;
        
        const angle = time;
        const rotatedX = x * Math.cos(angle) - z * Math.sin(angle);
        const rotatedZ = x * Math.sin(angle) + z * Math.cos(angle);
        
        this.groundPositions[i3] = rotatedX * pulseScale;
        this.groundPositions[i3 + 1] = centerY + relativeY * pulseScale;
        this.groundPositions[i3 + 2] = rotatedZ * pulseScale;
      }
      
      const positionAttribute = this.groundGeometry.getAttribute('position') as THREE.BufferAttribute;
      positionAttribute.array = this.groundPositions;
      positionAttribute.needsUpdate = true;
    }

    this.render();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.scene.clear();
    this.renderer.dispose();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}

const SceneContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ThreeSceneRemotion | null>(null);
  const music = staticFile("Jingle_Bells_by_Kevin_MacLeod.mp3");
  const audioData = useAudioData(music);

  useEffect(() => {
    if (!canvasRef.current || !audioData) return;

    const handle = delayRender('Initializing Three.js and loading audio');

    const initScene = async () => {
      try {
        const scene = new ThreeSceneRemotion(canvasRef.current!, width, height, music);
        await scene.initializeForRemotion();
        sceneRef.current = scene;
        continueRender(handle);
      } catch (err) {
        console.error('Failed to initialize scene:', err);
        cancelRender(handle);
      }
    };

    initScene();

    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
      }
    };
  }, [width, height, music, audioData]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.seek(frame);
    }
  }, [frame]);

  if (!audioData) {
    return null;
  }

  return (
    <>
      <canvas
        style={{
          width,
          height,
        }}
        width={width * 2}
        height={height * 2}
        ref={canvasRef}
      />
      <Audio src={music} />
    </>
  );
};

export const ChristmasTreeScene: React.FC = () => {
  return (
    <AbsoluteFill className="bg-black">
      <SceneContent />
    </AbsoluteFill>
  );
};

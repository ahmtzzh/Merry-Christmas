import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// @ts-ignore
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
// @ts-ignore
import * as mediapipeHands from '@mediapipe/hands';
import { analyzeHandGesture } from '../services/gestureUtils';

const Hands = (mediapipeHands as any).Hands || (mediapipeHands as any).default?.Hands;
type Results = import('@mediapipe/hands').Results;

interface TreeCanvasProps {
    onLetterOpen?: (isOpen: boolean) => void;
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({ onLetterOpen }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gestureStatus, setGestureStatus] = useState<string>("Initializing...");
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<any>(null); // EffectComposer
  const treeGroupRef = useRef<THREE.Group | null>(null);
  const letterGroupRef = useRef<THREE.Group | null>(null); // Ref for the letter
  const santaGroupRef = useRef<THREE.Group | null>(null); // Ref for Santa
  const reqIdRef = useRef<number | null>(null);
  const detectionReqIdRef = useRef<number | null>(null);
  
  // Instance Refs for updating matrices
  const foliageMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const goldMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const redMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const candyMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const heartMeshRef = useRef<THREE.InstancedMesh | null>(null);
  
  // Data Refs (store positions to avoid recalculating)
  const foliageDataRef = useRef<{target: Float32Array, random: Float32Array} | null>(null);
  const goldDataRef = useRef<{target: Float32Array, random: Float32Array} | null>(null);
  const redDataRef = useRef<{target: Float32Array, random: Float32Array} | null>(null);
  const candyDataRef = useRef<{target: Float32Array, random: Float32Array} | null>(null);
  const heartDataRef = useRef<{target: Float32Array, random: Float32Array} | null>(null);

  // Animation State
  const targetExplosionRef = useRef(0.0); 
  const currentExplosionRef = useRef(0.0);
  const lastReportedOpenRef = useRef(false);
  
  // Letter Animation State
  const letterStateRef = useRef({
      scale: 0,
      flapOpen: 0, // 0 to 1
      paperSlide: 0 // 0 to 1
  });

  // Rotation Logic
  const currentRotationSpeedRef = useRef(0.05); // Base idle speed
  const targetRotationSpeedRef = useRef(0.05);
  
  // Zoom - Adjusted default to see the LARGER tree
  const targetZoomRef = useRef(32);
  const currentZoomRef = useRef(32);

  useEffect(() => {
    if (!mountRef.current || !videoRef.current) return;
    let isComponentMounted = true;

    // --- 1. SCENE SETUP ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Pure Black Luxury
    scene.fog = new THREE.FogExp2(0x000000, 0.012); 
    sceneRef.current = scene;

    const threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 150);
    threeCamera.position.z = 32; 
    threeCamera.position.y = 0;
    cameraRef.current = threeCamera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); 
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- 2. ENVIRONMENT & LIGHTING ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const spotLight = new THREE.SpotLight(0xffd700, 10);
    spotLight.position.set(0, 15, 0);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 1;
    scene.add(spotLight);

    // --- 3. POST PROCESSING (BLOOM) ---
    const renderScene = new RenderPass(scene, threeCamera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    bloomPass.strength = 0.5; 
    bloomPass.radius = 0.5;
    bloomPass.threshold = 0.75; 

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // --- 4. TREE GENERATION ---
    const treeGroup = new THREE.Group();
    treeGroup.position.y = 2.5; 
    scene.add(treeGroup);
    treeGroupRef.current = treeGroup;

    // --- 4b. LETTER GENERATION (The 3D Visual Anchor) ---
    const letterGroup = new THREE.Group();
    letterGroup.position.y = 4.0; 
    treeGroup.add(letterGroup);
    letterGroupRef.current = letterGroup;

    // Even though we show HTML overlay, we keep 3D letter for "magic" effect
    const createLetterTexture = () => {
        const w = 512;
        const h = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.CanvasTexture(canvas);

        ctx.fillStyle = '#f2e8d5'; 
        ctx.fillRect(0, 0, w, h);
        
        // Simplified texture for 3D object since we use HTML overlay for reading
        ctx.fillStyle = '#660000'; 
        ctx.font = 'bold 36px serif'; 
        ctx.textAlign = 'center';
        ctx.fillText('思莹宝宝亲启', w/2, 150);

        ctx.strokeStyle = '#c5a059'; 
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(100, 250);
        ctx.lineTo(w - 100, 250);
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace; 
        return texture;
    };

    const letterTexture = createLetterTexture();

    const envMat = new THREE.MeshStandardMaterial({ color: 0xfdf5e6, roughness: 0.6, metalness: 0.1 });
    
    // Envelope Body
    const envW = 3.2; const envH = 2.2; const envD = 0.1;
    const envBody = new THREE.Mesh(new THREE.BoxGeometry(envW, envH, envD), envMat);
    letterGroup.add(envBody);

    // Envelope Front
    const envFront = new THREE.Mesh(new THREE.BoxGeometry(envW, envH * 0.6, 0.05), envMat);
    envFront.position.set(0, -envH * 0.2, envD/2 + 0.025);
    envBody.add(envFront);

    // Paper
    const paperMat = new THREE.MeshStandardMaterial({ 
        map: letterTexture,
        roughness: 0.6,
        emissive: 0xe6dcc3,
        emissiveIntensity: 0.15,
        side: THREE.DoubleSide
    });
    const paperMesh = new THREE.Mesh(new THREE.PlaneGeometry(envW * 0.9, envH * 1.8), paperMat);
    paperMesh.position.set(0, -1.2, 0.051); 
    envBody.add(paperMesh);

    // Flap
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-envW/2, 0);
    flapShape.lineTo(envW/2, 0);
    flapShape.lineTo(0, -envH * 0.55);
    flapShape.lineTo(-envW/2, 0);
    const flapMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(flapShape, { depth: 0.05, bevelEnabled: false }), envMat);
    flapMesh.position.set(0, envH/2, envD/2);
    envBody.add(flapMesh);

    // Seal
    const sealShape = new THREE.Shape();
    const hx = 0, hy = 0;
    sealShape.moveTo( hx + 0.25, hy + 0.25 );
    sealShape.bezierCurveTo( hx + 0.25, hy + 0.25, hx + 0.20, hy, hx, hy );
    sealShape.bezierCurveTo( hx - 0.30, hy, hx - 0.30, hy + 0.35, hx - 0.30, hy + 0.35 );
    sealShape.bezierCurveTo( hx - 0.30, hy + 0.55, hx - 0.10, hy + 0.77, hx + 0.25, hy + 0.95 );
    sealShape.bezierCurveTo( hx + 0.60, hy + 0.77, hx + 0.80, hy + 0.55, hx + 0.80, hy + 0.35 );
    sealShape.bezierCurveTo( hx + 0.80, hy + 0.35, hx + 0.80, hy, hx + 0.50, hy );
    sealShape.bezierCurveTo( hx + 0.35, hy, hx + 0.25, hy + 0.25, hx + 0.25, hy + 0.25 );
    const sealMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(sealShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 }), new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.3, metalness: 0.4 }));
    sealMesh.geometry.center();
    sealMesh.geometry.scale(0.3, 0.3, 0.3);
    sealMesh.position.set(0, -envH * 0.35, 0.06); 
    sealMesh.rotation.z = Math.PI; 
    flapMesh.add(sealMesh);


    // --- 4c. SANTA & SLEIGH (Procedural & Stylized) ---
    const santaGroup = new THREE.Group();
    scene.add(santaGroup);
    santaGroupRef.current = santaGroup;
    
    // INCREASE SCALE: Make everything in this group 2x bigger
    santaGroup.scale.set(2, 2, 2);

    // Materials
    const velvetRedMat = new THREE.MeshStandardMaterial({ color: 0x8a0303, roughness: 0.4, metalness: 0.3 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.9, emissive: 0xaa8800, emissiveIntensity: 0.2 });
    const whiteFurMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.5 });
    
    // Reindeer Materials
    const deerBodyMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
    const deerNoseMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 });

    // Sleigh Structure
    const sleighBody = new THREE.Group();
    santaGroup.add(sleighBody);

    // Carriage
    const carriageGeo = new THREE.BoxGeometry(1.2, 0.8, 2.0);
    // Taper the bottom of the carriage using position manipulation
    const carriage = new THREE.Mesh(carriageGeo, velvetRedMat);
    carriage.position.y = 0.5;
    sleighBody.add(carriage);

    // Runners (Stylized curves)
    const runnerGeo = new THREE.TorusGeometry(1.2, 0.05, 8, 32, Math.PI);
    const runnerL = new THREE.Mesh(runnerGeo, goldTrimMat);
    runnerL.rotation.y = Math.PI / 2;
    runnerL.position.set(-0.6, 0.1, 0);
    runnerL.scale.set(1, 1, 1.5); // Stretch
    sleighBody.add(runnerL);
    
    const runnerR = runnerL.clone();
    runnerR.position.set(0.6, 0.1, 0);
    sleighBody.add(runnerR);

    // Santa Figure (Minimalist)
    const santaFigure = new THREE.Group();
    santaFigure.position.set(0, 0.6, -0.2);
    sleighBody.add(santaFigure);

    // Body
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), velvetRedMat);
    santaFigure.add(torso);
    
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), skinMat);
    head.position.y = 0.5;
    santaFigure.add(head);

    // Beard
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), whiteFurMat);
    beard.position.set(0, 0.45, 0.1);
    beard.rotation.x = -0.2;
    santaFigure.add(beard);

    // Hat
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 16), velvetRedMat);
    hat.position.y = 0.8;
    hat.rotation.x = -0.2;
    santaFigure.add(hat);
    const pompom = new THREE.Mesh(new THREE.SphereGeometry(0.08), whiteFurMat);
    pompom.position.y = 1.1;
    pompom.position.z = -0.1;
    santaFigure.add(pompom);

    // Sack
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshStandardMaterial({color: 0x5c4033, roughness: 1}));
    sack.position.set(0, 0.4, -0.8);
    sack.scale.set(1, 0.8, 1);
    sleighBody.add(sack);

    // REAL REINDEER MODELS
    const reindeerGroup = new THREE.Group();
    reindeerGroup.position.z = 2.0; // Attach to front
    santaGroup.add(reindeerGroup);

    // Function to create a geometric stylized reindeer
    const createStylizedReindeer = (x: number, z: number, isRudolph: boolean) => {
        const deer = new THREE.Group();
        deer.position.set(x, 0, z);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.1, 0.45, 0.1);
        const l1 = new THREE.Mesh(legGeo, deerBodyMat); l1.position.set(-0.15, 0.22, 0.2); deer.add(l1);
        const l2 = new THREE.Mesh(legGeo, deerBodyMat); l2.position.set(0.15, 0.22, 0.2); deer.add(l2);
        const l3 = new THREE.Mesh(legGeo, deerBodyMat); l3.position.set(-0.15, 0.22, -0.2); deer.add(l3);
        const l4 = new THREE.Mesh(legGeo, deerBodyMat); l4.position.set(0.15, 0.22, -0.2); deer.add(l4);

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.7), deerBodyMat);
        torso.position.y = 0.5;
        deer.add(torso);

        // Neck
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.25), deerBodyMat);
        neck.position.set(0, 0.8, 0.35);
        neck.rotation.x = -0.3;
        deer.add(neck);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.35), deerBodyMat);
        head.position.set(0, 1.05, 0.55);
        deer.add(head);

        // Antlers
        const antlerGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45);
        const a1 = new THREE.Mesh(antlerGeo, goldTrimMat); a1.position.set(-0.1, 1.35, 0.45); a1.rotation.z = 0.4; a1.rotation.x = 0.2; deer.add(a1);
        const a2 = new THREE.Mesh(antlerGeo, goldTrimMat); a2.position.set(0.1, 1.35, 0.45); a2.rotation.z = -0.4; a2.rotation.x = 0.2; deer.add(a2);

        // Nose
        if (isRudolph) {
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06), deerNoseMat);
            nose.position.set(0, 1.05, 0.75);
            deer.add(nose);
        }

        // Harness / Reins line (abstract)
        const rein = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.4), goldTrimMat);
        rein.rotation.x = Math.PI / 2;
        rein.position.set(0, 0.6, -0.7);
        deer.add(rein);

        return deer;
    };

    // 2 Rows of Reindeer
    reindeerGroup.add(createStylizedReindeer(-0.5, 0, false));
    reindeerGroup.add(createStylizedReindeer(0.5, 0, false));
    reindeerGroup.add(createStylizedReindeer(-0.5, 1.5, true)); // Front Left - Rudolph
    reindeerGroup.add(createStylizedReindeer(0.5, 1.5, false));


    // --- 5. HELPER: SPIRAL POSITIONS ---
    const generateSpiralPositions = (count: number, heightSpread: number, radiusSpread: number, yOffset: number) => {
      const targetArr = new Float32Array(count * 3);
      const randomArr = new Float32Array(count * 3);
      const phi = Math.PI * (3 - Math.sqrt(5)); 

      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2; 
        const radius = Math.sqrt(1 - y * y) * radiusSpread * (1 - (y + 1)/2 * 0.8); 
        const theta = phi * i * 20; 

        const finalY = y * heightSpread + yOffset;
        const coneRadius = radius * (1 - (finalY + heightSpread/2) / (heightSpread * 1.2));
        
        targetArr[i*3] = Math.cos(theta) * Math.max(0.2, coneRadius * 5.5); 
        targetArr[i*3+1] = finalY;
        targetArr[i*3+2] = Math.sin(theta) * Math.max(0.2, coneRadius * 5.5);

        const rDir = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
        const dist = 15 + Math.random() * 25; 
        randomArr[i*3] = rDir.x * dist;
        randomArr[i*3+1] = rDir.y * dist;
        randomArr[i*3+2] = rDir.z * dist;
      }
      return { target: targetArr, random: randomArr };
    };

    const dummy = new THREE.Object3D();
    const treeHeightSpread = 7.5; 

    // Instanced Meshes Setup (same as before, condensed for brevity)
    const foliageCount = 1800; 
    const foliageMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0x0f2e18, roughness: 0.7, metalness: 0.1 }), foliageCount);
    foliageDataRef.current = generateSpiralPositions(foliageCount, treeHeightSpread, 1.0, 0);
    foliageMeshRef.current = foliageMesh;
    treeGroup.add(foliageMesh);

    const goldCount = 500;
    const goldMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.25, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.1, metalness: 0.9, emissive: 0xaa8800, emissiveIntensity: 0.2 }), goldCount);
    goldDataRef.current = generateSpiralPositions(goldCount, treeHeightSpread - 0.5, 1.1, 0.2); 
    goldMeshRef.current = goldMesh;
    treeGroup.add(goldMesh);

    const redCount = 250;
    const redMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: 0x8a0303, roughness: 0.3, metalness: 0.6, emissive: 0x500000, emissiveIntensity: 0.4 }), redCount);
    redDataRef.current = generateSpiralPositions(redCount, treeHeightSpread - 1.0, 1.15, -0.5);
    redMeshRef.current = redMesh;
    treeGroup.add(redMesh);

    const candyCount = 180;
    class CandyCaneCurve extends THREE.Curve<THREE.Vector3> {
        getPoint(t: number) {
            const y = t * 1.5;
            if (t < 0.8) return new THREE.Vector3(0, y, 0);
            const angle = (t - 0.8) * 5 * Math.PI; 
            return new THREE.Vector3(Math.sin(angle)*0.3, 1.2 + Math.cos(angle)*0.3, 0);
        }
    }
    const candyMesh = new THREE.InstancedMesh(new THREE.TubeGeometry(new CandyCaneCurve(), 8, 0.06, 6, false), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x440000, roughness: 0.4, metalness: 0.3 }), candyCount);
    candyDataRef.current = generateSpiralPositions(candyCount, treeHeightSpread - 1.0, 1.2, 0);
    candyMeshRef.current = candyMesh;
    treeGroup.add(candyMesh);

    const heartCount = 120;
    const heartMesh = new THREE.InstancedMesh(new THREE.ExtrudeGeometry(sealShape, { depth: 0.1, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 }).center().scale(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xff1493, roughness: 0.2, metalness: 0.8, emissive: 0x440022, emissiveIntensity: 0.3 }), heartCount);
    heartDataRef.current = generateSpiralPositions(heartCount, treeHeightSpread - 0.2, 1.25, 0.5); 
    heartMeshRef.current = heartMesh;
    treeGroup.add(heartMesh);


    // Base (Condensed)
    const baseGroup = new THREE.Group();
    treeGroup.add(baseGroup);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 5.0, 16), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 1.0, metalness: 0.0 }));
    trunk.position.y = -treeHeightSpread - 2.5 + 1.5;
    baseGroup.add(trunk);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.0, 3.5, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.5 }));
    pot.position.y = trunk.position.y - 2.5 - 1.75 + 0.8;
    pot.rotation.y = Math.PI / 8; baseGroup.add(pot);
    const soil = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 1.0 }));
    soil.rotation.x = -Math.PI / 2; soil.position.y = pot.position.y + 1.75 - 0.2; baseGroup.add(soil);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.1, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.1, metalness: 0.9 })); 
    rim.position.y = pot.position.y + 1.75; rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI / 8; baseGroup.add(rim);

    // Dust & Star
    const dustCount = 2000;
    const dustPos = new Float32Array(dustCount * 3);
    for(let i=0; i<dustCount; i++) { dustPos[i*3] = (Math.random() - 0.5) * 50; dustPos[i*3+1] = (Math.random() - 0.5) * 40; dustPos[i*3+2] = (Math.random() - 0.5) * 50; }
    const dustParticles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dustPos, 3)), new THREE.PointsMaterial({ color: 0xffd700, size: 0.1, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
    scene.add(dustParticles);

    const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffd700, emissiveIntensity: 2.0, metalness: 1.0, roughness: 0.0 }));
    star.position.set(0, treeHeightSpread + 0.5, 0); 
    treeGroup.add(star);


    // --- 6. ANIMATION LOOP ---
    const clock = new THREE.Clock();

    const updateInstancedMesh = (mesh: THREE.InstancedMesh, data: any, explosion: number, time: number, type: 'standard' | 'candy' | 'heart' = 'standard') => {
        const count = mesh.count;
        for (let i = 0; i < count; i++) {
            const {target, random} = data;
            const x = target[i*3] + (random[i*3] - target[i*3]) * explosion;
            const y = target[i*3+1] + (random[i*3+1] - target[i*3+1]) * explosion;
            const z = target[i*3+2] + (random[i*3+2] - target[i*3+2]) * explosion;
            dummy.position.set(x, y, z);
            if (type === 'candy') dummy.rotation.set(Math.PI, time * 0.5 + i, Math.sin(time + i)*0.2); 
            else if (type === 'heart') dummy.rotation.set(0, time * 0.8 + i, 0); 
            else dummy.rotation.set(time + i, time * 0.5 + i, i); 
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    };

    const animate = () => {
        reqIdRef.current = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // 1. Core Logic
        currentExplosionRef.current += (targetExplosionRef.current - currentExplosionRef.current) * 3.0 * delta;
        currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * 2.0 * delta;
        currentRotationSpeedRef.current += (targetRotationSpeedRef.current - currentRotationSpeedRef.current) * 1.5 * delta;

        // Callback Logic for HTML Letter
        // If > 0.65, we consider it "open enough" to read
        if (currentExplosionRef.current > 0.65 && !lastReportedOpenRef.current) {
            lastReportedOpenRef.current = true;
            if (onLetterOpen) onLetterOpen(true);
        } else if (currentExplosionRef.current < 0.6 && lastReportedOpenRef.current) {
            lastReportedOpenRef.current = false;
            if (onLetterOpen) onLetterOpen(false);
        }

        if (treeGroupRef.current) treeGroupRef.current.rotation.y += currentRotationSpeedRef.current;
        if (foliageMeshRef.current && foliageDataRef.current) updateInstancedMesh(foliageMeshRef.current, foliageDataRef.current, currentExplosionRef.current, time);
        if (goldMeshRef.current && goldDataRef.current) updateInstancedMesh(goldMeshRef.current, goldDataRef.current, currentExplosionRef.current, time);
        if (redMeshRef.current && redDataRef.current) updateInstancedMesh(redMeshRef.current, redDataRef.current, currentExplosionRef.current, time);
        if (candyMeshRef.current && candyDataRef.current) updateInstancedMesh(candyMeshRef.current, candyDataRef.current, currentExplosionRef.current, time, 'candy');
        if (heartMeshRef.current && heartDataRef.current) updateInstancedMesh(heartMeshRef.current, heartDataRef.current, currentExplosionRef.current, time, 'heart');

        if (cameraRef.current) { cameraRef.current.position.z = currentZoomRef.current; cameraRef.current.lookAt(0, 0, 0); }
        star.rotation.y = -time; star.rotation.z = Math.sin(time * 2) * 0.1;

        const pos = dustParticles.geometry.attributes.position.array as Float32Array;
        for(let i=1; i<pos.length; i+=3) { pos[i] -= delta * 0.5; if(pos[i] < -25) pos[i] = 25; }
        dustParticles.geometry.attributes.position.needsUpdate = true;
        dustParticles.rotation.y = time * 0.05;


        // 7. LOVE LETTER 3D ANIMATION (Visual Anchor)
        if (currentExplosionRef.current > 0.6) {
            letterStateRef.current.scale += (1 - letterStateRef.current.scale) * 2.0 * delta;
            if (letterStateRef.current.scale > 0.8) letterStateRef.current.flapOpen += (1 - letterStateRef.current.flapOpen) * 3.0 * delta;
            if (letterStateRef.current.flapOpen > 0.5) letterStateRef.current.paperSlide += (1 - letterStateRef.current.paperSlide) * 1.5 * delta;
        } else if (currentExplosionRef.current < 0.5) {
            letterStateRef.current.paperSlide += (0 - letterStateRef.current.paperSlide) * 5.0 * delta;
            letterStateRef.current.flapOpen += (0 - letterStateRef.current.flapOpen) * 5.0 * delta;
            if (letterStateRef.current.flapOpen < 0.1) letterStateRef.current.scale += (0 - letterStateRef.current.scale) * 5.0 * delta;
        }

        if (letterGroupRef.current) {
            const s = letterStateRef.current.scale;
            letterGroupRef.current.scale.set(s, s, s);
            letterGroupRef.current.rotation.x = Math.PI * 0.1; 
        }
        if (flapMesh) flapMesh.rotation.x = -letterStateRef.current.flapOpen * 2.5; 
        if (paperMesh) paperMesh.position.y = -1.2 + (letterStateRef.current.paperSlide * 2.4);

        // 8. SANTA ANIMATION (Orbit)
        if (santaGroupRef.current) {
            // Wider Orbit Radius because we scaled up
            const orbitR = 20; 
            // Slower speed
            const orbitSpeed = time * 0.25;
            
            // Calculate position on the circle
            const sx = Math.sin(orbitSpeed) * orbitR;
            const sz = Math.cos(orbitSpeed) * orbitR;
            
            // Add a "bobbing" motion for flying effect
            const sy = 10 + Math.sin(time * 1.5) * 1.5;
            
            santaGroupRef.current.position.set(sx, sy, sz);

            // Make Santa look forward (tangent to the circle)
            // Look at a point slightly ahead in the orbit
            const nextX = Math.sin(orbitSpeed + 0.1) * orbitR;
            const nextZ = Math.cos(orbitSpeed + 0.1) * orbitR;
            santaGroupRef.current.lookAt(nextX, sy, nextZ);
        }

        composer.render();
    };
    animate();


    // --- 7. MEDIAPIPE LOGIC ---
    let hands: any = null;
    if (Hands) {
        try {
            hands = new Hands({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });
            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            hands.onResults((results: Results) => {
                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    const landmarks = results.multiHandLandmarks[0];
                    const gesture = analyzeHandGesture(landmarks);

                    if (gesture.isFist) {
                        setGestureStatus("✊ Fist: Assembling");
                        targetExplosionRef.current = 0.0;
                    } else if (gesture.isOpen) {
                        setGestureStatus("🖐️ Open: Exploding");
                        targetExplosionRef.current = 1.0;
                    } else {
                        setGestureStatus("✋ Hand Detected");
                    }

                    const centerX = 0.5;
                    const distFromCenter = gesture.position.x - centerX; 
                    const speed = distFromCenter * 1.2 * 0.2; 
                    targetRotationSpeedRef.current = speed;
                    const zFactor = gesture.position.z * 50; 
                    targetZoomRef.current = Math.max(20, Math.min(50, 32 + zFactor));

                } else {
                    setGestureStatus("Waiting for hands...");
                    targetRotationSpeedRef.current = 0.005; 
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
            if (isComponentMounted && videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                requestAnimationFrame(detectFrame);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const detectFrame = async () => {
        if (!isComponentMounted) return;
        if (videoRef.current && videoRef.current.readyState >= 2 && hands) { 
            await hands.send({ image: videoRef.current });
        }
        if (isComponentMounted) detectionReqIdRef.current = requestAnimationFrame(detectFrame);
    };

    startCamera();

    const handleResize = () => {
        if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
        composerRef.current?.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
        isComponentMounted = false;
        window.removeEventListener('resize', handleResize);
        if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
        if (detectionReqIdRef.current) cancelAnimationFrame(detectionReqIdRef.current);
        if (rendererRef.current) {
            rendererRef.current.dispose();
            mountRef.current?.removeChild(rendererRef.current.domElement);
        }
        if (hands) hands.close();
    };
  }, [onLetterOpen]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      <video ref={videoRef} className="absolute top-0 left-0 w-px h-px opacity-0 pointer-events-none" playsInline muted />
      <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-none">
        <span className="bg-black/50 text-yellow-500 px-4 py-2 rounded-full text-sm backdrop-blur-md border border-yellow-500/30 font-serif tracking-widest uppercase">
          {gestureStatus}
        </span>
      </div>
    </div>
  );
};
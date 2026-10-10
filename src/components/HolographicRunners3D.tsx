import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Pause, Play, Sparkles, ArrowDown } from 'lucide-react';
import { motion } from 'motion/react';

interface HolographicRunners3DProps {
  onStartCreating: () => void;
  onExploreTools: () => void;
  onSkipIntro: () => void;
  isAuthenticated: boolean;
}

interface ArticulatedRunner {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  rightAnkle: THREE.Group;
  leftFootLight: THREE.Mesh;
  rightFootLight: THREE.Mesh;
  wireMatPrimary: THREE.MeshBasicMaterial;
  wireMatSecondary: THREE.MeshBasicMaterial;
  pointMat: THREE.PointsMaterial;
  baseWirePrimaryOpacity: number;
  baseWireSecondaryOpacity: number;
  basePointOpacity: number;
  phaseOffset: number;
  baseX: number;
  speedZ: number;
}

/**
 * Builds an articulated 3D humanoid runner made of glowing holographic wireframe meshes
 * and luminous vertex particles, with full anatomical joint hierarchy for real running kinematics.
 */
function createHolographicRunner(
  primaryColorHex: number,
  secondaryColorHex: number,
  isParticleDominant: boolean,
  detailLevel: number
): Omit<ArticulatedRunner, 'phaseOffset' | 'baseX' | 'speedZ'> {
  const root = new THREE.Group();
  const pelvis = new THREE.Group();
  pelvis.position.y = 1.05;
  root.add(pelvis);

  const baseWirePrimaryOpacity = isParticleDominant ? 0.24 : 0.72;
  const baseWireSecondaryOpacity = isParticleDominant ? 0.2 : 0.52;
  const basePointOpacity = isParticleDominant ? 0.94 : 0.78;

  const wireMatPrimary = new THREE.MeshBasicMaterial({
    color: primaryColorHex,
    wireframe: true,
    transparent: true,
    opacity: baseWirePrimaryOpacity,
    blending: THREE.AdditiveBlending,
  });

  const wireMatSecondary = new THREE.MeshBasicMaterial({
    color: secondaryColorHex,
    wireframe: true,
    transparent: true,
    opacity: baseWireSecondaryOpacity,
    blending: THREE.AdditiveBlending,
  });

  const pointMat = new THREE.PointsMaterial({
    color: isParticleDominant ? secondaryColorHex : primaryColorHex,
    size: isParticleDominant ? 0.055 : 0.038,
    transparent: true,
    opacity: basePointOpacity,
    blending: THREE.AdditiveBlending,
  });

  const addHologramPart = (
    parent: THREE.Group,
    geo: THREE.BufferGeometry,
    offsetY: number,
    useSecondary = false
  ) => {
    geo.translate(0, offsetY, 0);
    const mesh = new THREE.Mesh(geo, useSecondary ? wireMatSecondary : wireMatPrimary);
    const pts = new THREE.Points(geo, pointMat);
    parent.add(mesh);
    parent.add(pts);
  };

  // Pelvis / Hips mesh
  addHologramPart(
    pelvis,
    new THREE.CylinderGeometry(0.19, 0.16, 0.22, 8 * detailLevel, 2 * detailLevel),
    0,
    true
  );

  // Torso / Chest
  const torso = new THREE.Group();
  torso.position.y = 0.1;
  pelvis.add(torso);
  addHologramPart(
    torso,
    new THREE.CylinderGeometry(0.24, 0.17, 0.56, 10 * detailLevel, 4 * detailLevel),
    0.28,
    false
  );

  // Head & Neck
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.62;
  torso.add(headGroup);
  addHologramPart(
    headGroup,
    new THREE.IcosahedronGeometry(0.16, detailLevel),
    0.16,
    false
  );

  // Left Arm Hierarchy
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.28, 0.52, 0);
  torso.add(leftShoulder);
  addHologramPart(
    leftShoulder,
    new THREE.CylinderGeometry(0.065, 0.052, 0.34, 6 * detailLevel, 2 * detailLevel),
    -0.17,
    true
  );

  const leftElbow = new THREE.Group();
  leftElbow.position.set(0, -0.34, 0);
  leftShoulder.add(leftElbow);
  addHologramPart(
    leftElbow,
    new THREE.CylinderGeometry(0.05, 0.038, 0.32, 6 * detailLevel, 2 * detailLevel),
    -0.16,
    false
  );

  // Right Arm Hierarchy
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.28, 0.52, 0);
  torso.add(rightShoulder);
  addHologramPart(
    rightShoulder,
    new THREE.CylinderGeometry(0.065, 0.052, 0.34, 6 * detailLevel, 2 * detailLevel),
    -0.17,
    true
  );

  const rightElbow = new THREE.Group();
  rightElbow.position.set(0, -0.34, 0);
  rightShoulder.add(rightElbow);
  addHologramPart(
    rightElbow,
    new THREE.CylinderGeometry(0.05, 0.038, 0.32, 6 * detailLevel, 2 * detailLevel),
    -0.16,
    false
  );

  // Left Leg Hierarchy
  const leftHip = new THREE.Group();
  leftHip.position.set(-0.12, -0.06, 0);
  pelvis.add(leftHip);
  addHologramPart(
    leftHip,
    new THREE.CylinderGeometry(0.095, 0.07, 0.46, 8 * detailLevel, 3 * detailLevel),
    -0.23,
    false
  );

  const leftKnee = new THREE.Group();
  leftKnee.position.set(0, -0.46, 0);
  leftHip.add(leftKnee);
  addHologramPart(
    leftKnee,
    new THREE.CylinderGeometry(0.068, 0.045, 0.46, 8 * detailLevel, 3 * detailLevel),
    -0.23,
    true
  );

  const leftAnkle = new THREE.Group();
  leftAnkle.position.set(0, -0.46, 0);
  leftKnee.add(leftAnkle);
  const leftFootGeo = new THREE.BoxGeometry(0.09, 0.06, 0.22, 2, 1, 2);
  leftFootGeo.translate(0, -0.03, 0.06);
  leftAnkle.add(new THREE.Mesh(leftFootGeo, wireMatPrimary));

  // Right Leg Hierarchy
  const rightHip = new THREE.Group();
  rightHip.position.set(0.12, -0.06, 0);
  pelvis.add(rightHip);
  addHologramPart(
    rightHip,
    new THREE.CylinderGeometry(0.095, 0.07, 0.46, 8 * detailLevel, 3 * detailLevel),
    -0.23,
    false
  );

  const rightKnee = new THREE.Group();
  rightKnee.position.set(0, -0.46, 0);
  rightHip.add(rightKnee);
  addHologramPart(
    rightKnee,
    new THREE.CylinderGeometry(0.068, 0.045, 0.46, 8 * detailLevel, 3 * detailLevel),
    -0.23,
    true
  );

  const rightAnkle = new THREE.Group();
  rightAnkle.position.set(0, -0.46, 0);
  rightKnee.add(rightAnkle);
  const rightFootGeo = new THREE.BoxGeometry(0.09, 0.06, 0.22, 2, 1, 2);
  rightFootGeo.translate(0, -0.03, 0.06);
  rightAnkle.add(new THREE.Mesh(rightFootGeo, wireMatPrimary));

  // Ground contact reflection discs (glowing cyan/pink when foot strikes the floor)
  const contactGeo = new THREE.CircleGeometry(0.28, 16);
  contactGeo.rotateX(-Math.PI / 2);
  const leftFootLight = new THREE.Mesh(
    contactGeo,
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    })
  );
  leftFootLight.position.y = 0.01;
  root.add(leftFootLight);

  const rightFootLight = new THREE.Mesh(
    contactGeo.clone(),
    new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    })
  );
  rightFootLight.position.y = 0.01;
  root.add(rightFootLight);

  return {
    root,
    pelvis,
    torso,
    headGroup,
    leftShoulder,
    leftElbow,
    rightShoulder,
    rightElbow,
    leftHip,
    leftKnee,
    leftAnkle,
    rightHip,
    rightKnee,
    rightAnkle,
    leftFootLight,
    rightFootLight,
    wireMatPrimary,
    wireMatSecondary,
    pointMat,
    baseWirePrimaryOpacity,
    baseWireSecondaryOpacity,
    basePointOpacity,
  };
}

/**
 * Applies realistic biomechanical sprint kinematics and distance-based camera pass-through fade
 * to an articulated 3D runner at phase `t`.
 */
function updateRunnerKinematics(runner: ArticulatedRunner, t: number) {
  const s = Math.sin(t);
  const c = Math.cos(t);

  // Smooth fade-in from horizon (-11.5 to -8.5) and smooth dissolve as runner passes camera (1.8 to 3.7)
  const z = runner.root.position.z;
  let fadeFactor = 1;
  if (z > 1.8) {
    fadeFactor = Math.max(0, 1 - (z - 1.8) / 1.9);
  } else if (z < -8.5) {
    fadeFactor = Math.max(0, (z + 11.5) / 3.0);
  }

  runner.wireMatPrimary.opacity = runner.baseWirePrimaryOpacity * fadeFactor;
  runner.wireMatSecondary.opacity = runner.baseWireSecondaryOpacity * fadeFactor;
  runner.pointMat.opacity = runner.basePointOpacity * fadeFactor;

  // Forward sprint lean & vertical stride oscillation (2 bounces per full stride cycle)
  const verticalBounce = Math.abs(Math.sin(t)) * 0.14;
  runner.pelvis.position.y = 0.96 + verticalBounce;
  runner.pelvis.rotation.x = 0.22 + Math.cos(t * 2) * 0.04; // Forward sprint tilt
  runner.pelvis.rotation.y = -s * 0.16; // Hip counter-rotation
  runner.pelvis.rotation.z = c * 0.05; // Subtle pelvic list

  // Torso counter-twist & breathing motion
  runner.torso.rotation.x = 0.12 + Math.sin(t * 2) * 0.03;
  runner.torso.rotation.y = s * 0.24;

  // Head stabilization
  runner.headGroup.rotation.x = -0.18;
  runner.headGroup.rotation.y = -s * 0.12;

  // Left & Right Leg Sprint Cycle
  const leftLegPhase = t;
  const rightLegPhase = t + Math.PI;

  const computeLegAngles = (phase: number) => {
    const hipSwing = -Math.sin(phase) * 0.92 - 0.12;
    const kneeFlex = Math.max(0.08, Math.sin(phase - 0.65) * 1.35 + 0.55);
    const ankleFlex = Math.cos(phase) * 0.35;
    return { hipSwing, kneeFlex, ankleFlex };
  };

  const leftLeg = computeLegAngles(leftLegPhase);
  runner.leftHip.rotation.x = leftLeg.hipSwing;
  runner.leftKnee.rotation.x = leftLeg.kneeFlex;
  runner.leftAnkle.rotation.x = leftLeg.ankleFlex;

  const rightLeg = computeLegAngles(rightLegPhase);
  runner.rightHip.rotation.x = rightLeg.hipSwing;
  runner.rightKnee.rotation.x = rightLeg.kneeFlex;
  runner.rightAnkle.rotation.x = rightLeg.ankleFlex;

  // Opposite Arm Pump
  runner.leftShoulder.rotation.x = Math.sin(leftLegPhase) * 0.85 + 0.1;
  runner.leftShoulder.rotation.z = 0.14;
  runner.leftElbow.rotation.x = -1.35 - Math.max(0, -Math.sin(leftLegPhase)) * 0.45;

  runner.rightShoulder.rotation.x = Math.sin(rightLegPhase) * 0.85 + 0.1;
  runner.rightShoulder.rotation.z = -0.14;
  runner.rightElbow.rotation.x = -1.35 - Math.max(0, -Math.sin(rightLegPhase)) * 0.45;

  // Foot ground-strike glow intensity on the reflective floor
  const leftContact = Math.max(0, Math.cos(leftLegPhase - 0.3));
  const rightContact = Math.max(0, Math.cos(rightLegPhase - 0.3));

  const leftMat = runner.leftFootLight.material as THREE.MeshBasicMaterial;
  leftMat.opacity = Math.pow(leftContact, 4) * 0.65 * fadeFactor;
  runner.leftFootLight.position.z = Math.sin(leftLegPhase) * 0.35;
  runner.leftFootLight.position.x = -0.12;

  const rightMat = runner.rightFootLight.material as THREE.MeshBasicMaterial;
  rightMat.opacity = Math.pow(rightContact, 4) * 0.65 * fadeFactor;
  runner.rightFootLight.position.z = Math.sin(rightLegPhase) * 0.35;
  runner.rightFootLight.position.x = 0.12;
}

export const HolographicRunners3D: React.FC<HolographicRunners3DProps> = ({
  onStartCreating,
  onExploreTools,
  onSkipIntro,
  isAuthenticated,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [webglFallback, setWebglFallback] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setIsPaused(true);
    }
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: window.innerWidth >= 768,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 520;
    const isMobile = width < 768;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
    renderer.setClearColor(0x03040b, 1);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03040b, 0.062);

    // Cinematic low-angle perspective camera so runners sprint toward the viewer
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 60);
    camera.position.set(-1.35, 1.35, 4.6);
    camera.lookAt(0.2, 1.15, -6);

    // Reflective dark floor grid with subtle perspective lines
    const gridHelper = new THREE.GridHelper(44, isMobile ? 24 : 40, 0x1e1b4b, 0x0f172a);
    gridHelper.position.y = 0;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.28;
    scene.add(gridHelper);

    // Create 3 articulated 3D Holographic Runners in depth formation (Lead wireframe + 2 trailing particle/echo runners)
    const detailLevel = isMobile ? 1 : 2;
    const runnerConfigs = [
      {
        primary: 0x22d3ee, // Cyan
        secondary: 0xec4899, // Neon Pink/Magenta
        particleDominant: false,
        startZ: -1.4,
        baseX: -0.45,
        phaseOffset: 0,
        speedZ: 3.15,
        rotY: 0.28,
      },
      {
        primary: 0x38bdf8, // Electric Blue
        secondary: 0xa855f7, // Violet
        particleDominant: true,
        startZ: -5.3,
        baseX: 0.65,
        phaseOffset: 2.1,
        speedZ: 3.15,
        rotY: 0.25,
      },
      {
        primary: 0xa855f7, // Violet
        secondary: 0xf472b6, // Pink
        particleDominant: true,
        startZ: -9.4,
        baseX: 1.75,
        phaseOffset: 4.2,
        speedZ: 3.15,
        rotY: 0.22,
      },
    ];

    const runners: ArticulatedRunner[] = runnerConfigs.map((cfg) => {
      const built = createHolographicRunner(
        cfg.primary,
        cfg.secondary,
        cfg.particleDominant,
        detailLevel
      );
      built.root.position.set(cfg.baseX, 0, cfg.startZ);
      built.root.rotation.y = cfg.rotY;
      scene.add(built.root);
      return {
        ...built,
        phaseOffset: cfg.phaseOffset,
        baseX: cfg.baseX,
        speedZ: cfg.speedZ,
      };
    });

    // High-Speed Luminous Laser Trails (Cyan, Electric Blue, Violet, Pink)
    const streakCount = isMobile ? 48 : 96;
    const streakPositions = new Float32Array(streakCount * 6);
    const streakColors = new Float32Array(streakCount * 6);
    const streakSpeeds = new Float32Array(streakCount);

    const trailPalette = [
      new THREE.Color(0x22d3ee), // Cyan
      new THREE.Color(0x3b82f6), // Electric Blue
      new THREE.Color(0xa855f7), // Violet
      new THREE.Color(0xec4899), // Pink
    ];

    const resetStreak = (i: number, randomZ = false) => {
      const x = (Math.random() - 0.35) * 14;
      const y = Math.random() * 4.2 + 0.15;
      const z = randomZ ? -Math.random() * 26 + 3 : -24 - Math.random() * 6;
      const length = Math.random() * 1.9 + 0.8;

      streakPositions[i * 6 + 0] = x;
      streakPositions[i * 6 + 1] = y;
      streakPositions[i * 6 + 2] = z;

      streakPositions[i * 6 + 3] = x - length * 0.22;
      streakPositions[i * 6 + 4] = y;
      streakPositions[i * 6 + 5] = z - length;

      streakSpeeds[i] = Math.random() * 6 + 7;

      const c = trailPalette[i % trailPalette.length];
      streakColors[i * 6 + 0] = c.r;
      streakColors[i * 6 + 1] = c.g;
      streakColors[i * 6 + 2] = c.b;
      streakColors[i * 6 + 3] = c.r * 0.15;
      streakColors[i * 6 + 4] = c.g * 0.15;
      streakColors[i * 6 + 5] = c.b * 0.15;
    };

    for (let i = 0; i < streakCount; i++) {
      resetStreak(i, true);
    }

    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
    streakGeo.setAttribute('color', new THREE.BufferAttribute(streakColors, 3));

    const streakMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });

    const streakLines = new THREE.LineSegments(streakGeo, streakMat);
    scene.add(streakLines);

    // Subtle pointer parallax
    let targetCamX = -1.35;
    let targetCamY = 1.35;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetCamX = -1.35 + nx * 0.65;
      targetCamY = 1.35 - ny * 0.35;
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });

    // WebGL Context Loss safety
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    let animId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    // Render initial pose even if paused
    runners.forEach((r) => updateRunnerKinematics(r, r.phaseOffset));
    renderer.render(scene, camera);

    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!document.hidden && !isPaused) {
        elapsed += dt;
        const strideFrequency = 7.8; // Realistic fast running cadence

        // Update each articulated runner's skeleton and forward progression toward camera
        runners.forEach((runner) => {
          // Advance toward camera (+Z) and slightly along X perspective corridor
          runner.root.position.z += runner.speedZ * dt;
          runner.root.position.x -= runner.speedZ * 0.14 * dt;

          // When runner dissolves past the camera (z > 3.7), recycle smoothly to deep horizon (z = -11.5)
          if (runner.root.position.z > 3.7) {
            runner.root.position.z = -11.5;
            runner.root.position.x = runner.baseX + 1.4;
          }

          const phase = elapsed * strideFrequency + runner.phaseOffset;
          updateRunnerKinematics(runner, phase);
        });

        // Update luminous speed trails
        const posAttr = streakGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < streakCount; i++) {
          const dz = streakSpeeds[i] * dt;
          const dx = -dz * 0.22;

          streakPositions[i * 6 + 0] += dx;
          streakPositions[i * 6 + 2] += dz;
          streakPositions[i * 6 + 3] += dx;
          streakPositions[i * 6 + 5] += dz;

          if (streakPositions[i * 6 + 2] > 4.8) {
            resetStreak(i, false);
          }
        }
        posAttr.needsUpdate = true;

        // Smooth camera damping
        camera.position.x += (targetCamX - camera.position.x) * 0.06;
        camera.position.y += (targetCamY - camera.position.y) * 0.06;
        camera.lookAt(0.15, 1.12, -3.5);

        renderer.render(scene, camera);
      }

      animId = window.requestAnimationFrame(animate);
    };

    animId = window.requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.dispose();
    };
  }, [isPaused]);

  return (
    <section
      aria-label="Abertura Cinematográfica 3D NEXUS AI STUDIO"
      className="relative w-full min-h-[430px] sm:min-h-[510px] lg:min-h-[560px] bg-[#03040B] border-b border-slate-800/80 overflow-hidden flex items-center"
    >
      {/* Real Three.js 3D Skeletal Running Viewport */}
      {!webglFallback ? (
        <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      ) : (
        <div className="absolute inset-0 w-full h-full z-0 bg-gradient-to-br from-[#06091B] via-[#040611] to-[#0E0720]" />
      )}

      {/* Measured Readability Scrim so Typography and Buttons remain 100% legible */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-[#03040B]/92 via-[#03040B]/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-[#03040B] via-transparent to-[#03040B]/55"
      />

      {/* Top-Right Accessibility Controls: Pause/Static Mode & Skip Intro */}
      <div className="absolute top-4 right-4 sm:right-6 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 backdrop-blur-md min-h-[38px]"
          aria-label={isPaused ? 'Ativar animação 3D' : 'Pausar animação 3D (Modo Estático)'}
        >
          {isPaused ? (
            <Play className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <Pause className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span>{isPaused ? 'Ativar 3D' : 'Modo Estático'}</span>
        </button>

        <button
          type="button"
          onClick={onSkipIntro}
          className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1 backdrop-blur-md min-h-[38px]"
        >
          <span>Ir ao Estúdio</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Smoothly Revealed Brand Name, Principal Message & Action Buttons */}
      <div className="relative z-20 max-w-6xl mx-auto w-full px-4 sm:px-8 py-12">
        <div className="max-w-xl space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-300 uppercase"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>NEXUS AI STUDIO</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            Sua criatividade entra em{' '}
            <span className="nexus-animated-gradient-text">movimento.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-lg"
          >
            Um estúdio inteligente para criar, organizar e transformar suas ideias.
          </motion.p>

          {/* Primary & Secondary Actions */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="pt-2 flex flex-wrap items-center gap-3"
          >
            <button
              type="button"
              onClick={onStartCreating}
              className="nexus-btn-primary px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap min-h-[46px]"
            >
              {isAuthenticated ? 'Começar a criar (Abrir Painel)' : 'Começar a criar'}
            </button>

            <button
              type="button"
              onClick={onExploreTools}
              className="nexus-btn-secondary px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap min-h-[46px] backdrop-blur-md"
            >
              Explorar ferramentas
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

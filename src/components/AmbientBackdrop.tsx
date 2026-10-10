import React, { useEffect, useRef, useState } from 'react';

/**
 * Lightweight, prefers-reduced-motion aware particle field for the deep space canvas.
 * Adapts particle density automatically on mobile Android viewports.
 */
export const AmbientParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrameId = 0;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isMobile = width < 768;
    const count = prefersReducedMotion ? 16 : isMobile ? 22 : 46;

    const palette = [
      'rgba(168, 85, 247, 0.45)', // Neon Purple
      'rgba(59, 130, 246, 0.45)', // Electric Blue
      'rgba(34, 211, 238, 0.45)', // Cyan
    ];

    const particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.7,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      color: palette[i % palette.length],
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Subtle connecting filaments on desktop
        if (!isMobile && !prefersReducedMotion) {
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 15000) {
              const alpha = (1 - distSq / 15000) * 0.11;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(139, 92, 246, ${alpha.toFixed(3)})`;
              ctx.lineWidth = 0.6;
              ctx.stroke();
            }
          }
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = window.requestAnimationFrame(render);
      }
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      if (prefersReducedMotion) render();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 opacity-85"
    />
  );
};

interface AICoreVisualProps {
  onOpenLab?: () => void;
  activeToolsCount?: number;
}

/**
 * Interactive 3D-depth AI Core with luminous pulsation, orbital geometry,
 * and cursor/touch parallax depth.
 */
export const AICoreVisual: React.FC<AICoreVisualProps> = ({
  onOpenLab,
  activeToolsCount = 8,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: Number((relX * 16).toFixed(2)),
      y: Number((relY * -16).toFixed(2)),
    });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-full min-h-[290px] sm:min-h-[340px] flex items-center justify-center select-none overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#0A1028]/90 via-[#070B1C]/95 to-[#040611]/95 p-6"
    >
      {/* Ambient Radial Illumination */}
      <div
        aria-hidden="true"
        className="absolute w-64 h-64 rounded-full bg-purple-600/25 blur-3xl nexus-orb-pulse pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute w-48 h-48 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none"
        style={{
          transform: `translate3d(${tilt.x * 1.4}px, ${tilt.y * -1.4}px, 0)`,
          transition: 'transform 160ms ease-out',
        }}
      />

      {/* Interactive 3D Core Assembly */}
      <div
        className="relative z-10 flex flex-col items-center justify-center"
        style={{
          transform: `perspective(800px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          {/* Outer Orbital Ring */}
          <svg
            viewBox="0 0 220 220"
            className="absolute inset-0 w-full h-full nexus-orbit-cw"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="nexusRingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <circle
              cx="110"
              cy="110"
              r="98"
              fill="none"
              stroke="url(#nexusRingGrad1)"
              strokeWidth="1.5"
              strokeDasharray="24 14 8 14"
            />
            <circle cx="110" cy="12" r="4" fill="#22d3ee" />
            <circle cx="208" cy="110" r="3.5" fill="#a855f7" />
          </svg>

          {/* Counter-Rotating Inner Geometric Ring */}
          <svg
            viewBox="0 0 220 220"
            className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)] nexus-orbit-ccw"
            aria-hidden="true"
          >
            <polygon
              points="110,22 186,66 186,154 110,198 34,154 34,66"
              fill="none"
              stroke="rgba(56, 189, 248, 0.35)"
              strokeWidth="1.2"
            />
            <circle
              cx="110"
              cy="110"
              r="68"
              fill="none"
              stroke="rgba(168, 85, 247, 0.45)"
              strokeWidth="1.2"
              strokeDasharray="10 8"
            />
          </svg>

          {/* Central Pulsating AI Prism Core */}
          <button
            type="button"
            onClick={onOpenLab}
            className="group relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-purple-600/35 via-blue-600/25 to-cyan-500/35 border border-cyan-400/45 shadow-[0_0_40px_rgba(124,58,237,0.45)] flex flex-col items-center justify-center backdrop-blur-md nexus-float focus-visible:outline-2 focus-visible:outline-cyan-400"
            aria-label="Abrir NEXUS LAB — Espaço Interativo de Exploração Criativa"
          >
            <svg
              viewBox="0 0 64 64"
              className="w-12 h-12 sm:w-14 sm:h-14 transition-transform duration-200 group-hover:scale-110"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="nexusCoreTriangle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <polygon
                points="32,8 56,50 8,50"
                fill="none"
                stroke="url(#nexusCoreTriangle)"
                strokeWidth="3.2"
                strokeLinejoin="round"
              />
              <polygon
                points="32,20 46,45 18,45"
                fill="rgba(34, 211, 238, 0.18)"
                stroke="#22d3ee"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="32" cy="36" r="4" fill="#ffffff" />
            </svg>
            <span className="mt-1.5 text-[11px] font-semibold tracking-wider text-cyan-200 whitespace-nowrap">
              NEXUS CORE
            </span>
          </button>
        </div>

        {/* Bottom Interactive Trigger */}
        <div className="mt-4 text-center space-y-1">
          <div className="text-xs font-medium text-slate-300">
            <span>{activeToolsCount} Ferramentas Gemini Ativas</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="text-cyan-300">Execução Server-Side</span>
          </div>
          {onOpenLab && (
            <button
              type="button"
              onClick={onOpenLab}
              className="text-xs font-semibold text-purple-300 hover:text-cyan-300 transition-colors underline underline-offset-4"
            >
              Entrar no NEXUS LAB Interativo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

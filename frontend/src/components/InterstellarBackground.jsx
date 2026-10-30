import React, { useEffect, useRef } from 'react';

export default function InterstellarBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Track smooth scroll
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let scrollProgress = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      // Cap scrollVelocity strictly to prevent chaotic stretching / tearing
      scrollVelocity += Math.max(-15, Math.min(15, delta * 0.2));
      lastScrollY = currentScrollY;

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollProgress = Math.min(1, Math.max(0, currentScrollY / maxScroll));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 1. Reduced Stars (~130 count - half previous count, diagonal drift)
    const starCount = 135;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      const depth = Math.random(); // 0 (far) to 1 (near)
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        depth: depth,
        radius: depth * 1.5 + 0.4,
        baseAlpha: depth * 0.5 + 0.25,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        // Diagonal motion: subtle drift towards bottom-left
        vx: -0.15 * (depth + 0.5),
        vy: 0.12 * (depth + 0.5),
        isStreakable: Math.random() < 0.15, // Only 15% of stars gently streak
        color: ['#FFFFFF', '#E0F2FE', '#BAE6FD', '#DDD6FE', '#C084FC'][Math.floor(Math.random() * 5)]
      });
    }

    // 2. Realistic Asteroids with Craters & Rotation
    const createAsteroid = (x, y, radius, speedX, speedY, rotSpeed) => {
      // Create irregular rocky polygon vertices
      const numPoints = 9;
      const vertices = [];
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const dist = radius * (0.8 + Math.random() * 0.35);
        vertices.push({
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist
        });
      }

      // Generate craters on the asteroid surface
      const craters = [];
      const numCraters = Math.floor(Math.random() * 3) + 2;
      for (let c = 0; c < numCraters; c++) {
        craters.push({
          cx: (Math.random() - 0.5) * radius * 1.1,
          cy: (Math.random() - 0.5) * radius * 1.1,
          cr: Math.random() * (radius * 0.22) + (radius * 0.12)
        });
      }

      return {
        x,
        y,
        radius,
        speedX,
        speedY,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed,
        vertices,
        craters
      };
    };

    const asteroids = [
      createAsteroid(width * 0.12, height * 0.22, 28, 0.08, 0.05, 0.002),
      createAsteroid(width * 0.88, height * 0.45, 36, -0.06, 0.04, -0.0015),
      createAsteroid(width * 0.35, height * 0.82, 22, 0.05, -0.03, 0.0025),
      createAsteroid(width * 0.72, height * 0.15, 18, -0.04, 0.06, 0.0018)
    ];

    let time = 0;
    const render = () => {
      time += 0.01;

      // Smoothly dampen scroll velocity
      scrollVelocity *= 0.92;
      if (Math.abs(scrollVelocity) < 0.02) scrollVelocity = 0;

      ctx.clearRect(0, 0, width, height);

      // 1. Gentle Ambient Nebulae (Soft, non-distracting)
      const nebulaHue1 = 265 + scrollProgress * 30;
      const nebulaHue2 = 200 + scrollProgress * 35;

      const grad1 = ctx.createRadialGradient(
        width * 0.25, height * 0.35, 10,
        width * 0.25, height * 0.35, width * 0.45
      );
      grad1.addColorStop(0, `hsla(${nebulaHue1}, 75%, 50%, 0.10)`);
      grad1.addColorStop(0.6, `hsla(${nebulaHue2}, 65%, 45%, 0.03)`);
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.82, height * 0.65, 10,
        width * 0.82, height * 0.65, width * 0.4
      );
      grad2.addColorStop(0, `hsla(${nebulaHue2}, 85%, 50%, 0.08)`);
      grad2.addColorStop(0.7, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 2. Stars with Diagonal Drift & Gentle Capped Scroll Response
      const maxStreak = 14; // Strictly capped: NEVER looks like screen tear
      const streakLength = Math.max(-maxStreak, Math.min(maxStreak, scrollVelocity * 0.9));

      for (let star of stars) {
        // Natural diagonal drift
        star.x += star.vx;
        star.y += star.vy - scrollVelocity * star.depth * 0.35;

        // Wrap around boundaries
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.2;

        if (star.isStreakable && Math.abs(streakLength) > 1.5) {
          // Subtle gentle diagonal streak (never tearing)
          ctx.strokeStyle = star.color;
          ctx.lineWidth = star.radius;
          ctx.globalAlpha = Math.min(0.85, currentAlpha);
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x - streakLength * 0.4, star.y + streakLength);
          ctx.stroke();
        } else {
          // Normal clean celestial dot
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = Math.max(0.15, Math.min(0.9, currentAlpha));
          if (star.depth > 0.8) {
            ctx.shadowBlur = 5;
            ctx.shadowColor = star.color;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1;

      // 3. Render Asteroids with Craters & Shading
      for (let ast of asteroids) {
        // Drift + scroll parallax
        ast.x += ast.speedX;
        ast.y += ast.speedY - scrollVelocity * 0.15;
        ast.rotation += ast.rotSpeed;

        // Wrap around screen
        if (ast.x < -60) ast.x = width + 50;
        if (ast.x > width + 60) ast.x = -50;
        if (ast.y < -60) ast.y = height + 50;
        if (ast.y > height + 60) ast.y = -50;

        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rotation);

        // Asteroid Body
        ctx.beginPath();
        const v0 = ast.vertices[0];
        ctx.moveTo(v0.x, v0.y);
        for (let i = 1; i < ast.vertices.length; i++) {
          const v = ast.vertices[i];
          ctx.lineTo(v.x, v.y);
        }
        ctx.closePath();

        // Shading: Sun is top-left, shadow bottom-right
        const rockGrad = ctx.createLinearGradient(-ast.radius, -ast.radius, ast.radius, ast.radius);
        rockGrad.addColorStop(0, '#475569'); // Light slate highlight
        rockGrad.addColorStop(0.4, '#334155'); // Rocky slate midtone
        rockGrad.addColorStop(1, '#0F172A'); // Deep shadow
        ctx.fillStyle = rockGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Draw Craters
        for (let cr of ast.craters) {
          ctx.beginPath();
          ctx.arc(cr.cx, cr.cy, cr.cr, 0, Math.PI * 2);
          
          // Crater rim & shadow
          const craterGrad = ctx.createLinearGradient(
            cr.cx - cr.cr, cr.cy - cr.cr,
            cr.cx + cr.cr, cr.cy + cr.cr
          );
          craterGrad.addColorStop(0, '#0F172A'); // Dark inner shadow
          craterGrad.addColorStop(1, '#64748B'); // Raised lit rim
          ctx.fillStyle = craterGrad;
          ctx.fill();

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#020512]">
      {/* Cinematic dark cosmos base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_90%_at_50%_-15%,rgba(30,27,75,0.4),rgba(2,5,18,0.97))]" />
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}

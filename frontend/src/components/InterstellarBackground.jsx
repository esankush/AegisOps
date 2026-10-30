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

    // Track scroll velocity with smooth damping
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let scrollProgress = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      // Controlled scroll velocity
      scrollVelocity += Math.max(-12, Math.min(12, delta * 0.25));
      lastScrollY = currentScrollY;

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollProgress = Math.min(1, Math.max(0, currentScrollY / maxScroll));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 220 Active Stars with continuous diagonal streamline animation
    const starCount = 220;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      const depth = Math.random(); // 0 (far) to 1 (near)
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        depth: depth,
        radius: depth * 1.6 + 0.5,
        baseLength: depth * 8 + 3, // Natural diagonal streamline length
        alpha: depth * 0.6 + 0.35,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
        // Diagonal trajectory: moving down & left
        vx: -0.35 * (depth + 0.4),
        vy: 0.28 * (depth + 0.4),
        color: ['#FFFFFF', '#E0F2FE', '#BAE6FD', '#DDD6FE', '#C084FC'][Math.floor(Math.random() * 5)]
      });
    }

    // Realistic Asteroids with Craters
    const createAsteroid = (x, y, radius, speedX, speedY, rotSpeed) => {
      const numPoints = 10;
      const vertices = [];
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const dist = radius * (0.82 + Math.random() * 0.3);
        vertices.push({
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist
        });
      }

      const craters = [];
      const numCraters = Math.floor(Math.random() * 3) + 2;
      for (let c = 0; c < numCraters; c++) {
        craters.push({
          cx: (Math.random() - 0.5) * radius * 1.05,
          cy: (Math.random() - 0.5) * radius * 1.05,
          cr: Math.random() * (radius * 0.2) + (radius * 0.12)
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
      createAsteroid(width * 0.14, height * 0.24, 26, 0.09, 0.06, 0.0022),
      createAsteroid(width * 0.86, height * 0.48, 34, -0.07, 0.05, -0.0018),
      createAsteroid(width * 0.38, height * 0.84, 20, 0.06, -0.04, 0.0028),
      createAsteroid(width * 0.75, height * 0.18, 18, -0.05, 0.07, 0.002)
    ];

    // High-speed shooting star streaks
    const shootingStars = [];
    const spawnShootingStar = () => {
      if (Math.random() < 0.025 && shootingStars.length < 3) {
        shootingStars.push({
          x: Math.random() * width * 0.9,
          y: Math.random() * (height * 0.4),
          length: Math.random() * 110 + 70,
          speed: Math.random() * 10 + 14,
          angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.2,
          opacity: 1,
          decay: Math.random() * 0.025 + 0.015
        });
      }
    };

    let time = 0;
    const render = () => {
      time += 0.01;

      // Smooth decay for scroll velocity
      scrollVelocity *= 0.90;
      if (Math.abs(scrollVelocity) < 0.02) scrollVelocity = 0;

      ctx.clearRect(0, 0, width, height);

      // 1. Shifting Nebulae Glows
      const nebulaHue1 = 265 + scrollProgress * 30;
      const nebulaHue2 = 195 + scrollProgress * 35;

      const grad1 = ctx.createRadialGradient(
        width * 0.22, height * 0.32, 10,
        width * 0.22, height * 0.32, width * 0.45
      );
      grad1.addColorStop(0, `hsla(${nebulaHue1}, 80%, 55%, 0.12)`);
      grad1.addColorStop(0.5, `hsla(${nebulaHue2}, 70%, 45%, 0.04)`);
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.82, height * 0.68, 10,
        width * 0.82, height * 0.68, width * 0.42
      );
      grad2.addColorStop(0, `hsla(${nebulaHue2}, 85%, 52%, 0.09)`);
      grad2.addColorStop(0.6, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 2. Animated Streamline Stars with Controlled Scroll Warp
      // Controlled extra length during scroll: capped at 18px so it NEVER tears
      const scrollExtra = Math.max(-18, Math.min(18, scrollVelocity * 1.2));

      for (let star of stars) {
        // Natural diagonal flow
        star.x += star.vx;
        star.y += star.vy - scrollVelocity * star.depth * 0.4;

        // Wrap around smoothly
        if (star.x < -10) star.x = width + 10;
        if (star.x > width + 10) star.x = -10;
        if (star.y < -10) star.y = height + 10;
        if (star.y > height + 10) star.y = -10;

        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = star.alpha + Math.sin(star.twinklePhase) * 0.15;

        // Draw streamline streak along the diagonal flight path
        const currentStreakLength = star.baseLength + Math.abs(scrollExtra) * star.depth;
        const tailX = star.x + currentStreakLength * 0.8;
        const tailY = star.y - currentStreakLength * 0.6 + scrollExtra;

        const starGrad = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
        starGrad.addColorStop(0, star.color);
        starGrad.addColorStop(1, 'transparent');

        ctx.strokeStyle = starGrad;
        ctx.lineWidth = star.radius;
        ctx.globalAlpha = Math.max(0.15, Math.min(0.9, currentAlpha));
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Glowing star head
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        if (star.depth > 0.75) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = star.color;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // 3. Asteroids with Craters & Shading
      for (let ast of asteroids) {
        ast.x += ast.speedX;
        ast.y += ast.speedY - scrollVelocity * 0.18;
        ast.rotation += ast.rotSpeed;

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

        const rockGrad = ctx.createLinearGradient(-ast.radius, -ast.radius, ast.radius, ast.radius);
        rockGrad.addColorStop(0, '#64748B'); // Raised lit highlight
        rockGrad.addColorStop(0.45, '#334155'); // Rocky slate midtone
        rockGrad.addColorStop(1, '#0F172A'); // Deep space shadow
        ctx.fillStyle = rockGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Draw Craters
        for (let cr of ast.craters) {
          ctx.beginPath();
          ctx.arc(cr.cx, cr.cy, cr.cr, 0, Math.PI * 2);
          
          const craterGrad = ctx.createLinearGradient(
            cr.cx - cr.cr, cr.cy - cr.cr,
            cr.cx + cr.cr, cr.cy + cr.cr
          );
          craterGrad.addColorStop(0, '#0F172A');
          craterGrad.addColorStop(1, '#94A3B8');
          ctx.fillStyle = craterGrad;
          ctx.fill();

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        ctx.restore();
      }

      // 4. Shooting Stars
      spawnShootingStar();
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        const tailX = s.x - Math.cos(s.angle) * s.length;
        const tailY = s.y - Math.sin(s.angle) * s.length;

        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
        grad.addColorStop(0.35, `rgba(0, 240, 255, ${s.opacity * 0.85})`);
        grad.addColorStop(1, 'transparent');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= s.decay;

        if (s.opacity <= 0 || s.x > width || s.y > height) {
          shootingStars.splice(i, 1);
        }
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_90%_at_50%_-15%,rgba(30,27,75,0.4),rgba(2,5,18,0.97))]" />
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}

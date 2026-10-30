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

    // Generate stars
    const starCount = 220;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.3,
        baseAlpha: Math.random() * 0.7 + 0.3,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        color: ['#FFFFFF', '#E0F2FE', '#BAE6FD', '#E9D5FF', '#FCE7F3'][Math.floor(Math.random() * 5)]
      });
    }

    // Shooting stars
    const shootingStars = [];
    const spawnShootingStar = () => {
      if (Math.random() < 0.015 && shootingStars.length < 3) {
        shootingStars.push({
          x: Math.random() * width * 0.8,
          y: Math.random() * (height * 0.4),
          length: Math.random() * 90 + 50,
          speed: Math.random() * 10 + 12,
          angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.2,
          opacity: 1,
          decay: Math.random() * 0.025 + 0.015
        });
      }
    };

    let time = 0;
    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Nebula Gas Glows
      const nebula1 = ctx.createRadialGradient(
        width * 0.25 + Math.sin(time * 0.3) * 50,
        height * 0.3 + Math.cos(time * 0.2) * 40,
        10,
        width * 0.25,
        height * 0.3,
        width * 0.4
      );
      nebula1.addColorStop(0, 'rgba(124, 58, 237, 0.12)');
      nebula1.addColorStop(0.5, 'rgba(59, 130, 246, 0.06)');
      nebula1.addColorStop(1, 'transparent');
      ctx.fillStyle = nebula1;
      ctx.fillRect(0, 0, width, height);

      const nebula2 = ctx.createRadialGradient(
        width * 0.8 + Math.cos(time * 0.25) * 60,
        height * 0.65 + Math.sin(time * 0.35) * 50,
        10,
        width * 0.8,
        height * 0.65,
        width * 0.45
      );
      nebula2.addColorStop(0, 'rgba(0, 240, 255, 0.09)');
      nebula2.addColorStop(0.6, 'rgba(168, 85, 247, 0.04)');
      nebula2.addColorStop(1, 'transparent');
      ctx.fillStyle = nebula2;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Stars
      for (let star of stars) {
        star.x += star.vx;
        star.y += star.vy;

        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.3;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
        ctx.shadowBlur = star.radius > 1.2 ? 6 : 0;
        ctx.shadowColor = star.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // 3. Draw & update shooting stars
      spawnShootingStar();
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        const tailX = s.x - Math.cos(s.angle) * s.length;
        const tailY = s.y - Math.sin(s.angle) * s.length;

        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
        grad.addColorStop(0.4, `rgba(0, 240, 255, ${s.opacity * 0.7})`);
        grad.addColorStop(1, 'transparent');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
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
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#020512]">
      {/* Background radial gradient blend */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,27,75,0.45),rgba(2,5,18,0.95))]" />
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}

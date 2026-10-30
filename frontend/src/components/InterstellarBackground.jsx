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

    // Track scroll position and calculate scroll velocity
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let scrollProgress = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      scrollVelocity += delta * 0.45;
      lastScrollY = currentScrollY;

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollProgress = Math.min(1, Math.max(0, currentScrollY / maxScroll));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Generate stars with 3D depth (layer 1: far/slow, layer 2: mid, layer 3: close/fast)
    const starCount = 280;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      const depth = Math.random(); // 0 (far) to 1 (near)
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseX: Math.random() * width,
        baseY: Math.random() * height,
        depth: depth,
        radius: depth * 1.8 + 0.4,
        baseAlpha: depth * 0.6 + 0.3,
        twinkleSpeed: Math.random() * 0.025 + 0.008,
        twinklePhase: Math.random() * Math.PI * 2,
        color: ['#FFFFFF', '#E0F2FE', '#BAE6FD', '#DDD6FE', '#C084FC'][Math.floor(Math.random() * 5)]
      });
    }

    // Shooting stars / Warp streaks
    const shootingStars = [];
    const spawnShootingStar = () => {
      if ((Math.random() < 0.02 || Math.abs(scrollVelocity) > 8) && shootingStars.length < 5) {
        shootingStars.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.5,
          length: Math.random() * 100 + 60,
          speed: Math.random() * 12 + 15 + Math.abs(scrollVelocity) * 0.8,
          angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.25,
          opacity: 1,
          decay: Math.random() * 0.03 + 0.015
        });
      }
    };

    let time = 0;
    const render = () => {
      time += 0.01;

      // Inertia decay for scroll velocity
      scrollVelocity *= 0.90;
      if (Math.abs(scrollVelocity) < 0.05) scrollVelocity = 0;

      ctx.clearRect(0, 0, width, height);

      // 1. Dynamic Nebula Gas (Shifts Hue & Position on Scroll)
      const nebulaHue1 = 260 + scrollProgress * 60; // Shifting violet to cyan
      const nebulaHue2 = 190 + scrollProgress * 70; // Shifting cyan to magenta

      const nebX1 = width * 0.25 + Math.sin(time * 0.25) * 60;
      const nebY1 = height * 0.35 + Math.cos(time * 0.2) * 50 - scrollVelocity * 2;
      const grad1 = ctx.createRadialGradient(nebX1, nebY1, 20, nebX1, nebY1, width * 0.45);
      grad1.addColorStop(0, `hsla(${nebulaHue1}, 80%, 55%, 0.14)`);
      grad1.addColorStop(0.5, `hsla(${nebulaHue2}, 70%, 50%, 0.06)`);
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const nebX2 = width * 0.8 + Math.cos(time * 0.2) * 70;
      const nebY2 = height * 0.7 + Math.sin(time * 0.3) * 60 - scrollVelocity * 3;
      const grad2 = ctx.createRadialGradient(nebX2, nebY2, 20, nebX2, nebY2, width * 0.5);
      grad2.addColorStop(0, `hsla(${nebulaHue2}, 90%, 55%, 0.12)`);
      grad2.addColorStop(0.6, `hsla(${nebulaHue1}, 75%, 45%, 0.04)`);
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 2. Parallax Starfield with Scroll Warp Streaking
      const warpFactor = scrollVelocity * 1.5;
      const isWarping = Math.abs(warpFactor) > 0.8;

      for (let star of stars) {
        // Move star by intrinsic drift + scroll parallax
        const speedMultiplier = star.depth * 2.2 + 0.3;
        star.y -= scrollVelocity * speedMultiplier * 0.85;

        // Wrap around screen
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.25;

        if (isWarping) {
          // Draw warp streak line during scrolling!
          const streakLength = Math.max(2, Math.abs(warpFactor) * speedMultiplier * 3);
          const streakY = star.y + (warpFactor > 0 ? streakLength : -streakLength);

          ctx.strokeStyle = star.color;
          ctx.lineWidth = star.radius * (star.depth > 0.7 ? 1.6 : 1.0);
          ctx.globalAlpha = Math.min(1, currentAlpha * 1.4);
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x, streakY);
          ctx.stroke();
        } else {
          // Normal celestial twinkle
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
          if (star.depth > 0.75) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = star.color;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1;

      // 3. Shooting Stars & High-Speed Warp Particles
      spawnShootingStar();
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        const tailX = s.x - Math.cos(s.angle) * s.length;
        const tailY = s.y - Math.sin(s.angle) * s.length;

        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
        grad.addColorStop(0.3, `rgba(0, 240, 255, ${s.opacity * 0.8})`);
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
      {/* Dynamic Deep Space Vignette with cosmic nebula blend */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_90%_at_50%_-20%,rgba(30,27,75,0.45),rgba(2,5,18,0.96))]" />
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}

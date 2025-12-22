"use client";

import { useEffect, useRef } from "react";

interface ParticleOptions {
  color: string;
  lineColor: string;
  particleCount: number;
  speed: number;
  connectionDistance: number;
  mouseRange: number;
  mouseForce: number;
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;

  constructor(width: number, height: number, speed: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * speed;
    this.vy = (Math.random() - 0.5) * speed;
    this.size = Math.random() * 2 + 1;
  }

  update(
    width: number,
    height: number,
    mouse: { x: number; y: number },
    options: ParticleOptions,
  ) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0 && distance < options.mouseRange) {
      const force = (options.mouseRange - distance) / options.mouseRange;
      const directionX = (dx / distance) * force * options.mouseForce;
      const directionY = (dy / distance) * force * options.mouseForce;
      this.x -= directionX;
      this.y -= directionY;
    }
  }

  draw(ctx: CanvasRenderingContext2D, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class ParticleNetwork {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;
  private mouse = { x: -1000, y: -1000 };
  private width = 0;
  private height = 0;

  private options: ParticleOptions = {
    color: "rgba(255, 255, 255, 0.9)",
    lineColor: "rgba(255, 255, 255, 0.15)",
    particleCount: 120,
    speed: 1.5,
    connectionDistance: 120,
    mouseRange: 150,
    mouseForce: 8,
  };

  constructor(canvas: HTMLCanvasElement, options?: Partial<ParticleOptions>) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context not supported");
    this.ctx = context;

    if (options) this.options = { ...this.options, ...options };
  }

  setSize(width: number, height: number, dpr: number) {
    const nextWidth = Math.floor(width);
    const nextHeight = Math.floor(height);
    if (nextWidth <= 0 || nextHeight <= 0) return false;

    this.width = nextWidth;
    this.height = nextHeight;

    this.canvas.width = Math.floor(nextWidth * dpr);
    this.canvas.height = Math.floor(nextHeight * dpr);
    this.canvas.style.width = `${nextWidth}px`;
    this.canvas.style.height = `${nextHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.createParticles();
    return true;
  }

  setMouse(x: number, y: number) {
    this.mouse.x = x;
    this.mouse.y = y;
  }

  start() {
    if (this.animationFrameId !== null) return;
    this.animationFrameId = window.requestAnimationFrame(this.animate);
  }

  destroy() {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private createParticles() {
    const areaScale = Math.sqrt((this.width * this.height) / (1200 * 800));
    const count = Math.max(40, Math.floor(this.options.particleCount * areaScale));

    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(this.width, this.height, this.options.speed));
    }
  }

  private drawLines() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance >= this.options.connectionDistance) continue;

        const opacity = 1 - distance / this.options.connectionDistance;
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.25})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
        this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
        this.ctx.stroke();
      }
    }
  }

  private animate = () => {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.particles.forEach((particle) => {
      particle.update(this.width, this.height, this.mouse, this.options);
      particle.draw(this.ctx, this.options.color);
    });

    this.drawLines();
    this.animationFrameId = window.requestAnimationFrame(this.animate);
  };
}

export function ParticleWaveBg() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const network = new ParticleNetwork(canvas);

    const syncSize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      return network.setSize(rect.width, rect.height, dpr);
    };

    const stopMouse = () => network.setMouse(-1000, -1000);

    const onMouseMove = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isInside) {
        stopMouse();
        return;
      }

      network.setMouse(e.clientX - rect.left, e.clientY - rect.top);
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            const ok = syncSize();
            if (!ok) network.destroy();
            else network.start();
          });

    resizeObserver?.observe(host);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", stopMouse);

    const ok = syncSize();
    if (ok) network.start();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", stopMouse);
      resizeObserver?.disconnect();
      network.destroy();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 overflow-hidden bg-black"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}

export { ParticleWaveBg as BlackHoleCanvas };
export default ParticleWaveBg;

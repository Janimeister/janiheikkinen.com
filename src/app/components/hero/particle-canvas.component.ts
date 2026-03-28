import { Component, ElementRef, viewChild, afterRenderEffect, signal, ChangeDetectionStrategy } from '@angular/core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

@Component({
  selector: 'app-particle-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas class="absolute inset-0 w-full h-full"></canvas>`,
})
export class ParticleCanvasComponent {
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private particles: Particle[] = [];
  private animationId = 0;
  private destroyed = signal(false);

  constructor() {
    afterRenderEffect(() => {
      if (this.destroyed()) return;
      const canvasEl = this.canvas().nativeElement;
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      const resize = () => {
        canvasEl.width = canvasEl.offsetWidth;
        canvasEl.height = canvasEl.offsetHeight;
      };
      resize();
      window.addEventListener('resize', resize);

      const count = Math.min(80, Math.floor((canvasEl.width * canvasEl.height) / 15000));
      this.particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvasEl.width,
        y: Math.random() * canvasEl.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      }));

      const draw = () => {
        if (this.destroyed()) return;
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

        for (const p of this.particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvasEl.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvasEl.height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(99,102,241,${p.opacity})`;
          ctx.fill();
        }

        // Draw connections
        for (let i = 0; i < this.particles.length; i++) {
          for (let j = i + 1; j < this.particles.length; j++) {
            const dx = this.particles[i].x - this.particles[j].x;
            const dy = this.particles[i].y - this.particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              ctx.beginPath();
              ctx.moveTo(this.particles[i].x, this.particles[i].y);
              ctx.lineTo(this.particles[j].x, this.particles[j].y);
              ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - dist / 120)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }

        this.animationId = requestAnimationFrame(draw);
      };
      this.animationId = requestAnimationFrame(draw);
    });
  }

  ngOnDestroy() {
    this.destroyed.set(true);
    cancelAnimationFrame(this.animationId);
  }
}

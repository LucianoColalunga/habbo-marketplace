/**
 * Motor del fondo de estrellas: estrellas que titilan y se mueven despacio,
 * líneas hacia el mouse y explosiones al tocarlas. No depende del DOM, así se
 * puede probar; el componente `Starfield` lo dibuja en un canvas.
 */

export interface Star {
  x: number;
  y: number;
  /** Velocidad propia (a la que vuelve después de un empujón). */
  bvx: number;
  bvy: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  speed: number;
  color: number;
  /** 0 → 1 mientras aparece (después de explotar). */
  fade: number;
  /** Fotogramas de espera antes de volver a aparecer. */
  wait: number;
}

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: number;
}

export interface Ring {
  x: number;
  y: number;
  t: number;
  max: number;
  color: number;
}

/** Cuántas estrellas según el tamaño de la pantalla. */
export function starCount(width: number, height: number): number {
  return Math.max(36, Math.min(150, Math.round((width * height) / 11000)));
}

const HIT_RADIUS = 44;
const NEAREST_RADIUS = 120;
const PUSH_RADIUS = 160;
const LINK_RADIUS = 150;

export class StarfieldEngine {
  stars: Star[] = [];
  sparks: Spark[] = [];
  rings: Ring[] = [];
  width = 0;
  height = 0;
  /** Colores: 0 y 1 son los de base; 2 es el acento de la sección. */
  palette: string[] = ["#cfe1ff", "#3987e5", "#f5b942"];

  constructor(private rand: () => number = Math.random) {}

  private pick(): number {
    const v = this.rand();
    return v < 0.5 ? 0 : v < 0.8 ? 1 : 2;
  }

  spawn(x = this.rand() * this.width, y = this.rand() * this.height): Star {
    // Deriva lenta hacia abajo a la izquierda, como polvo de estrellas.
    const bvx = -(0.05 + this.rand() * 0.18);
    const bvy = 0.03 + this.rand() * 0.14;
    return {
      x,
      y,
      bvx,
      bvy,
      vx: bvx,
      vy: bvy,
      r: 0.5 + this.rand() * 1.8,
      phase: this.rand() * Math.PI * 2,
      speed: 0.01 + this.rand() * 0.03,
      color: this.pick(),
      fade: 1,
      wait: 0,
    };
  }

  resize(width: number, height: number) {
    const grew = width > this.width || height > this.height;
    this.width = width;
    this.height = height;
    const target = starCount(width, height);
    if (this.stars.length > target) this.stars.length = target;
    while (this.stars.length < target) this.stars.push(this.spawn());
    if (grew) for (const s of this.stars) if (s.x > width || s.y > height) Object.assign(s, this.spawn());
  }

  /** Avanza la animación `dt` fotogramas (1 = 1/60 s). */
  step(dt: number) {
    const { width: w, height: h } = this;
    const k = Math.min(1, 0.03 * dt);
    for (const s of this.stars) {
      if (s.wait > 0) {
        s.wait -= dt;
        continue;
      }
      if (s.fade < 1) s.fade = Math.min(1, s.fade + 0.02 * dt);
      s.vx += (s.bvx - s.vx) * k;
      s.vy += (s.bvy - s.vy) * k;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.phase += s.speed * dt;
      // Al salir por un borde vuelve a entrar por el opuesto.
      if (s.x < -4) s.x = w + 4;
      else if (s.x > w + 4) s.x = -4;
      if (s.y > h + 4) s.y = -4;
      else if (s.y < -4) s.y = h + 4;
    }
    const drag = Math.pow(0.95, dt);
    for (const p of this.sparks) {
      p.vx *= drag;
      p.vy = p.vy * drag + 0.03 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.sparks = this.sparks.filter((p) => p.life > 0);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.max);
  }

  /** Estrellas que explotan con un toque en (x, y): las cercanas o, si no hay, la más próxima. */
  hit(x: number, y: number): Star[] {
    const visible = this.stars.filter((s) => s.wait <= 0 && s.fade > 0.5);
    const near = visible.filter((s) => Math.hypot(s.x - x, s.y - y) <= HIT_RADIUS);
    if (near.length > 0) return near.slice(0, 6);
    let best: Star | null = null;
    let bestD = NEAREST_RADIUS;
    for (const s of visible) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best ? [best] : [];
  }

  /** Hace explotar las estrellas tocadas y empuja a las vecinas. Devuelve cuántas explotaron. */
  explodeAt(x: number, y: number): number {
    const targets = this.hit(x, y);
    for (const s of targets) {
      const sparks = 14 + Math.floor(this.rand() * 8);
      for (let i = 0; i < sparks; i++) {
        const angle = this.rand() * Math.PI * 2;
        const speed = 1 + this.rand() * 3.2;
        const max = 30 + this.rand() * 30;
        this.sparks.push({
          x: s.x,
          y: s.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: max,
          max,
          r: 0.6 + this.rand() * 1.4,
          color: i % 3 === 0 ? 2 : s.color,
        });
      }
      this.rings.push({ x: s.x, y: s.y, t: 0, max: 36, color: s.color });
      // La estrella vuelve a aparecer en otro lado al rato.
      Object.assign(s, this.spawn(), { fade: 0, wait: 60 + this.rand() * 120 });
    }
    if (targets.length > 0) {
      for (const s of this.stars) {
        const dx = s.x - x;
        const dy = s.y - y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < PUSH_RADIUS) {
          const force = (1 - d / PUSH_RADIUS) * 2.2;
          s.vx += (dx / d) * force;
          s.vy += (dy / d) * force;
        }
      }
    }
    return targets.length;
  }

  /** Estrellas cercanas al mouse, con la intensidad de su línea (0 a 1). */
  links(px: number, py: number): { star: Star; strength: number }[] {
    const out: { star: Star; strength: number }[] = [];
    for (const s of this.stars) {
      if (s.wait > 0) continue;
      const d = Math.hypot(s.x - px, s.y - py);
      if (d < LINK_RADIUS) out.push({ star: s, strength: (1 - d / LINK_RADIUS) * s.fade });
    }
    return out;
  }

  /** Brillo actual de una estrella (titila entre 0,3 y 1). */
  alpha(s: Star): number {
    return (0.65 + 0.35 * Math.sin(s.phase)) * s.fade * (0.45 + s.r / 4);
  }

  draw(ctx: CanvasRenderingContext2D, pointer: { x: number; y: number } | null) {
    const colors = this.palette;
    ctx.clearRect(0, 0, this.width, this.height);
    if (pointer) {
      ctx.lineWidth = 1;
      for (const { star, strength } of this.links(pointer.x, pointer.y)) {
        ctx.globalAlpha = strength * 0.35;
        ctx.strokeStyle = colors[1];
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }
    }
    for (const s of this.stars) {
      if (s.wait > 0) continue;
      const a = this.alpha(s);
      ctx.fillStyle = colors[s.color];
      if (s.r > 1.4) {
        ctx.globalAlpha = a * 0.18;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    for (const r of this.rings) {
      const p = r.t / r.max;
      ctx.globalAlpha = (1 - p) * 0.5;
      ctx.strokeStyle = colors[r.color];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 4 + p * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.sparks) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = colors[p.color];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
}

import type { PointerEventHandler } from 'react';
import { useEffect, useRef, useState } from 'react';
import AnimatedCharacters from './ui/animated-characters';

type Props = {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function LoginVisualLeft({ isTyping, showPassword, passwordLength }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });

  const [mode, setMode] = useState<'calm' | 'bright'>('calm');
  const [entered] = useState(true);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    // Respect reduced motion.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduceMotion) return;

    const tick = () => {
      const s = stateRef.current;
      // Damping: critically smooth the CSS variables.
      s.mx += (s.tx - s.mx) * 0.08;
      s.my += (s.ty - s.my) * 0.08;
      el.style.setProperty('--mx', s.mx.toFixed(4));
      el.style.setProperty('--my', s.my.toFixed(4));
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const setTargetFromClientPoint = (clientX: number, clientY: number) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1; // [-1..1]
    const ny = ((clientY - rect.top) / rect.height) * 2 - 1; // [-1..1]
    stateRef.current.tx = clamp(nx, -1, 1);
    stateRef.current.ty = clamp(ny, -1, 1);
  };

  const onPointerMove: PointerEventHandler<HTMLDivElement> = (e) => {
    setTargetFromClientPoint(e.clientX, e.clientY);
  };

  const onPointerLeave: PointerEventHandler<HTMLDivElement> = () => {
    stateRef.current.tx = 0;
    stateRef.current.ty = 0;
  };

  // Minimal touch gesture logic (long-press + horizontal swipe).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let longPressTimer: number | null = null;
    let touchStartX: number | null = null;

    const onTouchStart = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      touchStartX = t.clientX;
      longPressTimer = window.setTimeout(() => setMode('bright'), 420);
    };

    const onTouchEnd = () => {
      if (longPressTimer) window.clearTimeout(longPressTimer);
      longPressTimer = null;

      // Horizontal swipe toggles between calm/bright.
      if (touchStartX != null) {
        // last touch point is not always available, so we approximate using current parallax target reset.
        // If user swipes strongly, they typically end outside start area; still we keep it deterministic:
        // We decide based on current tx sign when possible.
        const curX = stateRef.current.tx;
        if (Math.abs(curX) > 0.65) setMode((m) => (m === 'calm' ? 'bright' : 'calm'));
      }
      touchStartX = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    // Optional deviceorientation support for "陀螺仪触发视差".
    // We keep it safe and non-blocking: only enable when the browser supports it.
    const el = rootRef.current;
    if (!el) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduceMotion) return;

    const handler = (ev: DeviceOrientationEvent) => {
      if (typeof ev.gamma !== 'number' || typeof ev.beta !== 'number') return;
      // gamma: left/right, beta: front/back. Normalize to [-1..1].
      const nx = clamp(ev.gamma / 30, -1, 1);
      const ny = clamp(ev.beta / 30, -1, 1);
      stateRef.current.tx = nx;
      stateRef.current.ty = ny;
    };

    window.addEventListener('deviceorientation', handler, { passive: true });
    return () => window.removeEventListener('deviceorientation', handler);
  }, []);

  return (
    <div
      ref={rootRef}
      className={[
        'course-login-visual',
        entered ? 'course-login-visual--entered' : '',
        mode === 'bright' ? 'course-login-visual--bright' : '',
      ].join(' ')}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-hidden="true"
    >
      {/* Decorative asset layer. */}
      <img className="course-login-flower" src="/api/static/assets/flower.svg" alt="" />

      <div className="course-login-grid-overlay" />

      <div className="course-login-blob course-login-blob--a" />
      <div className="course-login-blob course-login-blob--b" />

      <div className="course-login-visual-inner">
        <div className="course-login-platform-title">在线学习管理平台</div>
        <div className="course-login-characters-wrap">
          <AnimatedCharacters isTyping={isTyping} showPassword={showPassword} passwordLength={passwordLength} />
        </div>
      </div>
    </div>
  );
}


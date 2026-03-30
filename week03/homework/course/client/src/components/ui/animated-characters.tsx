import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

type AnimatedCharactersProps = {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

type Position = {
  faceX: number;
  faceY: number;
  bodySkew: number;
};

function calculatePosition(mouseX: number, mouseY: number, ref: HTMLDivElement | null): Position {
  if (!ref) return { faceX: 0, faceY: 0, bodySkew: 0 };

  const rect = ref.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 3;

  const deltaX = mouseX - centerX;
  const deltaY = mouseY - centerY;

  const faceX = clamp(-15, 15, deltaX / 20);
  const faceY = clamp(-10, 10, deltaY / 30);
  const bodySkew = clamp(-6, 6, -deltaX / 120);

  return { faceX, faceY, bodySkew };
}

function EyeBall({
  size,
  isBlinking,
  eyeColor,
  pupilColor,
  forceLookX,
  forceLookY,
  offsetX = 0,
  offsetY = 0,
}: {
  size: number;
  isBlinking: boolean;
  eyeColor: string;
  pupilColor: string;
  forceLookX?: number;
  forceLookY?: number;
  offsetX?: number;
  offsetY?: number;
}) {
  const eyeRef = useRef<HTMLDivElement | null>(null);
  const maxDistance = useMemo(() => size * 0.42, [size]);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof forceLookX === 'number' && typeof forceLookY === 'number') return;

    const onMove = (e: MouseEvent) => {
      const el = eyeRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - eyeCenterX;
      const dy = e.clientY - eyeCenterY;

      const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
      const angle = Math.atan2(dy, dx);

      // Blue/Black (EyeBall): follow cursor direction.
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      setPupil({ x, y });
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [forceLookX, forceLookY, maxDistance]);

  const renderPupilX = typeof forceLookX === 'number' ? forceLookX : pupil.x;
  const renderPupilY = typeof forceLookY === 'number' ? forceLookY : pupil.y;

  return (
    <div
      ref={eyeRef}
      style={{
        position: 'absolute',
        left: offsetX,
        top: offsetY,
        width: size,
        height: isBlinking ? 2 : size,
        borderRadius: 999,
        background: eyeColor,
        overflow: 'hidden',
        transition: 'height 150ms ease-in-out',
      }}
    >
      {!isBlinking ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: 999,
            background: pupilColor,
            transform: `translate(${renderPupilX}px, ${renderPupilY}px) translate(-50%, -50%)`,
            transition: 'transform 180ms ease-out',
          }}
        />
      ) : null}
    </div>
  );
}

function Pupil({
  size,
  pupilColor,
  forceLookX,
  forceLookY,
  offsetX = 0,
  offsetY = 0,
  gazeStrength,
  baseLookX,
  baseLookY,
}: {
  size: number;
  pupilColor: string;
  forceLookX?: number;
  forceLookY?: number;
  offsetX?: number;
  offsetY?: number;
  gazeStrength?: number;
  baseLookX?: number;
  baseLookY?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const maxDistance = useMemo(() => size * 0.42, [size]);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const strength = typeof gazeStrength === 'number' ? gazeStrength : 1;
  const baseX = typeof baseLookX === 'number' ? baseLookX : 0;
  const baseY = typeof baseLookY === 'number' ? baseLookY : 0;

  // Forced gaze: skip mouse listener.
  useEffect(() => {
    if (typeof forceLookX !== 'number' || typeof forceLookY !== 'number') return;
    setPupil({ x: forceLookX, y: forceLookY });
  }, [forceLookX, forceLookY]);

  // Mouse-driven pupil when not forced.
  useEffect(() => {
    if (typeof forceLookX === 'number' && typeof forceLookY === 'number') return;

    setPupil({ x: 0, y: 0 });

    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;

      // Container is not transformed (only the inner dot moves), so rect center is stable.
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
      const angle = Math.atan2(dy, dx);

      // Repulsion: look away from the cursor.
      const x = baseX + -Math.cos(angle) * distance * strength;
      const y = baseY + -Math.sin(angle) * distance * strength;

      setPupil({ x, y });
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [forceLookX, forceLookY, maxDistance, strength, baseX, baseY]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: offsetX,
        top: offsetY,
        width: size,
        height: size,
        borderRadius: 999,
        // Disable clipping so the pupil dot won't look like it's shrinking at edges.
        overflow: 'visible',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          // Pupil dot (smaller than eye container to avoid ellipse clipping).
          width: size * 0.64,
          height: size * 0.64,
          borderRadius: 999,
          background: pupilColor,
          transform: `translate(${pupil.x}px, ${pupil.y}px) translate(-50%, -50%)`,
          transition: 'transform 0.1s ease-out',
        }}
      />
    </div>
  );
}

export default function AnimatedCharacters({ isTyping, showPassword, passwordLength }: AnimatedCharactersProps) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const purpleRef = useRef<HTMLDivElement | null>(null);
  const blackRef = useRef<HTMLDivElement | null>(null);
  const orangeRef = useRef<HTMLDivElement | null>(null);
  const yellowRef = useRef<HTMLDivElement | null>(null);

  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);

  const isHidingPassword = passwordLength > 0 && !showPassword;
  const isPeekingCondition = passwordLength > 0 && showPassword;

  // Global mouse tracking (body tilt & face offset).
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Purple random blinking.
  useEffect(() => {
    let mounted = true;
    let timeoutId: number | null = null;

    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        if (!mounted) return;
        setIsPurpleBlinking(true);
        window.setTimeout(() => {
          if (!mounted) return;
          setIsPurpleBlinking(false);
          schedule();
        }, 150);
      }, Math.random() * 4000 + 3000);
    };

    schedule();

    return () => {
      mounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  // Black random blinking.
  useEffect(() => {
    let mounted = true;
    let timeoutId: number | null = null;

    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        if (!mounted) return;
        setIsBlackBlinking(true);
        window.setTimeout(() => {
          if (!mounted) return;
          setIsBlackBlinking(false);
          schedule();
        }, 150);
      }, Math.random() * 4000 + 3000);
    };

    schedule();

    return () => {
      mounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  // Eye contact when typing focus.
  // Use layout effect to avoid a "one-frame" flash between normal state and forced eye state.
  useLayoutEffect(() => {
    if (!isTyping) {
      setIsLookingAtEachOther(false);
      return;
    }
    setIsLookingAtEachOther(true);
    const t = window.setTimeout(() => setIsLookingAtEachOther(false), 800);
    return () => window.clearTimeout(t);
  }, [isTyping]);

  // Peeking loop when password is visible & non-empty.
  useEffect(() => {
    if (!isPeekingCondition) {
      setIsPurplePeeking(false);
      return;
    }

    let mounted = true;
    let timeoutId: number | null = null;

    const schedule = () => {
      const delay = Math.random() * 3000 + 2000; // 2000~5000ms
      timeoutId = window.setTimeout(() => {
        if (!mounted) return;
        setIsPurplePeeking(true);
        window.setTimeout(() => {
          if (!mounted) return;
          setIsPurplePeeking(false);
          schedule();
        }, 800);
      }, delay);
    };

    schedule();

    return () => {
      mounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isPeekingCondition]);

  const purplePos = calculatePosition(mouseX, mouseY, purpleRef.current);
  const blackPos = calculatePosition(mouseX, mouseY, blackRef.current);
  const orangePos = calculatePosition(mouseX, mouseY, orangeRef.current);
  const yellowPos = calculatePosition(mouseX, mouseY, yellowRef.current);

  // Blue/purple body slant should trigger only when username is focused.
  const purpleHeight = isTyping ? 440 : 400;
  const purpleTransform =
    isPeekingCondition
      ? 'skewX(0deg)'
      : isTyping
        ? `skewX(${purplePos.bodySkew - 12}deg) translateX(40px)`
        : `skewX(${purplePos.bodySkew}deg)`;

  const blackTransform =
    isPeekingCondition
      ? 'skewX(0deg)'
      : isLookingAtEachOther
        ? `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
        : isTyping || isHidingPassword
          ? `skewX(${blackPos.bodySkew * 1.5}deg)`
          : `skewX(${blackPos.bodySkew}deg)`;

  const orangeTransform = isPeekingCondition ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew}deg)`;
  const yellowTransform = isPeekingCondition ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew}deg)`;

  const purpleEyesLeft = isPeekingCondition ? 20 : isLookingAtEachOther ? 55 : 45 + purplePos.faceX;
  const purpleEyesTop = isPeekingCondition ? 35 : isLookingAtEachOther ? 65 : 40 + purplePos.faceY;

  const purpleForceLookX = isPeekingCondition ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined;
  const purpleForceLookY = isPeekingCondition ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined;

  const blackEyesLeft = isPeekingCondition ? 10 : isLookingAtEachOther ? 32 : 26 + blackPos.faceX;
  const blackEyesTop = isPeekingCondition ? 28 : isLookingAtEachOther ? 12 : 32 + blackPos.faceY;

  const blackForceLookX = isPeekingCondition ? -4 : isLookingAtEachOther ? 0 : undefined;
  const blackForceLookY = isPeekingCondition ? -4 : isLookingAtEachOther ? -4 : undefined;

  // Orange / Yellow eyes:
  // - when peeking (passwordLength>0 && showPassword): fix offsets & forced gaze
  // - otherwise: follow mouse (no "click activation" because forceLook is undefined)
  const orangeEyesLeft = isPeekingCondition ? 50 : 82 + orangePos.faceX;
  const orangeEyesTop = isPeekingCondition ? 85 : 90 + orangePos.faceY;

  const yellowEyesLeft = isPeekingCondition ? 20 : 52 + yellowPos.faceX;
  const yellowEyesTop = isPeekingCondition ? 35 : 40 + yellowPos.faceY;

  const yellowMouthLeft = isPeekingCondition ? 10 : 40 + yellowPos.faceX;
  const yellowMouthTop = isPeekingCondition ? 88 : 88 + yellowPos.faceY;

  // Eye sizes are not stated in the doc; pick values that visually match the roles.
  // If you already have a reference screenshot, we can tune these constants to be pixel-perfect.
  const purpleEyeSize = 40;
  const blackEyeSize = 28;
  const pupilSize = 20;

  const orangeYellowGazeStrength = passwordLength > 0 ? (isPeekingCondition ? 0.35 : 1) : 0;

  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const TRANSFORM_MS = 800;
  const EYE_MOVE_MS = 800;

  return (
    <div style={{ width: 550, height: 400, position: 'relative' }}>
      {/* Back layer: Purple */}
      <div
        ref={purpleRef}
        style={{
          position: 'absolute',
          left: 70,
          bottom: 0,
          width: 180,
          height: purpleHeight,
          background: '#6C3FF5',
          borderRadius: '10px 10px 0 0',
          transform: purpleTransform,
          zIndex: 1,
          transformOrigin: '50% 100%',
          transition: `transform ${TRANSFORM_MS}ms ${EASE}, height ${TRANSFORM_MS}ms ${EASE}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: purpleEyesLeft,
            top: purpleEyesTop,
            width: 110,
            height: 60,
            transition: `left ${EYE_MOVE_MS}ms ${EASE}, top ${EYE_MOVE_MS}ms ${EASE}`,
          }}
        >
          <EyeBall
            size={purpleEyeSize}
            isBlinking={isPurpleBlinking}
            eyeColor="white"
            pupilColor="#2D2D2D"
            forceLookX={purpleForceLookX}
            forceLookY={purpleForceLookY}
          />
          <EyeBall
            size={purpleEyeSize}
            isBlinking={isPurpleBlinking}
            eyeColor="white"
            pupilColor="#2D2D2D"
            forceLookX={purpleForceLookX}
            forceLookY={purpleForceLookY}
            offsetX={54}
            offsetY={0}
          />
        </div>
      </div>

      {/* Middle layer: Black */}
      <div
        ref={blackRef}
        style={{
          position: 'absolute',
          left: 240,
          bottom: 0,
          width: 120,
          height: 310,
          background: '#2D2D2D',
          borderRadius: '8px 8px 0 0',
          transform: blackTransform,
          zIndex: 2,
          transformOrigin: '50% 100%',
          transition: `transform ${TRANSFORM_MS}ms ${EASE}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: blackEyesLeft,
            top: blackEyesTop,
            width: 86,
            height: 60,
            transition: `left ${EYE_MOVE_MS}ms ${EASE}, top ${EYE_MOVE_MS}ms ${EASE}`,
          }}
        >
          <EyeBall
            size={blackEyeSize}
            isBlinking={isBlackBlinking}
            eyeColor="white"
            pupilColor="#2D2D2D"
            forceLookX={blackForceLookX}
            forceLookY={blackForceLookY}
            offsetX={0}
            offsetY={0}
          />
          <EyeBall
            size={blackEyeSize}
            isBlinking={isBlackBlinking}
            eyeColor="white"
            pupilColor="#2D2D2D"
            forceLookX={blackForceLookX}
            forceLookY={blackForceLookY}
            offsetX={44}
            offsetY={0}
          />
        </div>
      </div>

      {/* Front left: Orange */}
      <div
        ref={orangeRef}
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 240,
          height: 200,
          background: '#FF9B6B',
          borderRadius: '120px 120px 0 0',
          transform: orangeTransform,
          zIndex: 3,
          transformOrigin: '50% 100%',
          transition: `transform ${TRANSFORM_MS}ms ${EASE}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: orangeEyesLeft,
            top: orangeEyesTop,
            width: 110,
            height: 60,
            transition: `left ${EYE_MOVE_MS}ms ${EASE}, top ${EYE_MOVE_MS}ms ${EASE}`,
          }}
        >
          <Pupil
            size={pupilSize}
            pupilColor="#2D2D2D"
            offsetX={0}
            offsetY={0}
            gazeStrength={orangeYellowGazeStrength}
            baseLookX={-5}
            baseLookY={-4}
          />
          <Pupil
            size={pupilSize}
            pupilColor="#2D2D2D"
            offsetX={42}
            offsetY={0}
            gazeStrength={orangeYellowGazeStrength}
            baseLookX={-5}
            baseLookY={-4}
          />
        </div>
      </div>

      {/* Front right: Yellow */}
      <div
        ref={yellowRef}
        style={{
          position: 'absolute',
          left: 310,
          bottom: 0,
          width: 140,
          height: 230,
          background: '#E8D754',
          borderRadius: '70px 70px 0 0',
          transform: yellowTransform,
          zIndex: 4,
          transformOrigin: '50% 100%',
          transition: `transform ${TRANSFORM_MS}ms ${EASE}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: yellowEyesLeft,
            top: yellowEyesTop,
            width: 90,
            height: 60,
            transition: `left ${EYE_MOVE_MS}ms ${EASE}, top ${EYE_MOVE_MS}ms ${EASE}`,
          }}
        >
          <Pupil
            size={pupilSize}
            pupilColor="#2D2D2D"
            offsetX={0}
            offsetY={0}
            gazeStrength={orangeYellowGazeStrength}
            baseLookX={-5}
            baseLookY={-4}
          />
          <Pupil
            size={pupilSize}
            pupilColor="#2D2D2D"
            offsetX={32}
            offsetY={0}
            gazeStrength={orangeYellowGazeStrength}
            baseLookX={-5}
            baseLookY={-4}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: yellowMouthLeft,
            top: yellowMouthTop,
            width: 80,
            height: 4,
            background: '#2D2D2D',
            borderRadius: 999,
            zIndex: 6,
            transition: `left ${EYE_MOVE_MS}ms ${EASE}, top ${EYE_MOVE_MS}ms ${EASE}`,
          }}
        />
      </div>
    </div>
  );
}


import { useRef, useState } from 'react';
import { touchInput } from '../controls/touchInput';
import { useStore } from '../state/store';
import { useT } from './i18n';

/**
 * On-screen joystick for walking on phones and tablets (or when enabled in Settings).
 * Drag the knob to walk; drag elsewhere on the view to look around.
 */
export function Joystick() {
  const t = useT();
  const mode = useStore((s) => s.cameraMode);
  const setting = useStore((s) => s.joystick);
  const [knob, setKnob] = useState<[number, number]>([0, 0]);
  const base = useRef<HTMLDivElement>(null);
  const coarse = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  const show = mode === 'walk' && (setting === 'on' || (setting === 'auto' && coarse));
  if (!show) return null;
  const R = 46;
  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    setKnob([dx, dy]);
    touchInput.x = dx / R;
    touchInput.y = -dy / R;
  };
  const end = () => { setKnob([0, 0]); touchInput.x = 0; touchInput.y = 0; };
  return (
    <div
      ref={base}
      className="joystick"
      data-testid="joystick"
      role="application"
      aria-label={t('joystick')}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); update(e); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') update(e); }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="knob" style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }} />
    </div>
  );
}

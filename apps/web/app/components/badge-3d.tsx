'use client';

import { useEffect, useRef, useState } from 'react';

export type BadgeKind = 'early' | 'verified' | 'plus';

const badgeFaces: Record<
  BadgeKind,
  { title: string; emblem: string; gradient: [string, string, string]; caption: string }
> = {
  early: {
    title: 'Early member',
    emblem: '✦',
    gradient: ['#f6c453', '#d99a1f', '#8a5a00'],
    caption: 'Joined VouchNet before public launch',
  },
  verified: {
    title: 'Identity verified',
    emblem: '✓',
    gradient: ['#5db8ff', '#1f4e8c', '#0b2d57'],
    caption: 'Government ID + selfie match',
  },
  plus: {
    title: 'VouchNet Plus',
    emblem: '◆',
    gradient: ['#c59bff', '#6a3fd8', '#351b7a'],
    caption: 'VouchNet Plus subscriber',
  },
};

const rimSegments = 40;

/**
 * A 3D coin-style badge: drag or hover to spin it around and inspect the faces.
 * Pure CSS 3D — no WebGL dependency.
 */
export function Badge3d({ kind, detail }: { kind: BadgeKind; detail?: string | null }) {
  const face = badgeFaces[kind];
  const [rotation, setRotation] = useState({ x: -12, y: 24 });
  const [interacting, setInteracting] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (interacting) return;
    const timer = window.setInterval(() => {
      setRotation((current) => ({ ...current, y: (current.y + 0.4) % 360 }));
    }, 30);
    return () => window.clearInterval(timer);
  }, [interacting]);

  function onPointerDown(event: React.PointerEvent) {
    dragOrigin.current = {
      x: event.clientX,
      y: event.clientY,
      rx: rotation.x,
      ry: rotation.y,
    };
    setInteracting(true);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const origin = dragOrigin.current;
    if (origin === null) return;
    setRotation({
      x: Math.max(-85, Math.min(85, origin.rx - (event.clientY - origin.y) * 0.6)),
      y: origin.ry + (event.clientX - origin.x) * 0.6,
    });
  }

  function endDrag() {
    dragOrigin.current = null;
    setInteracting(false);
  }

  return (
    <div className="badge3d" role="img" aria-label={`${face.title} badge. ${face.caption}.`}>
      <div
        className="badge3d-stage"
        ref={rootRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="badge3d-coin"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          }}
        >
          <div
            className="badge3d-face badge3d-front"
            style={{
              background: `radial-gradient(circle at 32% 28%, ${face.gradient[0]}, ${face.gradient[1]} 58%, ${face.gradient[2]})`,
            }}
          >
            <span className="badge3d-emblem">{face.emblem}</span>
            <span className="badge3d-title">{face.title}</span>
          </div>
          <div
            className="badge3d-face badge3d-back"
            style={{
              background: `radial-gradient(circle at 68% 72%, ${face.gradient[0]}, ${face.gradient[1]} 58%, ${face.gradient[2]})`,
            }}
          >
            <span className="badge3d-caption">{face.caption}</span>
            {detail === undefined || detail === null ? null : (
              <span className="badge3d-detail">{detail}</span>
            )}
          </div>
          <div className="badge3d-rim">
            {Array.from({ length: rimSegments }, (_, index) => (
              <span
                key={index}
                className="badge3d-rim-segment"
                style={{
                  transform: `rotateY(${(360 / rimSegments) * index}deg) translateZ(56px)`,
                  background: index % 2 === 0 ? face.gradient[1] : face.gradient[2],
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <span className="badge3d-hint">Drag to inspect</span>
    </div>
  );
}

// src/AnnotatedRadiograph.jsx
// Pearl-style SVG overlay that renders color-coded bounding boxes on a radiograph.
// Consumes the full analyzeRadiograph() result — not a raw findings[] array.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FINDING_COLORS,
  FINDING_LABELS,
  flattenFindings,
} from './radiograph-analyzer';

export default function AnnotatedRadiograph({
  imageUrl,
  result,                 // full result object from analyzeRadiograph()
  showLegend = true,
  minConfidence = 0.4,
  onFindingClick,
  className = '',
}) {
  const imgRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState(null);

  const allFindings = useMemo(() => flattenFindings(result), [result]);
  const activeCategories = useMemo(
    () => Array.from(new Set(allFindings.map((f) => f.category))),
    [allFindings]
  );
  const [enabled, setEnabled] = useState(() => new Set());

  // Initialize enabled set once findings arrive.
  useEffect(() => {
    setEnabled(new Set(activeCategories));
  }, [activeCategories.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track rendered image size so the SVG overlay lines up.
  useEffect(() => {
    const update = () => {
      if (imgRef.current) {
        setDims({
          w: imgRef.current.clientWidth,
          h: imgRef.current.clientHeight,
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (imgRef.current) ro.observe(imgRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [imageUrl]);

  const visible = allFindings.filter(
    (f) => f.confidence >= minConfidence && enabled.has(f.category)
  );

  const toggle = (c) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  return (
    <div className={`annotated-radiograph ${className}`}>
      <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Radiograph"
          onLoad={() =>
            imgRef.current &&
            setDims({
              w: imgRef.current.clientWidth,
              h: imgRef.current.clientHeight,
            })
          }
          style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
        />

        {dims.w > 0 && visible.length > 0 && (
          <svg
            width={dims.w}
            height={dims.h}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {visible.map((f, i) => {
              const color = FINDING_COLORS[f.category] || '#ef4444';
              const x = f.bbox.x * dims.w;
              const y = f.bbox.y * dims.h;
              const w = f.bbox.width * dims.w;
              const h = f.bbox.height * dims.h;
              const isHover = hovered === i;
              const labelText = `${FINDING_LABELS[f.category] || f.category}${
                f.tooth ? ` · ${f.tooth}` : ''
              }`;

              return (
                <g
                  key={i}
                  style={{
                    pointerEvents: 'auto',
                    cursor: onFindingClick ? 'pointer' : 'default',
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onFindingClick?.(f)}
                >
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={color}
                    fillOpacity={isHover ? 0.22 : 0.08}
                    stroke={color}
                    strokeWidth={isHover ? 3 : 2}
                    rx={2}
                  />
                  <rect
                    x={x}
                    y={Math.max(0, y - 20)}
                    width={labelText.length * 6.5 + 12}
                    height={18}
                    fill={color}
                    rx={2}
                  />
                  <text
                    x={x + 6}
                    y={Math.max(13, y - 6)}
                    fill="white"
                    fontSize={11}
                    fontFamily="system-ui, sans-serif"
                    fontWeight={600}
                  >
                    {labelText}
                  </text>

                  {isHover && (
                    <foreignObject
                      x={Math.min(x, Math.max(0, dims.w - 260))}
                      y={y + h + 6}
                      width={260}
                      height={110}
                    >
                      <div
                        style={{
                          background: 'rgba(17, 24, 39, 0.95)',
                          color: 'white',
                          padding: '8px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          lineHeight: 1.4,
                          fontFamily: 'system-ui, sans-serif',
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{labelText}</div>
                        <div style={{ opacity: 0.85 }}>{f.description}</div>
                        <div style={{ opacity: 0.6, fontSize: 10, marginTop: 4 }}>
                          Severity: {f.severity} · Confidence:{' '}
                          {(f.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {showLegend && activeCategories.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            fontFamily: 'system-ui, sans-serif',
            fontSize: 12,
          }}
        >
          {activeCategories.map((c) => {
            const on = enabled.has(c);
            const count = allFindings.filter((f) => f.category === c).length;
            const color = FINDING_COLORS[c] || '#6b7280';
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: `1px solid ${color}`,
                  background: on ? color : 'transparent',
                  color: on ? 'white' : color,
                  cursor: 'pointer',
                  opacity: on ? 1 : 0.6,
                  transition: 'all 150ms',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: on ? 'white' : color,
                  }}
                />
                {FINDING_LABELS[c] || c} ({count})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

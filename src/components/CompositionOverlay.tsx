import type { SceneType } from '../utils/sceneClassifier';
import type { CompositionResult, ObjectGuide } from '../utils/compositionRules';
import { translateContourPath, scaleContourPath } from '../utils/contourExtractor';

interface CompositionOverlayProps {
  sceneType: SceneType;
  composition: CompositionResult;
  width: number;
  height: number;
  objectGuides: ObjectGuide[];
}

export function CompositionOverlay({ sceneType, composition, width, height, objectGuides }: CompositionOverlayProps) {
  if (width === 0 || height === 0) return null;

  const gridOpacity = composition.status === 'excellent' ? 0.2 : 0.15;
  const gridColor = composition.status === 'excellent'
    ? `rgba(34, 197, 94, ${gridOpacity})`
    : `rgba(255, 255, 255, ${gridOpacity})`;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <marker
          id="guide-arrow"
          markerWidth="16"
          markerHeight="12"
          refX="14"
          refY="6"
          orient="auto"
        >
          <polygon points="0 0, 16 6, 0 12" fill="white" />
        </marker>
        <filter id="outline-shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="black" floodOpacity="0.7" />
        </filter>
        <filter id="text-bg" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="black" floodOpacity="0.85" />
        </filter>
        <filter id="subtle-glow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="black" floodOpacity="0.4" />
        </filter>
        <filter id="contour-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <ThirdsGrid w={width} h={height} color={gridColor} />

      {objectGuides.map((guide, i) => (
        <ObjectGuideOverlay key={i} guide={guide} frameW={width} frameH={height} isPrimary={i === 0} />
      ))}
    </svg>
  );
}

function ObjectGuideOverlay({ guide, frameW, frameH, isPrimary }: { guide: ObjectGuide; frameW: number; frameH: number; isPrimary: boolean }) {
  const [bx, by, bw, bh] = guide.currentBbox;
  const hasContour = !!guide.contourPath;
  const fontSize = Math.max(18, Math.min(bw * 0.1, 30));
  const outlineWidth = isPrimary ? 5 : 4;

  const offsetX = guide.idealCenterX - guide.currentCenterX;
  const offsetY = guide.idealCenterY - guide.currentCenterY;

  let idealPath: string | null = null;
  if (hasContour && guide.needsMove) {
    idealPath = translateContourPath(guide.contourPath!, offsetX, offsetY);
  }

  return (
    <>
      {hasContour ? (
        <g>
          <path
            d={guide.contourPath!}
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={outlineWidth + 4}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#contour-glow)"
          />
          <path
            d={guide.contourPath!}
            fill="none"
            stroke="white"
            strokeWidth={outlineWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <FallbackOutline bx={bx} by={by} bw={bw} bh={bh} sw={outlineWidth} />
      )}

      <text
        x={bx + bw / 2}
        y={by - 12}
        fill="white"
        fontSize={fontSize}
        fontFamily="'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
        fontWeight="700"
        textAnchor="middle"
        filter="url(#text-bg)"
      >
        {guide.label}
      </text>

      {guide.needsMove && (
        <>
          {idealPath ? (
            <g opacity="0.7">
              <path
                d={idealPath}
                fill="rgba(34, 197, 94, 0.08)"
                stroke="#22c55e"
                strokeWidth="3"
                strokeDasharray="12 6"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#subtle-glow)"
              />
            </g>
          ) : (
            <FallbackIdealOutline cx={guide.idealCenterX} cy={guide.idealCenterY} bw={bw} bh={bh} />
          )}

          <text
            x={guide.idealCenterX}
            y={guide.idealCenterY - bh / 2 - 14}
            fill="#22c55e"
            fontSize={fontSize * 0.8}
            fontFamily="'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
            fontWeight="700"
            textAnchor="middle"
            filter="url(#text-bg)"
          >
            {"여기로 이동"}
          </text>

          <MoveArrow
            fromX={guide.currentCenterX}
            fromY={guide.currentCenterY}
            toX={guide.idealCenterX}
            toY={guide.idealCenterY}
            bboxW={bw}
            bboxH={bh}
          />
        </>
      )}

      {!guide.needsMove && (
        <g>
          <rect
            x={bx + bw / 2 - 60}
            y={by + bh + 8}
            width={120}
            height={fontSize + 10}
            rx={fontSize / 2 + 5}
            fill="rgba(34, 197, 94, 0.2)"
            stroke="rgba(34, 197, 94, 0.5)"
            strokeWidth="1"
          />
          <text
            x={bx + bw / 2}
            y={by + bh + fontSize + 12}
            fill="#22c55e"
            fontSize={fontSize * 0.75}
            fontFamily="'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
            fontWeight="700"
            textAnchor="middle"
          >
            {"좋은 위치!"}
          </text>
        </g>
      )}
    </>
  );
}

function FallbackOutline({ bx, by, bw, bh, sw }: { bx: number; by: number; bw: number; bh: number; sw: number }) {
  const r = Math.min(bw, bh) * 0.05;
  return (
    <g filter="url(#outline-shadow)">
      <rect
        x={bx}
        y={by}
        width={bw}
        height={bh}
        rx={r}
        fill="none"
        stroke="white"
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    </g>
  );
}

function FallbackIdealOutline({ cx, cy, bw, bh }: { cx: number; cy: number; bw: number; bh: number }) {
  const r = Math.min(bw, bh) * 0.05;
  return (
    <rect
      x={cx - bw / 2}
      y={cy - bh / 2}
      width={bw}
      height={bh}
      rx={r}
      fill="rgba(34, 197, 94, 0.08)"
      stroke="#22c55e"
      strokeWidth="3"
      strokeDasharray="12 6"
      filter="url(#subtle-glow)"
    />
  );
}

function MoveArrow({
  fromX, fromY, toX, toY, bboxW, bboxH,
}: {
  fromX: number; fromY: number; toX: number; toY: number;
  bboxW: number; bboxH: number;
}) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 8) return null;

  const nx = dx / dist;
  const ny = dy / dist;

  const startR = Math.min(bboxW, bboxH) * 0.42;
  const endR = Math.min(bboxW, bboxH) * 0.42;

  const sx = fromX + nx * startR;
  const sy = fromY + ny * startR;
  const ex = toX - nx * endR;
  const ey = toY - ny * endR;

  const arrowDist = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
  if (arrowDist < 20) return null;

  const perpX = -ny * dist * 0.06;
  const perpY = nx * dist * 0.06;
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;

  return (
    <g filter="url(#outline-shadow)">
      <path
        d={`M ${sx} ${sy} Q ${midX + perpX} ${midY + perpY} ${ex} ${ey}`}
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeDasharray="14 7"
        strokeLinecap="round"
        markerEnd="url(#guide-arrow)"
      />
    </g>
  );
}

function ThirdsGrid({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <g>
      <line x1={w / 3} y1={0} x2={w / 3} y2={h} stroke={color} strokeWidth="1" />
      <line x1={(2 * w) / 3} y1={0} x2={(2 * w) / 3} y2={h} stroke={color} strokeWidth="1" />
      <line x1={0} y1={h / 3} x2={w} y2={h / 3} stroke={color} strokeWidth="1" />
      <line x1={0} y1={(2 * h) / 3} x2={w} y2={(2 * h) / 3} stroke={color} strokeWidth="1" />

      {[
        [w / 3, h / 3],
        [2 * w / 3, h / 3],
        [w / 3, 2 * h / 3],
        [2 * w / 3, 2 * h / 3],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={4} fill={color} />
      ))}
    </g>
  );
}

import { cn } from '../../lib/cn';

interface RadialGaugeProps {
  value: number;       // 0-100
  target: number;      // 0-100 — where the tick goes
  size?: number;       // px
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

export function RadialGauge({ value, target, size = 140, strokeWidth = 10, className, children }: RadialGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Value arc
  const valuePercent = Math.min(100, Math.max(0, value));
  const valueOffset = circumference - (valuePercent / 100) * circumference;

  // Target tick angle (0° = top, clockwise)
  const targetAngle = (target / 100) * 360;
  const targetRad = (targetAngle - 90) * (Math.PI / 180);
  const tickInner = radius - strokeWidth;
  const tickOuter = radius + strokeWidth / 2;
  const tickX1 = center + tickInner * Math.cos(targetRad);
  const tickY1 = center + tickInner * Math.sin(targetRad);
  const tickX2 = center + tickOuter * Math.cos(targetRad);
  const tickY2 = center + tickOuter * Math.sin(targetRad);

  const isAboveTarget = value >= target;
  const strokeColor = isAboveTarget ? 'var(--success)' : 'var(--warning)';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={valueOffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        {/* Target tick mark */}
        <line
          x1={tickX1}
          y1={tickY1}
          x2={tickX2}
          y2={tickY2}
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

import { PieChart, Pie, Cell } from 'recharts';
import { cn } from '../../lib/cn';

interface RadialGaugeProps {
  value: number;       // 0-100
  target: number;      // 0-100
  size?: number;       // px
  className?: string;
  children?: React.ReactNode;
}

const COLORS = {
  low: 'var(--destructive)',
  mid: 'var(--warning)',
  high: 'var(--success-solid)',
  tick: 'var(--foreground)',
};

export function RadialGauge({ value, target, size = 180, className, children }: RadialGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const isAbove = clamped >= target;

  // Dynamic threshold bands based on user's target
  const redEnd = Math.round(target * 0.7);
  const amberEnd = target;
  const bands = [
    { name: 'low', value: redEnd, color: COLORS.low },
    { name: 'mid', value: amberEnd - redEnd, color: COLORS.mid },
    { name: 'high', value: 100 - amberEnd, color: COLORS.high },
  ];

  // The filled arc represents the current score
  const filled = [
    { name: 'value', value: clamped },
    { name: 'empty', value: 100 - clamped },
  ];

  // Target tick — a thin visible mark on the arc
  const targetAngle = (180 - (target / 100) * 180) * (Math.PI / 180);
  const outerR = size * 0.44;
  const innerR = size * 0.28;
  const cx = size / 2;
  const cy = size / 2;
  const tickX1 = cx + innerR * Math.cos(targetAngle);
  const tickY1 = cy - innerR * Math.sin(targetAngle);
  const tickX2 = cx + outerR * Math.cos(targetAngle);
  const tickY2 = cy - outerR * Math.sin(targetAngle);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size / 2 + 20 }}
      role="img"
      aria-label={`Readiness score: ${clamped}%. Target: ${target}%. ${isAbove ? 'At or above target.' : 'Below target.'}`}
    >
      {/* Screen-reader text */}
      <span className="sr-only">
        Readiness {clamped}%, target {target}%. {isAbove ? 'At or above target.' : 'Below target.'}
      </span>
      <PieChart width={size} height={size / 2 + 20}>
        {/* Background threshold bands */}
        <Pie
          data={bands}
          cx={cx}
          cy={cy}
          startAngle={180}
          endAngle={0}
          innerRadius={size * 0.30}
          outerRadius={size * 0.40}
          dataKey="value"
          stroke="none"
          isAnimationActive={false}
        >
          {bands.map((band) => (
            <Cell key={band.name} fill={band.color} opacity={0.15} />
          ))}
        </Pie>
        {/* Value arc */}
        <Pie
          data={filled}
          cx={cx}
          cy={cy}
          startAngle={180}
          endAngle={0}
          innerRadius={size * 0.30}
          outerRadius={size * 0.40}
          dataKey="value"
          stroke="none"
          cornerRadius={4}
        >
          <Cell fill={isAbove ? COLORS.high : COLORS.mid} />
          <Cell fill="transparent" />
        </Pie>
      </PieChart>
      {/* SVG tick mark on top */}
      <svg
        className="absolute inset-0"
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${size} ${size / 2 + 20}`}
        style={{ pointerEvents: 'none' }}
      >
        <line
          x1={tickX1}
          y1={tickY1}
          x2={tickX2}
          y2={tickY2}
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.7}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
        {children}
      </div>
    </div>
  );
}

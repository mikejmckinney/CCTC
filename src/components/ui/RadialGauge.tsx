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
  high: 'var(--success)',
};

export function RadialGauge({ value, target, size = 180, className, children }: RadialGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const isAbove = clamped >= target;

  // Dynamic threshold bands based on user's target:
  // Red: 0 to target*0.7  (well below target)
  // Amber: target*0.7 to target  (approaching target)
  // Green: target to 100  (at or above target)
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

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size / 2 + 20 }}>
      <PieChart width={size} height={size / 2 + 20}>
        {/* Background threshold bands — dynamic based on target */}
        <Pie
          data={bands}
          cx={size / 2}
          cy={size / 2}
          startAngle={180}
          endAngle={0}
          innerRadius={size * 0.32}
          outerRadius={size * 0.42}
          dataKey="value"
          stroke="none"
          isAnimationActive={false}
        >
          {bands.map((band) => (
            <Cell key={band.name} fill={band.color} opacity={0.2} />
          ))}
        </Pie>
        {/* Value arc */}
        <Pie
          data={filled}
          cx={size / 2}
          cy={size / 2}
          startAngle={180}
          endAngle={0}
          innerRadius={size * 0.32}
          outerRadius={size * 0.42}
          dataKey="value"
          stroke="none"
          cornerRadius={4}
        >
          <Cell fill={isAbove ? COLORS.high : COLORS.mid} />
          <Cell fill="transparent" />
        </Pie>
        {/* Target tick mark */}
        <Pie
          data={[{ value: target }, { value: 100 - target }]}
          cx={size / 2}
          cy={size / 2}
          startAngle={180}
          endAngle={0}
          innerRadius={size * 0.28}
          outerRadius={size * 0.46}
          dataKey="value"
          stroke="none"
          isAnimationActive={false}
        >
          <Cell fill="transparent" />
          <Cell fill="transparent" />
        </Pie>
      </PieChart>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        {children}
      </div>
    </div>
  );
}

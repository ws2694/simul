'use client';

interface Connection {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

interface ConnectionLinesProps {
  connections: Connection[];
  width: number;
  height: number;
}

export default function ConnectionLines({
  connections,
  width,
  height
}: ConnectionLinesProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(196, 181, 224, 0.3)" />
          <stop offset="50%" stopColor="rgba(196, 181, 224, 0.6)" />
          <stop offset="100%" stopColor="rgba(196, 181, 224, 0.3)" />
        </linearGradient>
      </defs>

      {connections.map((conn, index) => (
        <line
          key={index}
          x1={conn.from.x}
          y1={conn.from.y}
          x2={conn.to.x}
          y2={conn.to.y}
          stroke="url(#connectionGradient)"
          strokeWidth="2"
          strokeDasharray="5,5"
          className="connection-line"
        />
      ))}

      {/* Center glow */}
      <circle
        cx={width / 2}
        cy={height / 2}
        r="60"
        fill="url(#centerGlow)"
        className="opacity-50"
      />
      <defs>
        <radialGradient id="centerGlow">
          <stop offset="0%" stopColor="rgba(196, 181, 224, 0.4)" />
          <stop offset="100%" stopColor="rgba(196, 181, 224, 0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

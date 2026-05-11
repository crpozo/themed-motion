export function SoftSketch() {
  return (
    <svg viewBox="0 0 600 480" fill="none" stroke="currentColor" strokeWidth="1">
      <line x1="40" y1="120" x2="560" y2="120" stroke="rgba(242,237,228,.3)" />
      <line x1="40" y1="200" x2="560" y2="200" stroke="rgba(242,237,228,.3)" />
      <line x1="40" y1="280" x2="560" y2="280" stroke="rgba(242,237,228,.3)" />
      <line x1="40" y1="360" x2="560" y2="360" stroke="rgba(242,237,228,.3)" />
      <g fontFamily="ui-monospace, Menlo, monospace" fontSize="9" fill="rgba(242,237,228,.55)">
        <text x="40" y="108">EYES</text>
        <text x="40" y="188">NECK</text>
        <text x="40" y="268">ARMS</text>
        <text x="40" y="348">FX / SOUND</text>
        <text x="40" y="44">CUE 14 — “HELLO”</text>
        <text x="40" y="60" fill="rgba(242,237,228,.35)">00:00.00 — 00:08.40 · 30fps</text>
        <text x="490" y="44" fill="oklch(0.78 0.11 220)">▶ PLAY</text>
      </g>
      <path d="M80 120 C 140 80, 220 160, 300 110 S 460 90, 540 130" stroke="oklch(0.78 0.11 220)" strokeWidth="1.4" />
      <path d="M80 200 C 160 220, 240 170, 320 210 S 480 190, 540 200" stroke="oklch(0.78 0.11 220)" strokeWidth="1.4" />
      <path d="M80 280 C 130 250, 200 320, 280 280 S 420 250, 540 290" stroke="oklch(0.78 0.11 220)" strokeWidth="1.4" />
      <rect x="120" y="350" width="60" height="20" fill="oklch(0.72 0.08 75)" fillOpacity=".25" stroke="oklch(0.72 0.08 75)" />
      <rect x="240" y="350" width="100" height="20" fill="oklch(0.72 0.08 75)" fillOpacity=".25" stroke="oklch(0.72 0.08 75)" />
      <rect x="400" y="350" width="40" height="20" fill="oklch(0.72 0.08 75)" fillOpacity=".25" stroke="oklch(0.72 0.08 75)" />
      {[100, 180, 280, 360, 450, 530].map((x, i) => (
        <g key={i}>
          <rect x={x - 3} y={120 - 3} width="6" height="6" transform={`rotate(45 ${x} 120)`} fill="oklch(0.78 0.11 220)" stroke="none" />
          <rect x={x - 3} y={200 - 3} width="6" height="6" transform={`rotate(45 ${x} 200)`} fill="oklch(0.78 0.11 220)" stroke="none" />
          <rect x={x - 3} y={280 - 3} width="6" height="6" transform={`rotate(45 ${x} 280)`} fill="oklch(0.78 0.11 220)" stroke="none" />
        </g>
      ))}
      <line x1="240" y1="80" x2="240" y2="400" stroke="oklch(0.78 0.14 55)" strokeWidth="1" />
      <polygon points="240,76 234,68 246,68" fill="oklch(0.78 0.14 55)" />
      <text x="246" y="76" fontFamily="ui-monospace, Menlo, monospace" fontSize="9" fill="oklch(0.78 0.14 55)">02:18</text>
      <g fontFamily="ui-monospace, Menlo, monospace" fontSize="8" fill="rgba(242,237,228,.35)">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <g key={s}>
            <line x1={80 + s * 60} y1={420} x2={80 + s * 60} y2={426} stroke="rgba(242,237,228,.35)" />
            <text x={76 + s * 60} y={440}>{`0${s}s`}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

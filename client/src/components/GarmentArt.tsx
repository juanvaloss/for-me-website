import { useId } from "react";

interface GarmentShape {
  body: string;
  overlays: string[];
  seams: string[];
  shadowY: number;
  offsetY: number;
}

// Flat-lay silhouettes drawn on a 200×240 canvas, one per category slug.
const SHAPES: Record<string, GarmentShape> = {
  leggings: {
    body: "M62 26H138L141 42C147 84 145 124 137 164L131 222H109L101.5 104Q100 97 98.5 104L91 222H69L63 164C55 124 53 84 59 42Z",
    overlays: ["M62 26H138L141 42H59Z"],
    seams: ["M100 42V96"],
    shadowY: 228,
    offsetY: -4,
  },
  "biker-shorts": {
    body: "M62 46H138L141 62C147 92 147 118 144 146H105.5L101.5 114Q100 108 98.5 114L94.5 146H56C53 118 53 92 59 62Z",
    overlays: ["M62 46H138L141 62H59Z"],
    seams: ["M100 62V108"],
    shadowY: 154,
    offsetY: 24,
  },
  skirts: {
    body: "M64 50H136L137 64L162 170Q100 184 38 170L63 64Z",
    overlays: ["M64 50H136L137 64H63Z"],
    seams: ["M82 64L72 175", "M100 64V179", "M118 64L128 175"],
    shadowY: 186,
    offsetY: 6,
  },
  jackets: {
    body: "M78 30Q100 42 122 30L148 40Q158 46 161 60L172 176Q166 181 157 179L149 96L148 206H52L51 96L43 179Q34 181 28 176L39 60Q42 46 52 40Z",
    overlays: ["M80 22Q100 32 120 22L122 30Q100 42 78 30Z", "M52 196H148V206H52Z"],
    seams: ["M100 34V206", "M51 96L52 196", "M149 96L148 196"],
    shadowY: 214,
    offsetY: 6,
  },
  tops: {
    body: "M76 22H85Q88 52 100 57Q112 52 115 22H124Q126 66 146 90L150 206H50L54 90Q74 66 76 22Z",
    overlays: ["M50 198H150V206H50Z"],
    seams: [],
    shadowY: 214,
    offsetY: 6,
  },
};

// Categories that share a silhouette with another one.
const SHAPE_ALIASES: Record<string, string> = {
  sets: "leggings",
  shorts: "biker-shorts",
};

interface GarmentArtProps {
  category: string;
  color: string;
  className?: string;
}

export function GarmentArt({ category, color, className }: GarmentArtProps) {
  const sheenId = `sheen-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const shape = SHAPES[SHAPE_ALIASES[category] ?? category] ?? SHAPES.tops;

  return (
    <svg viewBox="0 0 200 240" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={sheenId} x1="0" x2="1" y1="0" y2="0.2">
          <stop offset="0" stopColor="#fff" stopOpacity="0.24" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <g transform={`translate(0 ${shape.offsetY})`}>
        <ellipse cx="100" cy={shape.shadowY} rx="58" ry="5" fill="rgba(43,33,28,0.09)" />
        <path d={shape.body} fill={color} />
        <path d={shape.body} fill={`url(#${sheenId})`} />
        {shape.overlays.map((d) => (
          <path key={d} d={d} fill="rgba(20,14,10,0.16)" />
        ))}
        {shape.seams.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="rgba(20,14,10,0.22)"
            strokeWidth="0.9"
            strokeDasharray="2.5 2"
          />
        ))}
        <path
          d={shape.body}
          fill="none"
          stroke="rgba(43,33,28,0.3)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

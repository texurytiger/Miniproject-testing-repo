/**
 * Built-in product illustrations (products.image holds the key). Line drawings in the store palette,
 * so the storefront looks finished without image hosting. Swap for real photos when E2 adds uploads.
 */
const S = { fill: 'none', stroke: '#101010', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' };
const P = '#FDFCF8';
const T = '#E3DBCC';
const D = '#101010';

const ART = {
  headphones: (
    <g {...S}>
      <path d="M40 92V78a40 40 0 0 1 80 0v14" />
      <rect x="30" y="86" width="22" height="38" rx="9" fill={D} />
      <rect x="108" y="86" width="22" height="38" rx="9" fill={D} />
      <path d="M48 72a32 32 0 0 1 64 0" stroke={T} strokeWidth="6" />
    </g>
  ),
  watch: (
    <g {...S}>
      <rect x="62" y="22" width="36" height="30" rx="6" fill={T} />
      <rect x="62" y="108" width="36" height="30" rx="6" fill={T} />
      <rect x="50" y="48" width="60" height="64" rx="16" fill={D} />
      <rect x="58" y="56" width="44" height="48" rx="10" fill="#2A2926" stroke="none" />
      <path d="M80 66v14l9 6" stroke={P} />
      <path d="M112 72h5v16h-5" />
    </g>
  ),
  lamp: (
    <g {...S}>
      <path d="M52 136h56" strokeWidth="5" />
      <path d="M80 136V96l-22-32" />
      <path d="M44 34l38-10 10 34-38 10z" fill={T} />
      <path d="M58 64c8 10 26 6 30-6" stroke="#C9A96E" strokeDasharray="3 6" />
      <circle cx="58" cy="64" r="6" fill={D} />
    </g>
  ),
  speaker: (
    <g {...S}>
      <rect x="44" y="30" width="72" height="104" rx="34" fill={D} />
      <circle cx="80" cy="96" r="20" fill="#2A2926" stroke={P} strokeWidth="2" />
      <circle cx="80" cy="96" r="7" fill={P} stroke="none" />
      <circle cx="80" cy="56" r="7" fill={P} stroke="none" />
    </g>
  ),
  sleeve: (
    <g {...S}>
      <rect x="26" y="44" width="108" height="76" rx="10" fill={T} />
      <path d="M26 64h108" />
      <rect x="66" y="52" width="28" height="6" rx="3" fill={D} stroke="none" />
      <path d="M40 104h20" stroke="#B5A88F" />
    </g>
  ),
  camera: (
    <g {...S}>
      <rect x="28" y="40" width="104" height="84" rx="14" fill={P} />
      <path d="M28 64h104" />
      <circle cx="80" cy="92" r="22" fill={D} />
      <circle cx="80" cy="92" r="10" fill="#2A2926" stroke={T} strokeWidth="2" />
      <rect x="40" y="48" width="16" height="9" rx="2" fill={T} />
      <circle cx="116" cy="52" r="4" fill={D} />
      <path d="M44 124v10h72v-10" fill={T} />
    </g>
  ),
  mug: (
    <g {...S}>
      <path d="M38 52h66v56a20 20 0 0 1-20 20H58a20 20 0 0 1-20-20z" fill={T} />
      <path d="M104 66h8a14 14 0 0 1 0 28h-8" />
      <path d="M38 70h66" stroke={D} />
      <path d="M58 26c-6 8 6 12 0 20M74 22c-6 8 6 12 0 20M90 26c-6 8 6 12 0 20" strokeWidth="2.5" />
    </g>
  ),
  kettle: (
    <g {...S}>
      <path d="M46 70h56l8 58H38z" fill={P} />
      <path d="M58 70c0-18 32-18 32 0" />
      <rect x="70" y="44" width="8" height="6" rx="2" fill={D} />
      <path d="M44 96C26 92 22 64 30 52" strokeWidth="4" />
      <path d="M102 80c14 4 14 30 2 36" strokeWidth="5" />
      <path d="M38 128h72" strokeWidth="5" />
    </g>
  ),
  plant: (
    <g {...S}>
      <path d="M50 96h60l-8 40H58z" fill={T} />
      <path d="M80 96V56" />
      <path d="M80 70c-22-2-30-20-26-34 16 2 28 14 26 34z" fill="#9FB08F" />
      <path d="M80 62c18-6 22-24 18-34-14 4-22 18-18 34z" fill="#7F9471" />
      <path d="M80 86c14-2 24-10 26-22-14 0-24 8-26 22z" fill="#9FB08F" />
      <path d="M46 96h68" strokeWidth="5" />
    </g>
  ),
  cushion: (
    <g {...S}>
      <path d="M34 42c30 8 62 8 92 0-8 26-8 54 0 80-30-8-62-8-92 0 8-26 8-54 0-80z" fill={T} />
      <path d="M50 62c20 6 40 6 60 0M50 102c20-6 40-6 60 0" stroke="#B5A88F" strokeWidth="2" />
    </g>
  ),
  shoe: (
    <g {...S}>
      <path d="M22 108c0-14 6-26 12-34 14 4 26 0 34-10 12 16 30 26 54 30 12 2 18 8 18 18v6H22z" fill={P} />
      <path d="M22 118h118v8H22z" fill={D} />
      <path d="M56 78l10 8M64 72l10 8M72 66l8 8" />
      <path d="M100 98h24" stroke={T} strokeWidth="5" />
    </g>
  ),
  backpack: (
    <g {...S}>
      <path d="M64 34a16 16 0 0 1 32 0" />
      <rect x="40" y="34" width="80" height="102" rx="22" fill={T} />
      <rect x="52" y="86" width="56" height="36" rx="8" fill={P} />
      <path d="M52 100h56" />
      <path d="M58 56h44" stroke="#B5A88F" />
    </g>
  ),
  sunglasses: (
    <g {...S}>
      <path d="M20 66h120" />
      <path d="M24 66c0 26 10 38 26 38s24-14 24-38z" fill={D} />
      <path d="M86 66c0 24 8 38 24 38s26-12 26-38z" fill={D} />
      <path d="M74 70c4-4 8-4 12 0" />
      <path d="M36 74l10 12" stroke={T} strokeWidth="2.5" />
      <path d="M98 74l10 12" stroke={T} strokeWidth="2.5" />
    </g>
  ),
  book: (
    <g {...S}>
      <path d="M44 30h70a6 6 0 0 1 6 6v94H50a6 6 0 0 1-6-6z" fill={D} />
      <path d="M44 124a6 6 0 0 1 6-6h70" stroke={P} />
      <path d="M60 52h44M60 62h30" stroke={T} />
      <circle cx="82" cy="90" r="9" fill="none" stroke={T} strokeWidth="2" />
    </g>
  ),
  book2: (
    <g {...S}>
      <path d="M44 30h70a6 6 0 0 1 6 6v94H50a6 6 0 0 1-6-6z" fill={T} />
      <path d="M44 124a6 6 0 0 1 6-6h70" />
      <rect x="58" y="46" width="46" height="34" fill={P} />
      <path d="M64 70l10-12 8 8 6-6 10 10" strokeWidth="2.5" />
      <path d="M58 94h40" />
    </g>
  ),
  serum: (
    <g {...S}>
      <rect x="66" y="22" width="28" height="22" rx="8" fill={D} />
      <path d="M72 44h16v10H72z" fill={P} />
      <rect x="52" y="54" width="56" height="82" rx="12" fill="#D9B98A" />
      <rect x="60" y="80" width="40" height="32" rx="3" fill={P} />
      <path d="M68 90h24M68 100h16" strokeWidth="2" />
    </g>
  ),
  yoga: (
    <g {...S}>
      <rect x="30" y="58" width="74" height="54" rx="27" fill="#9FB08F" />
      <path d="M104 85h26v48H40" fill="none" />
      <path d="M130 85v48" />
      <circle cx="67" cy="85" r="12" fill="#7F9471" />
      <path d="M48 64c10 8 10 34 0 42" stroke={P} strokeWidth="2" />
    </g>
  ),
  bottle: (
    <g {...S}>
      <rect x="66" y="20" width="28" height="18" rx="5" fill={D} />
      <path d="M62 38h36l6 14H56z" fill={P} />
      <rect x="54" y="52" width="52" height="88" rx="14" fill={T} />
      <path d="M54 76h52M54 116h52" />
    </g>
  ),
  mouse: (
    <g {...S}>
      <rect x="50" y="28" width="60" height="104" rx="30" fill={P} />
      <path d="M50 70h60M80 28v42" />
      <rect x="76" y="42" width="8" height="16" rx="4" fill={D} />
    </g>
  ),
  candle: (
    <g {...S}>
      <rect x="44" y="64" width="72" height="72" rx="10" fill={T} />
      <rect x="44" y="88" width="72" height="26" fill={P} />
      <path d="M80 64V52" />
      <path d="M80 50c-8-8-4-18 0-24 4 6 8 16 0 24z" fill="#D9B98A" />
    </g>
  ),
};

const TILE = { electronics: '#ECE6DA', home: '#F0EADF', fashion: '#EDE4D6', books: '#E9E3D7', beauty: '#F1E8DD', sports: '#E7E6DB' };

export default function ProductArt({ image, category, className = 'art', label }) {
  return (
    <svg className={className} viewBox="0 0 160 160" role="img" aria-label={label || image}>
      <rect width="160" height="160" fill={TILE[category] || '#EFEAE0'} />
      <ellipse cx="80" cy="142" rx="50" ry="5" fill="#101010" opacity=".06" />
      {ART[image] || ART.book}
    </svg>
  );
}

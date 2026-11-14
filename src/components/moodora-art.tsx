import { Flower } from './brand';

export function Bow({ className = '' }: { className?: string }) {
  return <svg className={className} width="90" height="70" viewBox="0 0 100 78" fill="none" aria-hidden="true"><path d="M49 32C29 4 6 9 12 31c4 17 25 15 36 8M52 32C72 4 95 9 89 31c-4 17-25 15-36 8" fill="#f3b9cd" stroke="#cc779c" strokeWidth="2"/><path d="M43 39 29 70l15-7 4 9 5-33M55 39l16 31-15-7-3 9-5-33" fill="#f3b9cd" stroke="#cc779c" strokeWidth="2" strokeLinejoin="round"/><path d="m21 23 24 13m34-13L55 36" stroke="#df96b3" strokeWidth="2"/><rect x="43" y="28" width="14" height="17" rx="5" fill="#edacc6" stroke="#cc779c" strokeWidth="2"/></svg>;
}

export function Daisy({ className = '', size = 45 }: { className?: string; size?: number }) {
  return <span className={`m-daisy ${className}`} aria-hidden="true"><Flower size={size}/></span>;
}

export function JournalArt() {
  return <svg viewBox="0 0 360 310" className="journal-illustration" fill="none" aria-hidden="true">
    <ellipse cx="185" cy="285" rx="120" ry="15" fill="#d4bedc" opacity=".25"/>
    <g transform="rotate(-9 160 165)"><rect x="62" y="46" width="222" height="233" rx="18" fill="#bda5d4" stroke="#9d83ba" strokeWidth="2"/><rect x="77" y="46" width="207" height="228" rx="16" fill="#dbcbea"/><path d="M89 48v224" stroke="#b39bc7" strokeWidth="2"/>
    <rect x="109" y="78" width="145" height="151" rx="5" fill="#fffaf4" stroke="#cfbddd" strokeDasharray="3 4"/>
    <text x="182" y="110" textAnchor="middle" fill="#8b729d" fontFamily="Georgia,serif" fontSize="14" fontStyle="italic">a little book of</text><text x="181" y="148" textAnchor="middle" fill="#7b5b96" fontFamily="Georgia,serif" fontSize="31">my feelings</text>
    <path d="M175 173c-15-20-35 3 6 24 42-21 19-44 5-24-3 4-8 4-11 0Z" fill="#ecafc8"/><text x="181" y="216" textAnchor="middle" fill="#9a879f" fontFamily="Georgia,serif" fontSize="11">every page is a fresh start</text>
    {[87,119,151,183,215,247].map(y=><path key={y} d={`M54 ${y}c-14-9-14 14 9 8`} stroke="#b799b6" strokeWidth="4" strokeLinecap="round"/>)}
    <path d="m247 48 1 46 11-8 10 8V48" fill="#eab1c7"/>
    </g><g transform="rotate(28 290 203)"><rect x="286" y="117" width="14" height="142" rx="6" fill="#efb0c5"/><path d="m286 256 7 22 7-22" fill="#e9d0ab"/><path d="m291 273 2 5 2-5" fill="#716077"/><rect x="286" y="117" width="14" height="19" rx="5" fill="#ac8dc0"/></g>
    <path d="m36 97 4-13 4 13 12 4-12 4-4 13-4-13-12-4 12-4Z" fill="#dcafc5"/><path d="m302 65 3-9 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#c2a8d9"/>
  </svg>;
}

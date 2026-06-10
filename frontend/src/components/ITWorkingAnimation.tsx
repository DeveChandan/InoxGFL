import React from 'react';

const ITWorkingAnimation: React.FC = () => {
  return (
    <div style={{ width: '100%', padding: '0', position: 'relative' }}>
      <style>{`
        /* ===== GLOBAL ANIMATION KEYFRAMES ===== */
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes floatUpSlow {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(0.96); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          49%       { opacity: 1; }
          50%       { opacity: 0; }
          99%       { opacity: 0; }
        }
        @keyframes typeArm {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(3px); }
        }
        @keyframes screenGlow {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 6px rgba(56,189,248,0.5)); }
          50%       { filter: brightness(1.15) drop-shadow(0 0 14px rgba(56,189,248,0.9)); }
        }
        @keyframes screenGlow2 {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 6px rgba(52,211,153,0.5)); }
          50%       { filter: brightness(1.15) drop-shadow(0 0 14px rgba(52,211,153,0.9)); }
        }
        @keyframes orbit {
          0%   { transform: rotate(0deg) translateX(52px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
        }
        @keyframes orbitReverse {
          0%   { transform: rotate(0deg) translateX(68px) rotate(0deg); }
          100% { transform: rotate(-360deg) translateX(68px) rotate(360deg); }
        }
        @keyframes fadeSlideUp {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes barGrow {
          0%   { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
        @keyframes codeScroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-40px); }
        }
        @keyframes wifiRing {
          0%   { stroke-dashoffset: 100; opacity: 0; }
          50%  { opacity: 1; }
          100% { stroke-dashoffset: 0;   opacity: 0; }
        }
        @keyframes spinSlow {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes notifPop {
          0%,90%,100% { transform: scale(1);   opacity: 1; }
          95%          { transform: scale(1.08); opacity: 1; }
        }
        @keyframes headBob {
          0%,100% { transform: rotate(0deg); }
          25%     { transform: rotate(-3deg); }
          75%     { transform: rotate(3deg); }
        }
        @keyframes steamUp {
          0%   { opacity: 0.8; transform: translateY(0) scaleX(1); }
          100% { opacity: 0;   transform: translateY(-14px) scaleX(1.4); }
        }
        @keyframes progressFill {
          0%   { width: 20%; }
          50%  { width: 85%; }
          100% { width: 20%; }
        }
        @keyframes dotBlink {
          0%,100% { opacity: 0.3; }
          50%     { opacity: 1; }
        }

        /* ===== ELEMENT CLASSES ===== */
        .man-head   { animation: headBob 3s ease-in-out infinite; transform-origin: 118px 105px; }
        .woman-head { animation: headBob 3.5s ease-in-out 0.8s infinite; transform-origin: 362px 100px; }

        .man-body   { animation: floatUpSlow 3.2s ease-in-out infinite; }
        .woman-body { animation: floatUpSlow 3.8s ease-in-out 1s infinite; }

        .man-arms   { animation: typeArm 0.28s ease-in-out infinite alternate; transform-origin: 118px 150px; }
        .woman-arms { animation: typeArm 0.32s ease-in-out 0.1s infinite alternate; transform-origin: 362px 148px; }

        .screen-left  { animation: screenGlow  2.5s ease-in-out infinite; }
        .screen-right { animation: screenGlow2 3s   ease-in-out infinite; }

        .code-lines { animation: codeScroll 3s linear infinite; }

        .bar1 { animation: barGrow 1.2s 0.1s ease-out both; transform-origin: bottom center; }
        .bar2 { animation: barGrow 1.2s 0.2s ease-out both; transform-origin: bottom center; }
        .bar3 { animation: barGrow 1.2s 0.3s ease-out both; transform-origin: bottom center; }
        .bar4 { animation: barGrow 1.2s 0.4s ease-out both; transform-origin: bottom center; }
        .bar5 { animation: barGrow 1.2s 0.5s ease-out both; transform-origin: bottom center; }

        .cursor   { animation: blink 1s step-end infinite; }
        .cursor-2 { animation: blink 1.2s step-end infinite; }

        .icon-orbit1 { animation: orbit        7s linear infinite; transform-origin: 240px 145px; }
        .icon-orbit2 { animation: orbitReverse 9s linear infinite; transform-origin: 240px 145px; }

        .notif-left  { animation: notifPop  3s ease-in-out infinite, floatUp 4s ease-in-out infinite; }
        .notif-right { animation: notifPop  3s ease-in-out 1.2s infinite, floatUp 4.5s ease-in-out 0.5s infinite; }

        .steam1 { animation: steamUp 1.8s ease-in-out infinite; }
        .steam2 { animation: steamUp 1.8s ease-in-out 0.6s infinite; }
        .steam3 { animation: steamUp 1.8s ease-in-out 1.2s infinite; }

        .wifi1 { animation: wifiRing 2.5s ease-out infinite; }
        .wifi2 { animation: wifiRing 2.5s ease-out 0.5s infinite; }
        .wifi3 { animation: wifiRing 2.5s ease-out 1s infinite; }

        .gear-spin { animation: spinSlow 6s linear infinite; transform-origin: 240px 40px; }

        .dot1 { animation: dotBlink 1.2s 0s   ease-in-out infinite; }
        .dot2 { animation: dotBlink 1.2s 0.4s ease-in-out infinite; }
        .dot3 { animation: dotBlink 1.2s 0.8s ease-in-out infinite; }

        .progress-bar rect.fill { animation: progressFill 4s ease-in-out infinite; }
      `}</style>

      <svg
        viewBox="0 0 480 290"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
          <linearGradient id="deskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e8f0fe" />
            <stop offset="100%" stopColor="#c7d7f8" />
          </linearGradient>
          <linearGradient id="monitorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="screenBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0c2340" />
            <stop offset="100%" stopColor="#0f3460" />
          </linearGradient>
          <linearGradient id="screenGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#052e16" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id="shirtMan" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4f8ef7" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="shirtWoman" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          <linearGradient id="skinTone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fcd0a0" />
            <stop offset="100%" stopColor="#f5b87e" />
          </linearGradient>
          <linearGradient id="skinTone2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e8a87c" />
            <stop offset="100%" stopColor="#d4895c" />
          </linearGradient>
          <linearGradient id="pantsMan" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a6e" />
            <stop offset="100%" stopColor="#0f2244" />
          </linearGradient>
          <linearGradient id="skirtWoman" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
          <linearGradient id="chairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="shadow" x="-10%" y="-5%" width="120%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.2)" />
          </filter>
          <clipPath id="screenClipL">
            <rect x="47" y="141" width="92" height="58" />
          </clipPath>
          <clipPath id="screenClipR">
            <rect x="337" y="135" width="100" height="62" />
          </clipPath>
        </defs>

        {/* ─── BACKGROUND FLOOR ─── */}
        <ellipse cx="240" cy="276" rx="200" ry="12" fill="rgba(0,0,0,0.12)" />

        {/* ─── ORBITING TECH ICONS (center) ─── */}
        <g className="icon-orbit1">
          <rect x="228" y="133" width="24" height="24" rx="6" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <text x="240" y="150" textAnchor="middle" fontSize="12">💻</text>
        </g>
        <g className="icon-orbit2">
          <rect x="228" y="129" width="24" height="24" rx="6" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <text x="240" y="146" textAnchor="middle" fontSize="12">📊</text>
        </g>

        {/* ─── GEAR TOP CENTER ─── */}
        <g className="gear-spin" opacity="0.25">
          <circle cx="240" cy="40" r="14" fill="none" stroke="white" strokeWidth="2.5" strokeDasharray="6 3" />
          <circle cx="240" cy="40" r="6" fill="white" opacity="0.5" />
        </g>

        {/* WiFi pulses from center-top */}
        <g style={{ transformOrigin: '240px 62px' }}>
          <path className="wifi3" d="M216 62 Q240 38 264 62" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="40" opacity="0" />
          <path className="wifi2" d="M224 62 Q240 47 256 62" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="30" strokeDashoffset="30" opacity="0" />
          <path className="wifi1" d="M232 62 Q240 54 248 62" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="20" strokeDashoffset="20" opacity="0" />
          <circle cx="240" cy="66" r="2.5" fill="white" opacity="0.7" />
        </g>

        {/* ════════════════════════════════
            LEFT SECTION — MAN
        ════════════════════════════════ */}

        {/* Chair */}
        <rect x="82" y="218" width="72" height="8" rx="4" fill="url(#chairGrad)" />
        <rect x="114" y="226" width="8" height="40" rx="3" fill="#475569" />
        <ellipse cx="118" cy="268" rx="22" ry="5" fill="#334155" opacity="0.8" />
        <rect x="94" y="264" width="6" height="6" rx="3" fill="#475569" />
        <rect x="135" y="264" width="6" height="6" rx="3" fill="#475569" />

        {/* Desk */}
        <rect x="18" y="204" width="194" height="12" rx="5" fill="url(#deskGrad)" filter="url(#shadow)" />
        <rect x="26" y="216" width="8" height="52" rx="3" fill="#b8c8ea" />
        <rect x="194" y="216" width="8" height="52" rx="3" fill="#b8c8ea" />

        {/* Monitor frame */}
        <rect x="38" y="132" width="112" height="74" rx="7" fill="url(#monitorGrad)" filter="url(#shadow)" />
        <rect x="47" y="141" width="94" height="58" rx="3" fill="url(#screenBlue)" className="screen-left" />

        {/* Monitor stand */}
        <rect x="84" y="204" width="20" height="6" rx="2" fill="#334155" />
        <rect x="76" y="208" width="36" height="4" rx="2" fill="#475569" />

        {/* CODE on screen (scrolling) */}
        <g clipPath="url(#screenClipL)">
          <g className="code-lines">
            {/* Line 1 */}
            <rect x="52" y="147" width="42" height="2.5" rx="1" fill="#38bdf8" />
            <rect x="97" y="147" width="20" height="2.5" rx="1" fill="#a78bfa" />
            {/* Line 2 */}
            <rect x="58" y="153" width="30" height="2.5" rx="1" fill="#34d399" />
            <rect x="91" y="153" width="36" height="2.5" rx="1" fill="#f472b6" />
            {/* Line 3 */}
            <rect x="64" y="159" width="52" height="2.5" rx="1" fill="#fbbf24" />
            {/* Line 4 */}
            <rect x="58" y="165" width="24" height="2.5" rx="1" fill="#38bdf8" />
            <rect x="85" y="165" width="40" height="2.5" rx="1" fill="#34d399" />
            {/* Line 5 */}
            <rect x="52" y="171" width="60" height="2.5" rx="1" fill="#f472b6" />
            {/* Line 6 */}
            <rect x="58" y="177" width="18" height="2.5" rx="1" fill="#a78bfa" />
            <rect x="79" y="177" width="32" height="2.5" rx="1" fill="#fbbf24" />
            {/* Line 7 */}
            <rect x="64" y="183" width="46" height="2.5" rx="1" fill="#38bdf8" />
            {/* Scrolled down repeats */}
            <rect x="52" y="189" width="42" height="2.5" rx="1" fill="#38bdf8" />
            <rect x="58" y="195" width="30" height="2.5" rx="1" fill="#34d399" />
          </g>
          {/* Cursor */}
          <rect className="cursor" x="52" y="188" width="2" height="9" rx="1" fill="rgba(255,255,255,0.9)" />
        </g>

        {/* Keyboard */}
        <rect x="52" y="207" width="90" height="10" rx="3" fill="#475569" />
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x={56 + i*10} y="209" width="7" height="3" rx="1" fill="#64748b" />
        ))}
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={60 + i*10} y="213" width="7" height="3" rx="1" fill="#64748b" />
        ))}

        {/* Mouse */}
        <rect x="148" y="206" width="13" height="10" rx="5" fill="#475569" />
        <line x1="154" y1="206" x2="154" y2="216" stroke="#64748b" strokeWidth="1" />

        {/* Coffee mug */}
        <rect x="22" y="194" width="18" height="14" rx="3" fill="white" opacity="0.92" />
        <path d="M40 197 Q47 197 47 203 Q47 209 40 209" fill="none" stroke="white" strokeWidth="2.2" opacity="0.85" />
        <rect x="24" y="196" width="14" height="4" rx="1" fill="#fb923c" opacity="0.8" />
        <path className="steam1" d="M27 194 Q29 190 27 186" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
        <path className="steam2" d="M32 194 Q34 189 32 184" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
        <path className="steam3" d="M37 194 Q39 190 37 186" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />

        {/* ── MAN CHARACTER ── */}
        <g className="man-body">
          {/* Chair back */}
          <rect x="86" y="176" width="68" height="44" rx="10" fill="#4a5568" opacity="0.5" />

          {/* Legs / pants */}
          <rect x="92" y="198" width="28" height="28" rx="4" fill="url(#pantsMan)" />
          <rect x="122" y="198" width="28" height="28" rx="4" fill="url(#pantsMan)" />
          {/* Shoes */}
          <ellipse cx="106" cy="230" rx="16" ry="5" fill="#0f172a" />
          <ellipse cx="136" cy="230" rx="16" ry="5" fill="#0f172a" />

          {/* Body / shirt */}
          <path d="M88 176 Q92 166 104 162 L138 162 Q150 166 154 176 L156 202 L86 202Z" fill="url(#shirtMan)" />

          {/* Tie */}
          <polygon points="121,162 124,162 126,185 121,180" fill="#fbbf24" opacity="0.9" />

          {/* Arms */}
          <g className="man-arms">
            {/* Left arm */}
            <path d="M90 170 Q70 180 66 200" stroke="url(#shirtMan)" strokeWidth="13" fill="none" strokeLinecap="round" />
            <ellipse cx="65" cy="202" rx="8" ry="6" fill="url(#skinTone)" />
            {/* Right arm */}
            <path d="M152 170 Q172 180 176 200" stroke="url(#shirtMan)" strokeWidth="13" fill="none" strokeLinecap="round" />
            <ellipse cx="177" cy="202" rx="8" ry="6" fill="url(#skinTone)" />
          </g>

          {/* Neck */}
          <rect x="112" y="152" width="18" height="14" rx="5" fill="url(#skinTone)" />
        </g>

        {/* Head (separate so it bobs) */}
        <g className="man-head">
          <circle cx="121" cy="112" r="26" fill="url(#skinTone)" filter="url(#shadow)" />
          {/* Hair */}
          <path d="M96 108 Q100 86 121 82 Q142 86 146 108 Q135 95 121 95 Q107 95 96 108Z" fill="#2c1810" />
          {/* Ears */}
          <ellipse cx="95"  cy="112" rx="5" ry="7" fill="url(#skinTone)" />
          <ellipse cx="147" cy="112" rx="5" ry="7" fill="url(#skinTone)" />
          {/* Eyes */}
          <ellipse cx="112" cy="110" rx="5" ry="5.5" fill="white" />
          <ellipse cx="130" cy="110" rx="5" ry="5.5" fill="white" />
          <circle cx="113" cy="111" r="3" fill="#1e293b" />
          <circle cx="131" cy="111" r="3" fill="#1e293b" />
          <circle cx="114" cy="109.5" r="1" fill="white" />
          <circle cx="132" cy="109.5" r="1" fill="white" />
          {/* Glasses */}
          <rect x="105" y="106" width="14" height="10" rx="3.5" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
          <rect x="122" y="106" width="14" height="10" rx="3.5" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
          <line x1="119" y1="111" x2="122" y2="111" stroke="#60a5fa" strokeWidth="1.5" />
          <line x1="95"  y1="110" x2="105" y2="109" stroke="#60a5fa" strokeWidth="1.5" />
          <line x1="136" y1="109" x2="146" y2="110" stroke="#60a5fa" strokeWidth="1.5" />
          {/* Eyebrows */}
          <path d="M107 104 Q112 101 117 103" fill="none" stroke="#2c1810" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M124 103 Q129 101 134 104" fill="none" stroke="#2c1810" strokeWidth="1.5" strokeLinecap="round" />
          {/* Nose */}
          <path d="M119 116 Q121 119 123 116" fill="none" stroke="#d4895c" strokeWidth="1.2" strokeLinecap="round" />
          {/* Smile */}
          <path d="M113 122 Q121 128 129 122" fill="none" stroke="#c47a5a" strokeWidth="1.8" strokeLinecap="round" />
          {/* Headphones */}
          <path d="M95 106 Q97 88 121 86 Q145 88 147 106" fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <rect x="91" y="106" width="8" height="12" rx="4" fill="#1e293b" />
          <rect x="143" y="106" width="8" height="12" rx="4" fill="#1e293b" />
        </g>

        {/* ════════════════════════════════
            RIGHT SECTION — WOMAN
        ════════════════════════════════ */}

        {/* Chair */}
        <rect x="324" y="216" width="72" height="8" rx="4" fill="url(#chairGrad)" />
        <rect x="356" y="224" width="8" height="42" rx="3" fill="#475569" />
        <ellipse cx="360" cy="268" rx="22" ry="5" fill="#334155" opacity="0.8" />
        <rect x="336" y="264" width="6" height="6" rx="3" fill="#475569" />
        <rect x="377" y="264" width="6" height="6" rx="3" fill="#475569" />

        {/* Desk */}
        <rect x="268" y="200" width="194" height="12" rx="5" fill="url(#deskGrad)" filter="url(#shadow)" />
        <rect x="276" y="212" width="8" height="56" rx="3" fill="#b8c8ea" />
        <rect x="446" y="212" width="8" height="56" rx="3" fill="#b8c8ea" />

        {/* Monitor frame */}
        <rect x="328" y="126" width="120" height="76" rx="7" fill="url(#monitorGrad)" filter="url(#shadow)" />
        <rect x="337" y="135" width="102" height="62" rx="3" fill="url(#screenGreen)" className="screen-right" />

        {/* Monitor stand */}
        <rect x="378" y="200" width="20" height="6" rx="2" fill="#334155" />
        <rect x="370" y="204" width="36" height="4" rx="2" fill="#475569" />

        {/* CHART on screen */}
        <g clipPath="url(#screenClipR)">
          {/* Chart title */}
          <rect x="342" y="140" width="55" height="3" rx="1.5" fill="#86efac" opacity="0.9" />
          <rect x="400" y="140" width="30" height="3" rx="1.5" fill="#4ade80" opacity="0.6" />
          {/* Baseline */}
          <line x1="342" y1="190" x2="433" y2="190" stroke="#166534" strokeWidth="1" />
          {/* Y axis */}
          <line x1="342" y1="148" x2="342" y2="190" stroke="#166534" strokeWidth="1" />
          {/* Bars */}
          <rect className="bar1" x="349" y="175" width="11" height="15" rx="2" fill="#22c55e" />
          <rect className="bar2" x="364" y="163" width="11" height="27" rx="2" fill="#16a34a" />
          <rect className="bar3" x="379" y="156" width="11" height="34" rx="2" fill="#4ade80" />
          <rect className="bar4" x="394" y="168" width="11" height="22" rx="2" fill="#22c55e" />
          <rect className="bar5" x="409" y="150" width="11" height="40" rx="2" fill="#4ade80" />
          <rect className="bar1" x="424" y="160" width="11" height="30" rx="2" fill="#16a34a" />
          {/* Trend line */}
          <polyline points="354,178 369,166 384,159 399,171 414,153 429,163" fill="none" stroke="#86efac" strokeWidth="1.5" strokeDasharray="3 2" />
          {/* Cursor */}
          <rect className="cursor-2" x="338" y="186" width="2" height="8" rx="1" fill="rgba(255,255,255,0.8)" />
        </g>

        {/* Keyboard */}
        <rect x="346" y="203" width="92" height="10" rx="3" fill="#475569" />
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x={350 + i*10} y="205" width="7" height="3" rx="1" fill="#64748b" />
        ))}
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={354 + i*10} y="209" width="7" height="3" rx="1" fill="#64748b" />
        ))}

        {/* Mouse */}
        <rect x="444" y="202" width="13" height="10" rx="5" fill="#475569" />
        <line x1="450" y1="202" x2="450" y2="212" stroke="#64748b" strokeWidth="1" />

        {/* Sticky note */}
        <rect x="450" y="178" width="28" height="26" rx="3" fill="#fde68a" opacity="0.92" />
        <rect x="453" y="183" width="22" height="2" rx="1" fill="#92400e" opacity="0.5" />
        <rect x="453" y="188" width="18" height="2" rx="1" fill="#92400e" opacity="0.5" />
        <rect x="453" y="193" width="20" height="2" rx="1" fill="#92400e" opacity="0.5" />

        {/* ── WOMAN CHARACTER ── */}
        <g className="woman-body">
          {/* Chair back */}
          <rect x="328" y="172" width="68" height="44" rx="10" fill="#4a5568" opacity="0.5" />

          {/* Skirt */}
          <path d="M334 196 L340 226 L360 226 L362 216 L364 226 L384 226 L390 196Z" fill="url(#skirtWoman)" />
          {/* Shoes */}
          <ellipse cx="350" cy="230" rx="16" ry="5" fill="#0f172a" />
          <ellipse cx="379" cy="230" rx="15" ry="5" fill="#0f172a" />

          {/* Body / shirt */}
          <path d="M334 172 Q338 162 350 158 L374 158 Q386 162 390 172 L394 200 L330 200Z" fill="url(#shirtWoman)" />

          {/* Scarf/collar detail */}
          <path d="M350 158 Q362 165 374 158" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />

          {/* Arms */}
          <g className="woman-arms">
            {/* Left arm */}
            <path d="M336 168 Q318 178 314 198" stroke="url(#shirtWoman)" strokeWidth="13" fill="none" strokeLinecap="round" />
            <ellipse cx="313" cy="200" rx="8" ry="6" fill="url(#skinTone2)" />
            {/* Right arm */}
            <path d="M388 168 Q406 178 410 198" stroke="url(#shirtWoman)" strokeWidth="13" fill="none" strokeLinecap="round" />
            <ellipse cx="411" cy="200" rx="8" ry="6" fill="url(#skinTone2)" />
          </g>

          {/* Neck */}
          <rect x="354" y="148" width="16" height="14" rx="5" fill="url(#skinTone2)" />
        </g>

        {/* Head */}
        <g className="woman-head">
          <circle cx="362" cy="106" r="26" fill="url(#skinTone2)" filter="url(#shadow)" />
          {/* Long hair */}
          <path d="M337 100 Q341 78 362 74 Q383 78 387 100 Q375 86 362 86 Q349 86 337 100Z" fill="#1a0a0a" />
          <path d="M336 100 Q330 120 332 148" fill="none" stroke="#1a0a0a" strokeWidth="10" strokeLinecap="round" />
          <path d="M388 100 Q394 120 392 148" fill="none" stroke="#1a0a0a" strokeWidth="10" strokeLinecap="round" />
          {/* Ears */}
          <ellipse cx="336" cy="108" rx="5" ry="7" fill="url(#skinTone2)" />
          <ellipse cx="388" cy="108" rx="5" ry="7" fill="url(#skinTone2)" />
          {/* Earrings */}
          <circle cx="336" cy="116" r="3.5" fill="#fbbf24" />
          <circle cx="388" cy="116" r="3.5" fill="#fbbf24" />
          {/* Eyes */}
          <ellipse cx="352" cy="106" rx="5.5" ry="6" fill="white" />
          <ellipse cx="372" cy="106" rx="5.5" ry="6" fill="white" />
          <circle cx="353" cy="107" r="3.5" fill="#1e293b" />
          <circle cx="373" cy="107" r="3.5" fill="#1e293b" />
          <circle cx="354" cy="105.5" r="1.2" fill="white" />
          <circle cx="374" cy="105.5" r="1.2" fill="white" />
          {/* Lashes */}
          <path d="M347 101 Q352 97 357 100" fill="none" stroke="#1a0a0a" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M367 100 Q372 97 377 101" fill="none" stroke="#1a0a0a" strokeWidth="1.5" strokeLinecap="round" />
          {/* Eyebrows */}
          <path d="M347 99 Q352 96 358 98" fill="none" stroke="#1a0a0a" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M366 98 Q372 96 377 99" fill="none" stroke="#1a0a0a" strokeWidth="1.8" strokeLinecap="round" />
          {/* Nose */}
          <path d="M359 114 Q362 118 365 114" fill="none" stroke="#b97a5a" strokeWidth="1.3" strokeLinecap="round" />
          {/* Lips */}
          <path d="M354 120 Q362 126 370 120" fill="#e05c7c" strokeLinecap="round" />
          <path d="M354 120 Q362 124 370 120" fill="none" stroke="#c0395a" strokeWidth="1" />
          {/* Hair band */}
          <ellipse cx="362" cy="78" rx="16" ry="6" fill="none" stroke="#f472b6" strokeWidth="2.5" />
        </g>

        {/* ════════════════════════════════
            CENTER — DECORATIVE PLANT
        ════════════════════════════════ */}
        <rect x="226" y="188" width="28" height="20" rx="5" fill="#3b5e3a" opacity="0.8" />
        <ellipse cx="240" cy="180" rx="16" ry="10" fill="#22c55e" opacity="0.95" />
        <ellipse cx="228" cy="185" rx="10" ry="7"  fill="#16a34a" opacity="0.95" />
        <ellipse cx="252" cy="185" rx="10" ry="7"  fill="#16a34a" opacity="0.95" />
        <ellipse cx="240" cy="172" rx="9" ry="6"   fill="#4ade80" opacity="0.95" />

        {/* ════════════════════════════════
            FLOATING NOTIFICATION CARDS
        ════════════════════════════════ */}

        {/* Left card — "Build Passed ✓" */}
        <g className="notif-left">
          <rect x="8" y="62" width="110" height="38" rx="10" fill="white" opacity="0.96" filter="url(#shadow)" />
          <rect x="8" y="62" width="5" height="38" rx="3" fill="#22c55e" />
          <circle cx="30" cy="77" r="9" fill="#dcfce7" />
          <text x="30" y="81" textAnchor="middle" fontSize="10">✅</text>
          <rect x="44" y="69" width="65" height="4" rx="2" fill="#1e293b" opacity="0.8" />
          <rect x="44" y="77" width="45" height="3" rx="1.5" fill="#94a3b8" />
          <rect x="44" y="84" width="55" height="3" rx="1.5" fill="#e2e8f0" />
        </g>

        {/* Right card — "Report Ready 📊" */}
        <g className="notif-right">
          <rect x="362" y="56" width="110" height="38" rx="10" fill="white" opacity="0.96" filter="url(#shadow)" />
          <rect x="362" y="56" width="5" height="38" rx="3" fill="#3b82f6" />
          <circle cx="384" cy="71" r="9" fill="#dbeafe" />
          <text x="384" y="75" textAnchor="middle" fontSize="10">📈</text>
          <rect x="398" y="63" width="65" height="4" rx="2" fill="#1e293b" opacity="0.8" />
          <rect x="398" y="71" width="48" height="3" rx="1.5" fill="#94a3b8" />
          <rect x="398" y="78" width="58" height="3" rx="1.5" fill="#e2e8f0" />
        </g>

        {/* ── Bottom progress bar ── */}
        <g className="progress-bar">
          <rect x="160" y="258" width="160" height="8" rx="4" fill="rgba(255,255,255,0.15)" />
          <rect x="160" y="258" width="120" height="8" rx="4" fill="rgba(255,255,255,0.55)" className="fill" />
        </g>

        {/* ── Typing dots (center bottom) ── */}
        <circle className="dot1" cx="228" cy="262" r="3.5" fill="white" />
        <circle className="dot2" cx="240" cy="262" r="3.5" fill="white" />
        <circle className="dot3" cx="252" cy="262" r="3.5" fill="white" />

      </svg>
    </div>
  );
};

export default ITWorkingAnimation;

export const WaveMesh = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/25 rounded-full blur-[100px]" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[350px] bg-violet-600/20 rounded-full blur-[110px]" />
      <div className="absolute bottom-[-10%] right-0 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[120px]" />

      {/* 3D Digital Particle Wave Mesh */}
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-0 left-0 w-full h-[65%] object-cover opacity-80"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#432BE8" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#6366F1" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#818CF8" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#C084FC" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.3" />
          </linearGradient>

          <pattern id="dotPattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.75" fill="#818CF8" opacity="0.3" />
          </pattern>
        </defs>

        {/* Subtle grid backdrop in lower half */}
        <rect y="250" width="800" height="350" fill="url(#dotPattern)" opacity="0.4" />

        {/* Filled Translucent Wave Ribbons */}
        <path
          d="M-50,480 C120,400 240,540 420,440 C580,350 680,480 850,420 L850,600 L-50,600 Z"
          fill="url(#waveFill)"
        />
        <path
          d="M-50,510 C150,440 280,560 460,470 C600,400 700,510 850,460 L850,600 L-50,600 Z"
          fill="url(#waveFill)"
          opacity="0.7"
        />

        {/* Digital Wave Lines (Dotted & Solid Topology) */}
        {/* Layer 1 */}
        <path
          d="M-40,430 C100,350 220,490 390,390 C540,300 660,430 840,370"
          fill="none"
          stroke="url(#lineGrad1)"
          strokeWidth="2"
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
        {/* Layer 2 */}
        <path
          d="M-40,445 C110,365 230,505 400,405 C550,315 670,445 840,385"
          fill="none"
          stroke="url(#lineGrad1)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          opacity="0.85"
        />
        {/* Layer 3 */}
        <path
          d="M-40,460 C120,380 240,520 410,420 C560,330 680,460 840,400"
          fill="none"
          stroke="url(#lineGrad2)"
          strokeWidth="1.75"
          strokeDasharray="1.5 5"
          opacity="0.9"
        />
        {/* Layer 4 */}
        <path
          d="M-40,475 C130,395 250,535 420,435 C570,345 690,475 840,415"
          fill="none"
          stroke="url(#lineGrad1)"
          strokeWidth="1.5"
          strokeDasharray="2 7"
          opacity="0.7"
        />
        {/* Layer 5 */}
        <path
          d="M-40,490 C140,410 260,550 430,450 C580,360 700,490 840,430"
          fill="none"
          stroke="url(#lineGrad2)"
          strokeWidth="2"
          strokeDasharray="3 6"
          opacity="0.8"
        />
        {/* Layer 6 */}
        <path
          d="M-40,505 C150,425 270,565 440,465 C590,375 710,505 840,445"
          fill="none"
          stroke="url(#lineGrad1)"
          strokeWidth="1.5"
          strokeDasharray="1 6"
          opacity="0.6"
        />
        {/* Layer 7 */}
        <path
          d="M-40,520 C160,440 280,580 450,480 C600,390 720,520 840,460"
          fill="none"
          stroke="url(#lineGrad2)"
          strokeWidth="2.5"
          strokeDasharray="4 8"
          opacity="0.75"
        />

        {/* Counter Flow Wave Lines */}
        <path
          d="M-40,540 C140,520 300,410 490,490 C630,550 740,430 840,490"
          fill="none"
          stroke="url(#lineGrad1)"
          strokeWidth="1.5"
          strokeDasharray="2 5"
          opacity="0.65"
        />
        <path
          d="M-40,555 C150,535 310,425 500,505 C640,565 750,445 840,505"
          fill="none"
          stroke="url(#lineGrad2)"
          strokeWidth="2"
          strokeDasharray="3 7"
          opacity="0.5"
        />

        {/* Glowing Node Points on Peaks */}
        <circle cx="390" cy="390" r="3.5" fill="#38BDF8" className="animate-pulse" filter="drop-shadow(0 0 6px #38bdf8)" />
        <circle cx="410" cy="420" r="2.5" fill="#C084FC" filter="drop-shadow(0 0 5px #c084fc)" />
        <circle cx="220" cy="490" r="2.5" fill="#818CF8" filter="drop-shadow(0 0 4px #818cf8)" />
        <circle cx="540" cy="300" r="3" fill="#60A5FA" filter="drop-shadow(0 0 6px #60a5fa)" />
        <circle cx="660" cy="430" r="2.5" fill="#A855F7" filter="drop-shadow(0 0 4px #a855f7)" />
      </svg>
    </div>
  )
}

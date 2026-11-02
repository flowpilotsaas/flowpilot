// Server component — pure CSS animation, no JS required

// C1 uses a swap wrapper — plane visible during phase 1, check during merge
const C1_ICON = (
  <span className="pv-icon-wrap">
    <svg className="pv-c1-plane" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9z" />
    </svg>
    <svg className="pv-c1-check" viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
)

const STEPS = [
  {
    title: 'Send the estimate',
    icon: C1_ICON,
  },
  {
    title: 'Customer approves',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    title: 'Job is scheduled',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    title: 'Reminder goes out',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
]

export default function ProcessVisual() {
  return (
    <div
      className="pv-wrap"
      role="img"
      aria-label="How it works: send the estimate, customer approves, job is scheduled, reminder goes out, and the job gets done."
    >
      {/* Phase 1: 4-circle grid + rail */}
      <div className="pv-phase1-group" aria-hidden="true">
        <div className="pv-steps">
          {STEPS.map((step) => (
            <div key={step.title} className="pv-step">
              <div className="pv-circle">{step.icon}</div>
              <span className="pv-label">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="pv-rail">
          <div className="pv-fill" />
          <div className="pv-dot" />
        </div>
      </div>

      {/* Phase 2+: Merged scene (MERGE → ROAD → DRIVE → DONE → LEAVE → RESET) */}
      <div className="pv-scene" aria-hidden="true">
        {/* Single merged circle with check mark */}
        <div className="pv-merged">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Dashed road — draws from merged circle to house */}
        <div className="pv-road" />

        {/* House — fades in and rises during van drive */}
        <div className="pv-house-wrap">
          <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true" fill="none">
            {/* Roof */}
            <polyline
              className="pv-hs"
              points="1,26 28,2 55,26"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Walls */}
            <rect
              className="pv-hs"
              x="7" y="26" width="42" height="28"
              strokeWidth="2.5"
              rx="1"
            />
            {/* Arched door — door fill animates green on DONE */}
            <path
              className="pv-hs pv-house-door"
              d="M22,54 L22,42 A6,6 0 0,1 34,42 L34,54"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Green check badge with drawn check — appears on DONE */}
          <div className="pv-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline className="pv-badge-check" points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* Van travel track — van animates left within this container */}
        <div className="pv-van-track">
          <div className="pv-van">
            <svg viewBox="0 0 44 26" width="44" height="26" aria-hidden="true" fill="none">
              {/* Solid body with sloped front cab */}
              <path d="M1,20 L1,5 Q1,2 4,2 L33,2 Q38,2 43,8 L43,20 Q43,23 40,23 L4,23 Q1,23 1,20 Z" fill="#2457F5" />
              {/* Single window cut-out */}
              <rect x="14" y="4" width="16" height="9" rx="2" fill="#F6F4EE" />
              {/* Wheels */}
              <circle cx="10" cy="22" r="4" fill="#14161B" />
              <circle cx="10" cy="22" r="1.5" fill="#5B6068" />
              <circle cx="34" cy="22" r="4" fill="#14161B" />
              <circle cx="34" cy="22" r="1.5" fill="#5B6068" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

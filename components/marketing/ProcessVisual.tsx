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

        {/* House with animated window and check badge */}
        <div className="pv-house-wrap">
          <svg
            viewBox="0 0 52 52"
            width="52"
            height="52"
            aria-hidden="true"
            fill="none"
          >
            {/* Roof */}
            <polygon
              points="2,24 26,2 50,24"
              stroke="#DDD9CE"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Body */}
            <rect x="8" y="24" width="36" height="26" stroke="#DDD9CE" strokeWidth="1.5" rx="1" />
            {/* Door */}
            <rect x="19" y="36" width="14" height="14" stroke="#DDD9CE" strokeWidth="1.5" rx="1" />
            {/* Window outline */}
            <rect x="11" y="28" width="10" height="8" stroke="#DDD9CE" strokeWidth="1.5" rx="1" />
            {/* Window fill — animates in on DONE */}
            <rect className="pv-house-win" x="11" y="28" width="10" height="8" fill="#1A7F4B" rx="1" />
          </svg>

          {/* Green check badge — appears on DONE */}
          <div className="pv-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* Van travel track — van animates left within this container */}
        <div className="pv-van-track">
          <div className="pv-van">
            <svg viewBox="0 0 44 26" width="44" height="26" aria-hidden="true" fill="none">
              {/* Body */}
              <rect x="0" y="1" width="36" height="14" rx="2" fill="#2457F5" />
              {/* Cab front */}
              <path d="M36 1 L43 7 L43 15 L36 15 Z" fill="#1a45d4" />
              {/* Windshield */}
              <path d="M36 3 L42 8 L42 14 L36 14 Z" fill="#a5b4fc" />
              {/* Side window 1 */}
              <rect x="21" y="3" width="9" height="5" rx="1" fill="#a5b4fc" />
              {/* Side window 2 */}
              <rect x="10" y="3" width="9" height="5" rx="1" fill="#a5b4fc" />
              {/* Rear cap */}
              <rect x="0" y="1" width="2" height="14" rx="1" fill="#1a45d4" />
              {/* Rear wheel */}
              <circle cx="9" cy="21" r="4" fill="#1f2937" />
              <circle cx="9" cy="21" r="1.5" fill="#6b7280" />
              {/* Front wheel */}
              <circle cx="35" cy="21" r="4" fill="#1f2937" />
              <circle cx="35" cy="21" r="1.5" fill="#6b7280" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

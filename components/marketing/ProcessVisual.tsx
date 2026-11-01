// Server component — pure CSS animation, no JS required

const STEPS = [
  {
    title: 'Send the estimate',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9z" />
      </svg>
    ),
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
      aria-label="How it works: send the estimate, customer approves, job is scheduled, reminder goes out"
    >
      <div className="pv-steps" aria-hidden="true">
        {STEPS.map((step) => (
          <div key={step.title} className="pv-step">
            <div className="pv-circle">{step.icon}</div>
            <span className="pv-label">{step.title}</span>
          </div>
        ))}
      </div>
      <div className="pv-rail" aria-hidden="true">
        <div className="pv-fill" />
        <div className="pv-dot" />
      </div>
    </div>
  )
}

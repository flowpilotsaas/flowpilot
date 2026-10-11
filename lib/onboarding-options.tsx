import * as React from 'react'
import {
  Snowflake, Droplets, Zap, Leaf, Sparkles, Wrench,
  User, Users, Building2, Landmark,
  PenLine, Table2, Laptop, CircleDashed,
  Check, X,
} from 'lucide-react'

// ─── option data (single source of truth for wizard + settings) ───────────────

export const INDUSTRIES = [
  { id: 'HVAC',        label: 'HVAC',        Icon: Snowflake },
  { id: 'Plumbing',    label: 'Plumbing',    Icon: Droplets  },
  { id: 'Electrical',  label: 'Electrical',  Icon: Zap       },
  { id: 'Landscaping', label: 'Landscaping', Icon: Leaf      },
  { id: 'Cleaning',    label: 'Cleaning',    Icon: Sparkles  },
  { id: 'Other',       label: 'Other',       Icon: Wrench    },
]

export const TEAM_SIZE_OPTS = [
  { id: 'Just me', label: 'Just me', Icon: User      },
  { id: '2–5',     label: '2–5',     Icon: Users     },
  { id: '6–15',    label: '6–15',    Icon: Building2 },
  { id: '16+',     label: '16+',     Icon: Landmark  },
]

export const CURRENT_TOOL_OPTS = [
  { id: 'paper',       label: 'Pen and paper',          Icon: PenLine      },
  { id: 'spreadsheet', label: 'Spreadsheets',            Icon: Table2       },
  { id: 'software',    label: 'Another app',             Icon: Laptop       },
  { id: 'none',        label: "I wasn't tracking them",  Icon: CircleDashed },
]

export const DEFAULT_ACTIONS = [
  { label: 'Add a customer',    desc: 'Build your customer list.',                  href: '/dashboard/customers' },
  { label: 'Create an estimate', desc: 'Send a professional quote to a customer.', href: '/dashboard/estimates' },
  { label: 'Add your first job', desc: 'Create and assign jobs to your team.',      href: '/dashboard/jobs'      },
]

// ─── "Other" industries: suggestions, parse/serialize, panel ─────────────────

export const INDUSTRY_SUGGESTIONS = [
  { name: 'Roofing',              keywords: ['roof', 'shingle', 'gutters'] },
  { name: 'Painting',             keywords: ['paint', 'interior', 'exterior'] },
  { name: 'Pest control',         keywords: ['pest', 'exterminator', 'bugs', 'termite'] },
  { name: 'Flooring',             keywords: ['floor', 'tile', 'carpet', 'hardwood'] },
  { name: 'General contractor',   keywords: ['remodel', 'construction', 'renovation'] },
  { name: 'Handyman',             keywords: ['repairs', 'odd jobs'] },
  { name: 'Pool service',         keywords: ['pool', 'spa', 'hot tub'] },
  { name: 'Garage doors',         keywords: ['garage', 'opener'] },
  { name: 'Appliance repair',     keywords: ['appliance', 'washer', 'dryer', 'fridge'] },
  { name: 'Locksmith',            keywords: ['lock', 'keys'] },
  { name: 'Carpentry',            keywords: ['carpenter', 'framing', 'cabinets'] },
  { name: 'Pressure washing',     keywords: ['power wash', 'window cleaning'] },
  { name: 'Fencing',              keywords: ['fence', 'gates'] },
  { name: 'Tree service',         keywords: ['tree', 'trimming', 'stump'] },
  { name: 'Concrete and masonry', keywords: ['concrete', 'brick', 'stone'] },
  { name: 'Drywall',              keywords: ['drywall', 'plaster'] },
  { name: 'Insulation',           keywords: ['insulation', 'attic'] },
  { name: 'Solar',                keywords: ['solar', 'panels'] },
  { name: 'Security systems',     keywords: ['security', 'alarm', 'cameras'] },
  { name: 'Moving',               keywords: ['movers', 'hauling'] },
]

export function parseIndustries(raw: string[]): {
  stdIds: string[]
  otherTags: string[]
  otherSelected: boolean
} {
  const stdIds: string[] = []
  const otherTags: string[] = []
  let otherSelected = false
  for (const val of raw) {
    if (val === 'Other') {
      otherSelected = true
    } else if (val.startsWith('other:')) {
      otherSelected = true
      otherTags.push(val.slice(6))
    } else {
      stdIds.push(val)
    }
  }
  return { stdIds, otherTags, otherSelected }
}

export function serializeIndustries(
  stdIds: string[],
  otherSelected: boolean,
  otherTags: string[],
): string[] {
  const result = [...stdIds]
  if (otherSelected) {
    if (otherTags.length === 0) {
      result.push('Other')
    } else {
      result.push(...otherTags.map(t => `other:${t}`))
    }
  }
  return result
}

export function OtherIndustriesPanel({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [inputVal, setInputVal] = React.useState('')

  const query = inputVal.trim().toLowerCase()
  const visible = query
    ? INDUSTRY_SUGGESTIONS.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.keywords.some(k => k.includes(query))
      )
    : INDUSTRY_SUGGESTIONS.slice(0, 8)

  function addTag(text: string) {
    const trimmed = text.trim().slice(0, 40)
    if (!trimmed) return
    if (tags.length >= 3) return
    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) return
    onChange([...tags, trimmed])
    setInputVal('')
  }

  function removeTag(text: string) {
    onChange(tags.filter(t => t !== text))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputVal)
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-4">
      <label className="block text-sm font-medium text-foreground mb-2">
        What kind of work do you do?
      </label>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value.slice(0, 40))}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Roofing, pest control"
          className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-[box-shadow]"
        />
        <button
          type="button"
          onClick={() => addTag(inputVal)}
          disabled={!inputVal.trim() || tags.length >= 3}
          className="h-9 px-3 rounded-lg border border-border bg-muted text-sm font-medium text-foreground hover:bg-muted/70 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {visible.map(s => {
          const isAdded = tags.some(t => t.toLowerCase() === s.name.toLowerCase())
          const atLimit = tags.length >= 3
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => addTag(s.name)}
              disabled={!isAdded && atLimit}
              className={[
                'px-3 py-1 rounded-full text-xs font-medium transition-colors select-none',
                isAdded
                  ? 'bg-primary/15 text-primary border border-primary/30 cursor-default'
                  : atLimit
                  ? 'bg-muted text-muted-foreground border border-border opacity-40 cursor-not-allowed'
                  : 'bg-muted text-muted-foreground border border-border cursor-pointer hover:border-primary/40 hover:bg-primary/[0.07] hover:text-foreground',
              ].join(' ')}
            >
              {s.name}
            </button>
          )
        })}
      </div>

      {/* Tags (removable pills) */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 pl-3 pr-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-sm font-medium text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-2.5 h-2.5 text-foreground/60" />
              </button>
            </span>
          ))}
        </div>
      )}

      {tags.length >= 3 && (
        <p className="text-xs text-muted-foreground mt-2">Maximum 3 custom trades added.</p>
      )}
    </div>
  )
}

// ─── shared SelectCard component ─────────────────────────────────────────────

export function SelectCard({
  Icon,
  label,
  selected,
  onClick,
}: {
  Icon?: React.ElementType
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col items-center gap-3 rounded-2xl border p-4 text-sm font-medium',
        'transition-all duration-150 cursor-pointer select-none',
        'hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]',
        selected
          ? 'border-primary bg-primary/[0.07] text-foreground shadow-sm ring-1 ring-primary/20'
          : 'border-border bg-transparent text-muted-foreground hover:border-primary/35 hover:bg-muted/40 hover:text-foreground',
      ].join(' ')}
    >
      {selected && (
        <span className="absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
        </span>
      )}
      {Icon && (
        <span
          className={[
            'w-11 h-11 rounded-xl flex items-center justify-center transition-colors',
            selected ? 'bg-primary/15' : 'bg-muted',
          ].join(' ')}
        >
          <Icon className={`w-5 h-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
        </span>
      )}
      {label}
    </button>
  )
}

// Minimal stroke icons, no emoji, no external icon library.
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
};

export function IconFichas({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M6 3.5h9l3 3V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z" />
      <path d="M14.5 3.5V7h3.5" />
      <path d="M8 11h8M8 14.5h8M8 18h5" />
    </svg>
  );
}

export function IconCalendario({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.8" />
      <path d="M8 3.5v4M16 3.5v4M4.5 10h15" />
      <circle cx="8.3" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15.7" cy="14" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconRepaso({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5M19.5 12a7.5 7.5 0 0 1-12.6 5.5" />
      <path d="M17 3.5v3.3h-3.3M7 20.5v-3.3h3.3" />
    </svg>
  );
}

export function IconGrabar({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </svg>
  );
}

export function IconBrightspace({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4 6.2C4 5 5 4.2 6.2 4.4c1.9.3 4.1 1 5.8 2.1 1.7-1.1 3.9-1.8 5.8-2.1C19 4.2 20 5 20 6.2v11.6c0 1.2-1 2-2.2 1.8-1.9-.3-4.1-1-5.8-2.1-1.7 1.1-3.9 1.8-5.8 2.1C5 19.8 4 19 4 17.8Z" />
      <path d="M12 6.5v12" />
    </svg>
  );
}

export function IconChevron({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconCheck({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconStop({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMaterias({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4 6.5A2 2 0 0 1 6 4.5h6.5v15H6a2 2 0 0 1-2-2Z" />
      <path d="M12.5 4.5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-5.5" />
      <path d="M7 8.5h3M7 12h3" />
    </svg>
  );
}

export function IconTalleres({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M12 4.5 4.5 8.5 12 12.5l7.5-4z" />
      <path d="M7 10.5V16c0 1.1 2.2 2 5 2s5-.9 5-2v-5.5" />
    </svg>
  );
}

export function IconMas({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTrash({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M5 7h14M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M7 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7" />
    </svg>
  );
}

export function IconPlus({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function icon(name, size = 24, color = 'var(--accent)') {
  const s = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;

  const icons = {
    home: `<svg ${s}><path d="M3 12l9-8 9 8"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9"/></svg>`,
    book: `<svg ${s}><path d="M5 4h6a2 2 0 0 1 2 2v13a1.5 1.5 0 0 0-1.5-1.5H5z" fill="${color}" fill-opacity=".1"/><path d="M19 4h-6a2 2 0 0 0-2 2v13a1.5 1.5 0 0 1 1.5-1.5H19z"/></svg>`,
    star: `<svg ${s}><path d="M12 4l2.2 4.8 5.2.5-3.9 3.5 1.1 5.1L12 15.8 7.4 18.4l1.1-5.1L4.6 9.8l5.2-.5z" fill="${color}" fill-opacity=".15"/></svg>`,
    flame: `<svg ${s}><path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.6-2.5 1.2-3.3C9.8 9 10 10 11 10.5c-.3-2 .4-5 1-7.5z" fill="${color}" fill-opacity=".15"/></svg>`,
    gear: `<svg ${s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.18V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 15.5V15a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9.82a1.65 1.65 0 0 0-.33-1.82L4.2 7.94a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a2 2 0 0 1 0 4h-.09c-.67.18-1.14.75-1.14 1.41z"/></svg>`,
    check: `<svg ${s}><polyline points="20 6 9 17 4 12"/></svg>`,
    lock: `<svg ${s}><rect x="5" y="11" width="14" height="10" rx="2" fill="${color}" fill-opacity=".08"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    arrow: `<svg ${s}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    back: `<svg ${s}><polyline points="15 18 9 12 15 6"/></svg>`,
    trophy: `<svg ${s}><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" fill="${color}" fill-opacity=".12"/><path d="M7 5H5a2 2 0 0 0 2 3M17 5h2a2 2 0 0 1-2 3"/><path d="M12 13v3M9 20h6"/></svg>`,
    chart: `<svg ${s}><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="12" width="3" height="8" rx=".5" fill="${color}" fill-opacity=".15"/><rect x="11" y="8" width="3" height="12" rx=".5" fill="${color}" fill-opacity=".25"/><rect x="16" y="14" width="3" height="6" rx=".5" fill="${color}" fill-opacity=".15"/></svg>`,
    spain: `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" fill="#c60b1e"/><rect x="2" y="8.5" width="20" height="7" fill="#ffc400"/></svg>`,
  };

  return icons[name] || '';
}

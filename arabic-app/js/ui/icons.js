export function icon(name, size = 24, color = 'var(--accent)') {
  const s = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;

  const icons = {
    home: `<svg ${s}><path d="M3 12l9-8 9 8"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9"/></svg>`,
    book: `<svg ${s}><path d="M5 4h6a2 2 0 0 1 2 2v13a1.5 1.5 0 0 0-1.5-1.5H5z" fill="${color}" fill-opacity=".1"/><path d="M19 4h-6a2 2 0 0 0-2 2v13a1.5 1.5 0 0 1 1.5-1.5H19z"/></svg>`,
    doc: `<svg ${s}><path d="M6 3h9l4 4v14H6z" fill="${color}" fill-opacity=".1"/><path d="M6 3h9l4 4v14H6z"/><line x1="9" y1="11" x2="16" y2="11"/><line x1="9" y1="15" x2="16" y2="15"/></svg>`,
    star: `<svg ${s}><path d="M12 4l2.2 4.8 5.2.5-3.9 3.5 1.1 5.1L12 15.8 7.4 18.4l1.1-5.1L4.6 9.8l5.2-.5z" fill="${color}" fill-opacity=".15"/></svg>`,
    flame: `<svg ${s}><path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.6-2.5 1.2-3.3C9.8 9 10 10 11 10.5c-.3-2 .4-5 1-7.5z" fill="${color}" fill-opacity=".15"/></svg>`,
    gear: `<svg ${s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.18V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 15.5V15a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9.82a1.65 1.65 0 0 0-.33-1.82L4.2 7.94a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a2 2 0 0 1 0 4h-.09c-.67.18-1.14.75-1.14 1.41z"/></svg>`,
    check: `<svg ${s}><polyline points="20 6 9 17 4 12"/></svg>`,
    lock: `<svg ${s}><rect x="5" y="11" width="14" height="10" rx="2" fill="${color}" fill-opacity=".08"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    arrow: `<svg ${s}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    back: `<svg ${s}><polyline points="15 18 9 12 15 6"/></svg>`,
    trophy: `<svg ${s}><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" fill="${color}" fill-opacity=".12"/><path d="M7 5H5a2 2 0 0 0 2 3M17 5h2a2 2 0 0 1-2 3"/><path d="M12 13v3M9 20h6"/></svg>`,
    han: `<svg ${s}><rect x="3" y="3" width="18" height="18" rx="3" fill="${color}" fill-opacity=".1"/><text x="12" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="${color}" stroke="none">ع</text></svg>`,
    sound: `<svg ${s}><path d="M4 9v6h4l5 4V5L8 9z" fill="${color}" fill-opacity=".1"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>`,
    chart: `<svg ${s}><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="12" width="3" height="8" rx=".5" fill="${color}" fill-opacity=".15"/><rect x="11" y="8" width="3" height="12" rx=".5" fill="${color}" fill-opacity=".25"/><rect x="16" y="14" width="3" height="6" rx=".5" fill="${color}" fill-opacity=".15"/></svg>`,
    dango:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><line x1="12" y1="2" x2="12" y2="22" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/><circle cx="12" cy="7" r="3.4" fill="#f2d9b0" stroke="${color}" stroke-width="1.3"/><circle cx="12" cy="13" r="3.4" fill="#f7ede0" stroke="${color}" stroke-width="1.3"/><circle cx="12" cy="19" r="3.4" fill="#d8a87a" stroke="${color}" stroke-width="1.3"/></svg>`,
    pencil:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 5.5l3 3M4 20l1-4L16 5a2 2 0 0 1 3 3L8 19l-4 1z" fill="${color}" fill-opacity=".1"/><line x1="14" y1="7" x2="17" y2="10"/></svg>`,
    playWatch:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8" fill="${color}" fill-opacity=".08"/><path d="M10 8.5l5 3.5-5 3.5z" fill="${color}" fill-opacity=".25"/></svg>`,
    ranking:`<svg ${s}><polyline points="4,15 9,10 13,13 20,6"/><polyline points="15,6 20,6 20,11"/></svg>`,
    exam:`<svg ${s}><rect x="6" y="3" width="12" height="18" rx="2" fill="${color}" fill-opacity=".08"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="13" y2="12"/><path d="M9 16l1.5 1.5L13.5 14"/></svg>`,
    brush:`<svg ${s}><path d="M9 14c-2 1-2 4-3 5 2 0 4-1 5-3"/><path d="M9.5 13.5L17 6a2 2 0 0 1 3 3l-7.5 7.5z" fill="${color}" fill-opacity=".1"/></svg>`,
    target:`<svg ${s}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5" fill="${color}" fill-opacity=".1"/><circle cx="12" cy="12" r="1.3" fill="${color}" stroke="none"/></svg>`,
    sparkle:`<svg ${s}><path d="M12 4l1.4 3.6L17 9l-3.6 1.4L12 14l-1.4-3.6L7 9l3.6-1.4z" fill="${color}" fill-opacity=".15"/><path d="M18 14l.7 1.8L20.5 16.5l-1.8.7L18 19l-.7-1.8L15.5 16.5l1.8-.7z" fill="${color}" fill-opacity=".1"/></svg>`,
    fireSolid:`<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 2c1.2 3.5 4.5 5 4.5 9a4.5 4.5 0 0 1-9 0c0-1.7.7-2.8 1.4-3.7C9.5 8.5 10 9.7 11 10c-.4-2.3.4-5.5 1-8z" fill="${color}"/><path d="M12 13c1 0 1.7.9 1.7 2 0 1.2-.9 2.3-1.7 2.8-.8-.5-1.7-1.6-1.7-2.8 0-1.1.7-2 1.7-2z" fill="var(--bg2)" fill-opacity=".5"/></svg>`,
    speaker: `<svg ${s}><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="${color}" fill-opacity=".12"/><path d="M15.5 9.2a3.8 3.8 0 0 1 0 5.6"/><path d="M18 6.8a7.2 7.2 0 0 1 0 10.4"/></svg>`,
    play: `<svg ${s}><circle cx="12" cy="12" r="9" fill="${color}" fill-opacity=".08"/><path d="M10 8.5l5.5 3.5-5.5 3.5z" fill="${color}" fill-opacity=".3"/></svg>`,
    plus: `<svg ${s}><rect x="4" y="4" width="16" height="16" rx="4" fill="${color}" fill-opacity=".08"/><line x1="12" y1="8.5" x2="12" y2="15.5"/><line x1="8.5" y1="12" x2="15.5" y2="12"/></svg>`,
    cards: `<svg ${s}><rect x="7" y="4" width="12" height="15" rx="2.5" fill="${color}" fill-opacity=".1"/><path d="M5 7.5v11A2.5 2.5 0 0 0 7.5 21H15"/></svg>`,
    repeat: `<svg ${s}><path d="M5 11V9a3 3 0 0 1 3-3h10"/><polyline points="15 3 18 6 15 9"/><path d="M19 13v2a3 3 0 0 1-3 3H6"/><polyline points="9 21 6 18 9 15"/></svg>`,
    moon: `<svg ${s}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="${color}" fill-opacity=".12"/></svg>`,
    spain: `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" fill="#c60b1e"/><rect x="2" y="8.5" width="20" height="7" fill="#ffc400"/></svg>`,
  };

  return icons[name] || '';
}

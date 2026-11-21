// Own icon set for all the language apps and the /idiomas/ hub. Emojis in the course data and the code
// are swapped on screen for these drawings (ink strokes + a soft fill in the app's accent colour), so the
// look is the same on every phone and fits the theme. Loaded once by each index.html.
(() => {
  // The app's own icons, drawn to match its theme: ink-coloured strokes with a soft accent (gold) fill.
  // Every emoji the app shows is swapped on screen for one of these (see EMOJI at the bottom), so course
  // data and code keep their emojis and the look stays consistent on every phone.
  const F = (d) => `<path class="f" d="${d}"/>`;          // soft accent fill
  const P = (d) => `<path d="${d}"/>`;                     // ink stroke
  const C = (x, y, r, fill) => `<circle ${fill ? 'class="f" ' : ''}cx="${x}" cy="${y}" r="${r}"/>`;

  const ICONS = {
    check: C(12, 12, 9, 1) + C(12, 12, 9) + P('M7.5 12.3l3 3 6-6.3'),
    sparkle: F('M12 3l2 6.2 6 2.3-6 2.3-2 6.2-2-6.2-6-2.3 6-2.3z') + P('M12 3l2 6.2 6 2.3-6 2.3-2 6.2-2-6.2-6-2.3 6-2.3z') + P('M19 3v3M17.5 4.5h3'),
    speaker: F('M4 9.5h3.5L12 5.5v13l-4.5-4H4z') + P('M4 9.5h3.5L12 5.5v13l-4.5-4H4z') + P('M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11'),
    target: C(12, 12, 9, 1) + C(12, 12, 9) + C(12, 12, 5) + C(12, 12, 1.3) + P('M12 12l7-7M16.5 4.5H19.5V7.5'),
    books: F('M4 4.5h4v15H4zM9.5 4.5h4v15h-4z') + P('M4 4.5h4v15H4zM9.5 4.5h4v15h-4zM15 6l3.8-1 3.2 13.6-3.8 1z') + P('M4 8h4M9.5 8h4M4 16h4M9.5 16h4'),
    book: F('M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z') + P('M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5zM12 6.5v13'),
    page: F('M6 3h8.5L19 7.5V21H6z') + P('M6 3h8.5L19 7.5V21H6zM14.5 3v4.5H19M9 11.5h7M9 14.5h7M9 17.5h4.5'),
    news: F('M4 5h13v14H6a2 2 0 01-2-2z') + P('M4 5h13v14H6a2 2 0 01-2-2zM17 9h3v8a2 2 0 01-2 2M7 8.5h7M7 11.5h7M7 14.5h4'),
    cards: F('M7 7h12v13H7z') + P('M7 7h12v13H7zM4.5 17V4.5h12') + P('M10 11h6M10 14h4'),
    lock: F('M5 10.5h14V20H5z') + P('M5 10.5h14V20H5zM8 10.5V7.5a4 4 0 018 0v3') + C(12, 15, 1.3),
    key: C(8, 14, 4, 1) + C(8, 14, 4) + P('M11 11l8.5-8.5M16.5 5.5l2.5 2.5M14.5 7.5l2 2'),
    party: F('M4 20l4.5-12 7.5 7.5z') + P('M4 20l4.5-12 7.5 7.5zM13 4.5c.5 1.5 0 2.5-1 3M19.5 11c-1.5-.5-2.5 0-3 1M15.5 3.5v1.5M20.5 8.5H19M17 7l1.5-1.5'),
    pencil: F('M15.5 4.5l4 4L9 19l-5 1 1-5z') + P('M15.5 4.5l4 4L9 19l-5 1 1-5zM13.5 6.5l4 4'),
    repeat: P('M4 11V9a3 3 0 013-3h12.5M17 3l3 3-3 3M20 13v2a3 3 0 01-3 3H4.5M7 21l-3-3 3-3'),
    shuffle: P('M3.5 7h3.5c4 0 6 10 10 10h3.5M18 14l3 3-3 3M3.5 17h3.5c1.5 0 2.7-1.4 3.7-3M13.3 10c1-1.6 2.2-3 3.7-3h3.5M18 4l3 3-3 3'),
    dumbbell: F('M5.5 7h3v10h-3zM15.5 7h3v10h-3z') + P('M5.5 7h3v10h-3zM15.5 7h3v10h-3zM8.5 12h7M3 9.5v5M21 9.5v5'),
    bulb: F('M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z') + P('M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3zM9.5 19h5M10.5 21.5h3'),
    globe: C(12, 12, 9, 1) + C(12, 12, 9) + P('M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z'),
    cloud: F('M7 18.5a4.5 4.5 0 01-.6-9 6 6 0 0111.4 1.5 3.8 3.8 0 01-.3 7.5z') + P('M7 18.5a4.5 4.5 0 01-.6-9 6 6 0 0111.4 1.5 3.8 3.8 0 01-.3 7.5z'),
    star: F('M12 3.5l2.6 5.5 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.7l6-.7z') + P('M12 3.5l2.6 5.5 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.7l6-.7z'),
    trophy: F('M7 4h10v5a5 5 0 01-10 0z') + P('M7 4h10v5a5 5 0 01-10 0zM7 6H4v1.5A3.5 3.5 0 007.3 11M17 6h3v1.5a3.5 3.5 0 01-3.3 3.5M12 14v3.5M8 20.5h8l-1-3H9z'),
    medal1: P('M8 3l4 6 4-6') + C(12, 15, 5.5, 1) + C(12, 15, 5.5) + P('M11 13.5l1.3-1v5'),
    medal2: P('M8 3l4 6 4-6') + C(12, 15, 5.5, 1) + C(12, 15, 5.5) + P('M10.3 13.3a1.8 1.8 0 013.4.7c0 1.3-3.5 2.4-3.5 3.5h3.6'),
    medal3: P('M8 3l4 6 4-6') + C(12, 15, 5.5, 1) + C(12, 15, 5.5) + P('M10.4 12.6h3.2l-1.7 2a1.7 1.7 0 11-1.6 2.2'),
    letters: F('M3 5h18v14H3z') + P('M3 5h18v14H3zM6 16l2.8-7.5L11.6 16M7 13.7h3.6M17.5 12.5a2 2 0 10.1 3.5 2 2 0 00-.1-3.5zm2 0V16'),
    link: P('M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1'),
    hand: F('M8 11V5.5a1.5 1.5 0 013 0V10V4a1.5 1.5 0 013 0v6-4.5a1.5 1.5 0 013 0V14c0 4-2.5 7-6.5 7-2.5 0-4-1.3-5.3-3.3L4 14.2a1.5 1.5 0 012.5-1.7L8 14z') + P('M8 11V5.5a1.5 1.5 0 013 0V10V4a1.5 1.5 0 013 0v6-4.5a1.5 1.5 0 013 0V14c0 4-2.5 7-6.5 7-2.5 0-4-1.3-5.3-3.3L4 14.2a1.5 1.5 0 012.5-1.7L8 14z'),
    pointer: F('M3.5 10h11l-2.5-3.5h3.5L20.5 12 15.5 17.5H12l2.5-3.5h-11z') + P('M3.5 10h11l-2.5-3.5h3.5L20.5 12 15.5 17.5H12l2.5-3.5h-11z'),
    puzzle: F('M4 8h4a2 2 0 114 0h4v4a2 2 0 110 4v4H4z') + P('M4 8h4a2 2 0 114 0h4v4a2 2 0 110 4v4H4z') + P('M16 12h4'),
    bricks: F('M3 6h8v4H3zM13 14h8v4h-8z') + P('M3 6h18v12H3zM3 10h18M3 14h18M11 6v4M7 10v4M15 10v4M11 14v4M17 6v4M19 14v4'),
    scale: F('M3 13l3-7 3 7a3 3 0 01-6 0zM15 13l3-7 3 7a3 3 0 01-6 0z') + P('M12 3v17M7.5 20.5h9M4.5 6h15M3 13l3-7 3 7a3 3 0 01-6 0zM15 13l3-7 3 7a3 3 0 01-6 0z'),
    compass: C(12, 12, 9, 1) + C(12, 12, 9) + P('M15.5 8.5l-2 5-5 2 2-5z'),
    hourglass: F('M8 4h8c0 4-4 6-4 8 0-2-4-4-4-8zM8 20h8c0-2-2.5-3.5-4-4-1.5.5-4 2-4 4z') + P('M6 3h12M6 21h12M8 3v1c0 4 4 6 4 8 0 2-4 4-4 8v1M16 3v1c0 4-4 6-4 8 0 2 4 4 4 8v1'),
    clock: C(12, 12, 9, 1) + C(12, 12, 9) + P('M12 7v5l3.5 2'),
    alarm: C(12, 13, 7.5, 1) + C(12, 13, 7.5) + P('M12 9.5V13l2.5 1.5M4 5l3-2.5M20 5l-3-2.5M7 19.5l-1.5 2M17 19.5l1.5 2'),
    calendar: F('M4 9h16v11H4z') + P('M4 5.5h16V20H4zM4 9.5h16M8.5 3.5v4M15.5 3.5v4M8 13h2M14 13h2M8 16.5h2'),
    headphones: F('M4 13h3.5v7H5a1 1 0 01-1-1zM16.5 13H20v6a1 1 0 01-1 1h-2.5z') + P('M4 18v-5.5a8 8 0 0116 0V18M4 13h3.5v7H5a1 1 0 01-1-1zM16.5 13H20v6a1 1 0 01-1 1h-2.5z'),
    question: C(12, 12, 9, 1) + C(12, 12, 9) + P('M9.5 9.5a2.6 2.6 0 115 1c0 1.8-2.5 2-2.5 3.8') + C(12, 17.2, .4),
    chat: F('M4 5h16v11H10l-4.5 4v-4H4z') + P('M4 5h16v11H10l-4.5 4v-4H4zM8 9.5h8M8 12.5h5'),
    speech: F('M3.5 6h11v8H9l-3.5 3v-3h-2z') + P('M3.5 6h11v8H9l-3.5 3v-3h-2zM17 9.5h3.5v8h-2v3l-3.5-3H11v-1.5'),
    think: C(13, 10, 7, 1) + C(13, 10, 7) + P('M11 8.5a2 2 0 113.5 1.3c-.7.6-1.5 1-1.5 2') + C(6, 18, 1.6) + C(3.5, 21, .8),
    warning: F('M12 3.5l9.5 16.5h-19z') + P('M12 3.5l9.5 16.5h-19zM12 10v4.5') + C(12, 17.3, .4),
    ban: C(12, 12, 9, 1) + C(12, 12, 9) + P('M5.7 5.7l12.6 12.6'),
    flame: F('M12 21a6.5 6.5 0 006.5-6.5c0-4.5-4-6.5-5-11.5-2.5 2-4 4.5-4 7-1-.5-1.5-1.5-1.8-2.5C6.5 9.3 5.5 11.5 5.5 14.5A6.5 6.5 0 0012 21z') + P('M12 21a6.5 6.5 0 006.5-6.5c0-4.5-4-6.5-5-11.5-2.5 2-4 4.5-4 7-1-.5-1.5-1.5-1.8-2.5C6.5 9.3 5.5 11.5 5.5 14.5A6.5 6.5 0 0012 21zM12 21c-1.8 0-3-1.3-3-3 0-2 1.5-3 3-5 1.5 2 3 3 3 5 0 1.7-1.2 3-3 3z'),
    heart: F('M12 20s-8-4.8-8-10.5A4.5 4.5 0 0112 7a4.5 4.5 0 018 2.5C20 15.2 12 20 12 20z') + P('M12 20s-8-4.8-8-10.5A4.5 4.5 0 0112 7a4.5 4.5 0 018 2.5C20 15.2 12 20 12 20z'),
    brain: F('M12 5a3 3 0 00-5.5 1.5A3 3 0 004 10a3 3 0 00.5 5A3.2 3.2 0 0009 19a3 3 0 003 1zM12 5a3 3 0 015.5 1.5A3 3 0 0120 10a3 3 0 01-.5 5 3.2 3.2 0 01-4.5 4 3 3 0 01-3 1z') + P('M12 5a3 3 0 00-5.5 1.5A3 3 0 004 10a3 3 0 00.5 5A3.2 3.2 0 0009 19a3 3 0 003 1V5a3 3 0 015.5 1.5A3 3 0 0120 10a3 3 0 01-.5 5 3.2 3.2 0 01-4.5 4 3 3 0 01-3 1M8 10.5a2 2 0 002-2M16 10.5a2 2 0 01-2-2M8.5 15a2 2 0 012-1M15.5 15a2 2 0 00-2-1'),
    pin: F('M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z') + P('M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z') + C(12, 10, 2.3),
    cap: F('M2.5 9.5L12 5l9.5 4.5L12 14z') + P('M2.5 9.5L12 5l9.5 4.5L12 14zM6.5 11.5v4.5c3 2.5 8 2.5 11 0v-4.5M21.5 9.5v5'),
    palette: F('M12 3.5a8.5 8.5 0 000 17c1.2 0 1.8-.8 1.8-1.7 0-1.6-1.3-1.8-1.3-3 0-1 .8-1.8 1.8-1.8h2.4a3.8 3.8 0 003.8-3.8C20.5 6.5 16.7 3.5 12 3.5z') + P('M12 3.5a8.5 8.5 0 000 17c1.2 0 1.8-.8 1.8-1.7 0-1.6-1.3-1.8-1.3-3 0-1 .8-1.8 1.8-1.8h2.4a3.8 3.8 0 003.8-3.8C20.5 6.5 16.7 3.5 12 3.5z') + C(8, 11, 1) + C(10.5, 7.5, 1) + C(15, 7.5, 1),
    masks: F('M3 4h9v6a4.5 4.5 0 01-9 0z') + P('M3 4h9v6a4.5 4.5 0 01-9 0zM12 8h9v6a4.5 4.5 0 01-9 0V8M5.5 8h1M8.5 8h1M5.5 11.5a2 2 0 003.5 0M14.5 12h1M17.5 12h1M14.5 16.2a2 2 0 013.5 0'),
    gear: C(12, 12, 3, 1) + C(12, 12, 3) + P('M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1') + C(12, 12, 6.5),
    ruler: F('M3 16L16 3l5 5L8 21z') + P('M3 16L16 3l5 5L8 21zM7 12l2 2M10 9l2 2M13 6l2 2M5.5 13.5l1 1'),
    search: C(10.5, 10.5, 6.5, 1) + C(10.5, 10.5, 6.5) + P('M15.5 15.5l5 5'),
    eyes: F('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z') + P('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z') + C(12, 12, 3),
    leaf: F('M5 19C5 10 10 4.5 20 4c0 10-5 15.5-13 15.5') + P('M5 19C5 10 10 4.5 20 4c0 10-5 15.5-13 15.5M4 20.5c3-4.5 6.5-8 10.5-10.5'),
    phone: F('M7 2.5h10v19H7z') + P('M7 2.5h10v19H7zM10.5 18.5h3'),
    chart: F('M5 13h3.5v7H5zM10.25 8h3.5v12h-3.5zM15.5 4h3.5v16h-3.5z') + P('M5 13h3.5v7H5zM10.25 8h3.5v12h-3.5zM15.5 4h3.5v16h-3.5zM3 20.5h18'),
    trend: F('M3 20l5.5-7 4 3.5L21 7v13z') + P('M3 16.5l5.5-5.5 4 3.5L21 6M15.5 6H21v5.5'),
    list: F('M4 4.5h16v15H4z') + P('M4 4.5h16v15H4zM8 9h8M8 12h8M8 15h5'),
    infinity: P('M12 12c-2-2.8-3.5-4-5.3-4a4 4 0 000 8c1.8 0 3.3-1.2 5.3-4zm0 0c2 2.8 3.5 4 5.3 4a4 4 0 000-8c-1.8 0-3.3 1.2-5.3 4z'),
    folder: F('M3 6h6.5l2 2.5H21V19H3z') + P('M3 6h6.5l2 2.5H21V19H3z'),
    download: F('M3.5 14.5h17V20h-17z') + P('M3.5 14.5V20h17v-5.5M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5'),
    box: F('M3.5 7.5L12 3.5l8.5 4V17L12 21l-8.5-4z') + P('M3.5 7.5L12 3.5l8.5 4V17L12 21l-8.5-4zM3.5 7.5L12 11.5l8.5-4M12 11.5V21'),
    sun: C(12, 12, 4.5, 1) + C(12, 12, 4.5) + P('M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4'),
    mail: F('M3.5 6h17v12h-17z') + P('M3.5 6h17v12h-17zM3.5 6.5L12 13l8.5-6.5'),
    person: C(12, 8, 4, 1) + C(12, 8, 4) + F('M4.5 20.5a7.5 7.5 0 0115 0z') + P('M4.5 20.5a7.5 7.5 0 0115 0z'),
    building: F('M3.5 9.5L12 4l8.5 5.5z') + P('M3.5 9.5L12 4l8.5 5.5zM5 9.5v9M9.5 9.5v9M14.5 9.5v9M19 9.5v9M3 20.5h18'),
    food: C(12, 13, 6, 1) + C(12, 13, 6) + C(12, 13, 3.3) + P('M3 4v5a1.5 1.5 0 001.5 1.5V20M4.5 4v3.5M21 4c-1.5 0-2.5 1.5-2.5 4v3H20V20'),
    briefcase: F('M3.5 8h17v11.5h-17z') + P('M3.5 8h17v11.5h-17zM9 8V5.5h6V8M3.5 13h17M11 12h2v2.5h-2z'),
    ball: C(12, 12, 9, 1) + C(12, 12, 9) + P('M12 7.5l3.8 2.8-1.5 4.5H9.7l-1.5-4.5zM12 3v4.5M15.8 10.3l4.7-1.8M14.3 14.8l2.7 4.2M9.7 14.8L7 19M8.2 10.3L3.5 8.5'),
    home: F('M5 10.5V20h14v-9.5L12 4.5z') + P('M3 12l9-8 9 8M5 10.5V20h5v-5.5h4V20h5v-9.5'),
    bag: F('M4.5 8h15l-1 12.5h-13z') + P('M4.5 8h15l-1 12.5h-13zM8.5 10V7a3.5 3.5 0 017 0v3'),
    health: F('M4.5 4.5h15v15h-15z') + P('M4.5 4.5h15v15h-15zM12 8v8M8 12h8'),
    plane: F('M10.5 3.5c0-1 3-1 3 0v6l8 4.5v2l-8-2v4.5l2.5 2v1.5L12 21l-4 1v-1.5l2.5-2V14l-8 2v-2l8-4.5z') + P('M10.5 3.5c0-1 3-1 3 0v6l8 4.5v2l-8-2v4.5l2.5 2v1.5L12 21l-4 1v-1.5l2.5-2V14l-8 2v-2l8-4.5z'),
    money: F('M2.5 6.5h19v11h-19z') + P('M2.5 6.5h19v11h-19z') + C(12, 12, 3) + P('M6 9.5v5M18 9.5v5'),
    flask: F('M6.5 15.5h11L20 20.5H4z') + P('M9.5 3.5h5M10.5 3.5v6l-6.5 11h16l-6.5-11v-6M6.5 15.5h11'),
    dove: F('M3 13c3 0 6-1 8-4l2-3.5c.8-1.5 3-1.5 4 0l.5 1L21 7.5l-3 1.5c0 6-4 10.5-11 10.5 1.5-1.5 2.5-3 2.5-5-2 0-4.5 0-6.5-1.5z') + P('M3 13c3 0 6-1 8-4l2-3.5c.8-1.5 3-1.5 4 0l.5 1L21 7.5l-3 1.5c0 6-4 10.5-11 10.5 1.5-1.5 2.5-3 2.5-5-2 0-4.5 0-6.5-1.5z'),
    shield: F('M12 3l7.5 3v5.5c0 4.5-3 8.2-7.5 9.5-4.5-1.3-7.5-5-7.5-9.5V6z') + P('M12 3l7.5 3v5.5c0 4.5-3 8.2-7.5 9.5-4.5-1.3-7.5-5-7.5-9.5V6zM8.5 12l2.5 2.5 4.5-4.5'),
    face: C(12, 12, 9, 1) + C(12, 12, 9) + C(9, 9.5, .6) + C(15, 9.5, .6) + C(12, 15.5, 2),
    rewind: F('M11.5 6.5L4 12l7.5 5.5zM20 6.5L12.5 12l7.5 5.5z') + P('M11.5 6.5L4 12l7.5 5.5zM20 6.5L12.5 12l7.5 5.5z'),
    minus: P('M5 12h14'),
    magnet: F('M5 4h4.5v3H5zM14.5 4H19v3h-4.5z') + P('M5 4h4.5v8a2.5 2.5 0 005 0V4H19v8a7 7 0 01-14 0zM5 7h4.5M14.5 7H19'),
    pagoda: F('M4 9.5h16l-3-3H7z') + P('M12 2.5v3M4 9.5h16l-3-3H7zM6 9.5v4M18 9.5v4M3.5 13.5h17l-3-3M7 13.5V20M17 13.5V20M2.5 20.5h19M10 20.5v-4h4v4'),
    cross: C(12, 12, 9, 1) + C(12, 12, 9) + P('M8.5 8.5l7 7M15.5 8.5l-7 7'),
    boot: F('M7 3.5h6v9l6 2.5a2 2 0 011.5 2V20H4.5v-6.5L7 11z') + P('M7 3.5h6v9l6 2.5a2 2 0 011.5 2V20H4.5v-6.5L7 11zM4.5 17h16M13 8h-3'),
    thumbdown: '<g transform="rotate(180 12 12)">' + F('M8 11V5.5a1.5 1.5 0 013 0V10V4a1.5 1.5 0 013 0v6-4.5a1.5 1.5 0 013 0V14c0 4-2.5 7-6.5 7-2.5 0-4-1.3-5.3-3.3L4 14.2a1.5 1.5 0 012.5-1.7L8 14z') + P('M8 11V5.5a1.5 1.5 0 013 0V10V4a1.5 1.5 0 013 0v6-4.5a1.5 1.5 0 013 0V14c0 4-2.5 7-6.5 7-2.5 0-4-1.3-5.3-3.3L4 14.2a1.5 1.5 0 012.5-1.7L8 14z') + '</g>',
    pointup: '<g transform="rotate(-90 12 12)">' + F('M3.5 10h11l-2.5-3.5h3.5L20.5 12 15.5 17.5H12l2.5-3.5h-11z') + P('M3.5 10h11l-2.5-3.5h3.5L20.5 12 15.5 17.5H12l2.5-3.5h-11z') + '</g>',
    owl: F('M5 9a7 7 0 0114 0v6.5a7 7 0 01-14 0z') + P('M5 9a7 7 0 0114 0v6.5a7 7 0 01-14 0zM5 6L3.5 3 8 4.5M19 6l1.5-3L16 4.5') + C(9, 10.5, 2) + C(15, 10.5, 2) + P('M11.2 13.5L12 15l.8-1.5'),
  };

  // Emoji → icon. Typographic marks (✓ ✗ ✕ ✖ ↔ ↗) stay as they are.
  const MAP = {
    check: '✅ ☑️ ☑ 💯', cross: '❌ ❎', boot: '👢', thumbdown: '👎', pointup: '👆', sparkle: '✨ 🪄 ✳️ ✳ 🔮 🆕', speaker: '🔊 📢 🔈 🔉', target: '🎯',
    books: '📚', book: '📖 📘 📗 📕 📙', page: '📄 📃 📜 🧾', news: '📰 🗞️ 🗞', cards: '🗂️ 🗂 📇 🃏 🀄',
    lock: '🔒 🔐', key: '🔑 🗝️ 🗝', party: '🎉 🎊 🎁', pencil: '📝 ✏️ ✏ ✍️ ✍ ✒️ ✒ 🖊️',
    repeat: '🔁 🔄 🔂 🌀', shuffle: '🔀', dumbbell: '💪', bulb: '💡 🔦', globe: '🌐 🌍 🌎 🌏',
    cloud: '☁️ ☁', star: '⭐ 🌟', trophy: '🏆', medal1: '🥇', medal2: '🥈', medal3: '🥉', letters: '🔤 🔠 🔡',
    link: '🔗 📎 🧷 🪢 📿', hand: '👍 👋 ✌️ ✌ 🙏 🤏 👏', pointer: '👉 ➡️', puzzle: '🧩', bricks: '🧱', scale: '⚖️ ⚖',
    compass: '🧭', hourglass: '⏳ ⌛', clock: '⏱️ ⏱ 🕘 🕒 🕰️ 🕰 🕐', alarm: '⏰', calendar: '📅 🗓️ 🗓 📆', headphones: '🎧',
    question: '❓ ❔', chat: '💬 🗨️ 🗨', speech: '🗣️ 🗣', think: '🤔 💭', warning: '⚠️ ⚠ 🚦', ban: '🚫 ⛔', flame: '🔥 🕯️ 🕯',
    heart: '❤️ ❤ 💖', brain: '🧠', pin: '📌 📍', cap: '🎓', palette: '🎨', masks: '🎭 🎬 🎩', gear: '⚙️ ⚙ 🛠️ 🛠 🔧 🧮',
    ruler: '📐 📏', search: '🔍 🔎 🔭 🔬 🕵️ 🕵', eyes: '👀 👁️', leaf: '🌱 🌿 🍎 🍀', phone: '📱', chart: '📊', trend: '📈',
    list: '📋', infinity: '♾️ ♾', folder: '📂 📁', download: '📥', box: '📦', sun: '☀️ ☀ 🌡️ 🌡', mail: '✉️ ✉ 📧',
    person: '👤 🧍 🧑', building: '🏛️ 🏛 🏭 🏫', food: '🍽️ 🍽', briefcase: '💼', ball: '⚽ 🛹', home: '🏠 🏡', bag: '🛍️ 🛍',
    health: '🩺 🏥', plane: '✈️ ✈', money: '💶 💰 💵', flask: '🧪', dove: '🕊️ 🕊', shield: '🛡️ 🛡', face: '😲 🙂 😊',
    rewind: '⏮️ ⏮ ⏪', minus: '➖', magnet: '🧲', pagoda: '🏯 🐉', owl: '🦉',
  };
  const EMOJI = {};
  for (const [name, list] of Object.entries(MAP)) for (const e of list.split(' ')) EMOJI[e] = name;
  EMOJI['🔬'] = 'flask';

  const keys = Object.keys(EMOJI).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const RX = new RegExp('(' + keys.join('|') + ')️?', 'gu');
  const TEST = new RegExp(RX.source, 'u');
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'TITLE', 'svg', 'SVG', 'CODE', 'PRE']);
  const svg = name => `<svg class="ico ico-${name}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

  const css = document.createElement('style');
  css.textContent = `.ico{width:1.2em;height:1.2em;display:inline-block;vertical-align:-.22em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none;overflow:visible}
.ico .f{fill:var(--accent,#9c7842);opacity:.32;stroke:none}
.ico-medal1 .f{fill:#d4a72c;opacity:.55}.ico-medal2 .f{fill:#9aa4ad;opacity:.55}.ico-medal3 .f{fill:#b8763e;opacity:.55}
.ico-check .f{fill:var(--ok,#4d7d5e);opacity:.4}.ico-cross .f{fill:var(--no,#b5654f);opacity:.4}
.ico-heart .f{fill:#d0574a;opacity:.45}.ico-flame .f{fill:#e0823a;opacity:.45}
.ico-wrap{display:inline}`;
  document.head.appendChild(css);

  function swapText(node) {
    const t = node.nodeValue;
    if (!t || !TEST.test(t)) return;
    const p = node.parentNode;
    if (!p || SKIP.has(p.nodeName) || p.closest?.('[contenteditable],.no-ico,svg')) return;
    const span = document.createElement('span');
    span.className = 'ico-wrap';
    span.innerHTML = t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
      .replace(RX, (m, e) => svg(EMOJI[e] || EMOJI[e + '️'] || EMOJI[e.replace('️', '')]));
    // Keep the original text for screen readers and copy-paste.
    span.setAttribute('data-txt', t);
    p.replaceChild(span, node);
  }
  function scan(root) {
    if (root.nodeType === 3) return swapText(root);
    if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) if (TEST.test(n.nodeValue)) list.push(n);
    list.forEach(swapText);
  }
  const start = () => {
    scan(document.body);
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') swapText(m.target);
        else m.addedNodes.forEach(scan);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
})();

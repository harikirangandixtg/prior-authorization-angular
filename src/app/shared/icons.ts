/** Stroke icons (24x24 grid), path data only, so they render without any icon package. */
export const ICONS = {
  home: 'M3 10.5 12 3l9 7.5 M5 9.5V21h14V9.5 M9 21v-6h6v6',
  'file-plus': 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M12 12v6 M9 15h6',
  'file-text': 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M8 13h8 M8 17h5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  'shield-check': 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4',
  'heart-pulse':
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z M3.5 12h4l1.5-3 3 6 1.5-3h7',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-3.5-3.5',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18 M6 6l12 12',
  plus: 'M12 5v14 M5 12h14',
  'alert-triangle': 'M12 3 2 20h20z M12 10v4 M12 17h.01',
  'alert-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8v5 M12 16h.01',
  'help-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7 M12 17h.01',
  'check-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8.5 12.5l2.5 2.5 4.5-5',
  'x-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9 9l6 6 M15 9l-6 6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v6 M12 7.5h.01',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
  refresh: 'M20 11a8 8 0 0 0-14.9-3 M4 4v4h4 M4 13a8 8 0 0 0 14.9 3 M20 20v-4h-4',
  'chevron-right': 'M9 6l6 6-6 6',
  copy: 'M8 8h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h2',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  clipboard: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z M8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2 M9 14l2 2 4-4',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 21a8 8 0 0 1 16 0',
  'arrow-left': 'M19 12H5 M11 6l-6 6 6 6',
  sparkles:
    'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  pill: 'M10.5 20.5a4.95 4.95 0 0 1-7-7l10-10a4.95 4.95 0 0 1 7 7z M8.5 8.5l7 7',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M8 12h8',
  layers: 'M12 3 3 8l9 5 9-5z M3 13l9 5 9-5 M3 17.5l9 5 9-5',
  inbox: 'M4 13l2-8h12l2 8 M4 13v6h16v-6 M4 13h5a3 3 0 0 0 6 0h5',
} as const;

export type IconName = keyof typeof ICONS;


export const Icon = ({ name, size = 18 }) => {
  const paths = {
    dashboard: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
    ticket: 'M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v13a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 18.5v-13zM8 8h8M8 12h8M8 16h5',
    tickets: 'M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v13a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 18.5v-13zM8 8h8M8 12h8M8 16h5',
    plus: 'M12 5v14M5 12h14',
    user: 'M20 21a8 8 0 00-16 0M12 12a4 4 0 100-8 4 4 0 000 8z',
    users: 'M16 20v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 11a4 4 0 100-8 4 4 0 000 8zM22 20v-1a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    search: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35',
    bell: 'M18 9a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4',
    chevron: 'M9 18l6-6-6-6',
    menu: 'M4 7h16M4 12h16M4 17h16',
    close: 'M6 6l12 12M18 6L6 18',
    logout: 'M10 17l5-5-5-5M15 12H3m10-8h5a3 3 0 013 3v10a3 3 0 01-3 3h-5',
    eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z',
    arrow: 'M5 12h14m-6-6l6 6-6 6',
    x: 'M18 6L6 18M6 6l12 12',
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    filter: 'M4 6h16M7 12h10M10 18h4',
    check: 'M20 6L9 17l-5-5',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  )
}

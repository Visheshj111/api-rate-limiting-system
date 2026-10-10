const paths = {
  chart: "M3 3v18h18M7 14l4-4 4 3 6-8",
  clients: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  plus: "M12 5v14M5 12h14",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  logout: "M9 5H4v14h5m0-7h12m-4-4 4 4-4 4",
  copy: "M9 9h12v12H9V9ZM15 5V3H3v12h2",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  jobs: "M8 3h8v4H8V3ZM8 5H5v16h14V5h-3M9 12h6m-6 4h4",
  lab: "M9 3h6m-5 0v7L4 20h16l-6-10V3M8 15h8",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  chevron: "m8 10 4 4 4-4",
  check: "m5 12 4 4L19 6",
};

export function Icon({ name, size = 18 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

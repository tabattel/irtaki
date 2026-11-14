"use client";

import type { ReactNode, SVGProps } from "react";

export type MushafIconName =
  | "audio" | "activity" | "palette" | "book" | "star" | "play" | "pause"
  | "stop" | "record" | "close" | "menu" | "prev" | "next" | "tafsir"
  | "qiraat" | "similar" | "check" | "settings"
  | "recitation" | "dictation" | "memory" | "fixation" | "revision"
  | "meditation" | "completion" | "night" | "stats" | "goals" | "calendar"
  | "exercises" | "data" | "repeat" | "timer" | "mic" | "folder"
  | "underline" | "highlight" | "eye" | "more" | "listening";

type MushafIconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: MushafIconName;
  size?: number;
};

const paths: Record<MushafIconName, ReactNode> = {
  audio: (<><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v5H5a1 1 0 0 1-1-1z"/><path d="M20 14h-3v5h2a1 1 0 0 0 1-1z"/></>),
  activity: (<><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M9 11h6M9 15h6M9 19h4"/></>),
  palette: (<><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4h-1a1.5 1.5 0 0 1 0-3H16a5 5 0 0 0 0-10z"/><circle cx="7" cy="10" r="1"/><circle cx="9.5" cy="6.5" r="1"/><circle cx="14" cy="6.5" r="1"/><circle cx="16.5" cy="10" r="1"/></>),
  book: (<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/></>),
  star: (<path d="m12 3 2.7 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.6 6.5 20.3l1.1-6.3L3 9.6l6.3-.9z"/>),
  play: (<path d="M7 4.5v15l13-7.5z"/>),
  pause: (<><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></>),
  stop: (<rect x="6" y="6" width="12" height="12" rx="1.5"/>),
  record: (<circle cx="12" cy="12" r="6"/>),
  close: (<path d="M6 6l12 12M18 6L6 18"/>),
  menu: (<><circle cx="12" cy="6" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="18" r="1.2"/></>),
  prev: (<path d="M15 6l-6 6 6 6"/>),
  next: (<path d="M9 6l6 6-6 6"/>),
  tafsir: (<><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H11v16H5.5A2.5 2.5 0 0 0 3 22.5z"/><path d="M21 6.5A2.5 2.5 0 0 0 18.5 4H13v16h5.5a2.5 2.5 0 0 1 2.5 2.5z"/></>),
  qiraat: (<><path d="M4 12a8 8 0 0 1 16 0v3"/><circle cx="12" cy="15" r="2"/><path d="M12 17v4"/></>),
  similar: (<><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h8M6 8v8M18 8v8M8 18h8"/></>),
  check: (<path d="M5 12l4 4L19 6"/>),
  settings: (<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1l2.1-2.1M17 7l2.1-2.1"/></>),
  recitation: (<><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/></>),
  dictation: (<><path d="M3 10v4a2 2 0 0 0 2 2h2l5 3V5L7 8H5a2 2 0 0 0-2 2z"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/></>),
  memory: (<><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></>),
  fixation: (<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>),
  revision: (<><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3M3 21v-5h5"/></>),
  meditation: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>),
  completion: (<><path d="M6 3h12v18l-6-4-6 4z"/><path d="M9 8h6M9 12h6"/></>),
  night: (<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>),
  stats: (<><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/></>),
  goals: (<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>),
  exercises: (<><path d="M14.7 6.3a4 4 0 0 0-5.6 5.6l-6 6a2 2 0 1 0 2.8 2.8l6-6a4 4 0 0 0 5.6-5.6l-2.8 2.8-2.8-2.8z"/></>),
  data: (<><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>),
  repeat: (<><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>),
  timer: (<><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></>),
  mic: (<><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></>),
  folder: (<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>),
  underline: (<><path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 20h16"/></>),
  highlight: (<><path d="M9 11l-6 6v3h3l6-6M14 6l4 4M12 8l4 4 6-6-4-4z"/></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>),
  more: (<><circle cx="12" cy="6" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="18" r="1.2"/></>),
  listening: (<><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v5H5a1 1 0 0 1-1-1z"/><path d="M20 14h-3v5h2a1 1 0 0 0 1-1z"/></>),
};

export function MushafIcon({ name, size = 16, ...rest }: MushafIconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name]}
    </svg>
  );
}

/** Canonical colors/type shared by native report CSS and generated image SVG. */
export const reportTheme = {
  light: {paper:'#f8f9f6',surface:'#ffffff',ink:'#20262c',muted:'#626d75',line:'#d9deda',accent:'#943f36',positive:'#a34139',negative:'#426d8b',soft:'#eef1ed'},
  dark: {paper:'#151a1e',surface:'#1c242a',ink:'#eceee9',muted:'#a3aeb6',line:'#39454d',accent:'#dbac98',positive:'#df9d90',negative:'#91b5ce',soft:'#202a30'},
} as const;
export const reportFonts = {
  heading: 'Georgia, "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", serif',
  body: 'Inter, "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif',
} as const;
export function reportThemeCss(): string {
  return Object.entries(reportTheme).map(([mode,colors]) => `${mode==='light'?':root, :root[data-theme="light"]':':root[data-theme="dark"]'} {\n${Object.entries(colors).map(([key,value])=>`  --desk-${key}: ${value};`).join('\n')}\n  --report-bg: ${colors.paper};\n  --report-ink: ${colors.ink};\n  --report-muted: ${colors.muted};\n  --report-line: ${colors.line};\n  --report-track: ${colors.soft};
  --report-positive: ${colors.positive};
  --report-negative: ${colors.negative};
  --report-accent: ${colors.accent};\n}`).join('\n') + `\n:root { --report-heading-font: ${reportFonts.heading}; --report-body-font: ${reportFonts.body}; }\n`;
}

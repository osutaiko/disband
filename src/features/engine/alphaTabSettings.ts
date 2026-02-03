import { Settings } from "@coderline/alphatab";

// https://alphatab.net/docs/reference/settings
export const alphaTabSettings: Partial<Settings> = {
  core: {
    fontDirectory: "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/",
  },
  display: {
    layoutMode: "page",
    scale: 1.0,
    rhythm: {
      enableAll: true,
    },
  },
  player: {
    enablePlayer: true,
    enableCursor: true,
    soundFont: "/soundfonts/sonivox.sf2", 
    enableUserInteraction: true,
  },
}

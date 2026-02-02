import { Settings } from "@coderline/alphatab";

// https://alphatab.net/docs/reference/settings
export const alphaTabSettings: Partial<Settings> = {
  core: {
    fontDirectory: "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/",
  },
  display: {
    layoutMode: "page",
    barsPerRow: 4,
    scale: 0.75,
    rhythm: {
      enableAll: true,
    },
  },
}

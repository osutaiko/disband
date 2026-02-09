import { Settings } from "@coderline/alphatab";

type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// https://alphatab.net/docs/reference/settings
export const alphaTabSettings: DeepPartial<Settings> = {
  core: {
    fontDirectory: "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/",
  },
  display: {
    scale: 1.0,
  },
  player: {
    enablePlayer: true,
    enableCursor: true,
    soundFont: "/soundfonts/sonivox.sf2", 
    enableUserInteraction: true,
  },
};

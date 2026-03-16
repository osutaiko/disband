import { createContext, useContext, useEffect, useState } from "react"

type ColorTheme = "dark" | "light" | "system"

type ColorThemeProviderProps = {
  children: React.ReactNode
  defaultColorTheme?: ColorTheme
  storageKey?: string
}

type ColorThemeProviderState = {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const initialState: ColorThemeProviderState = {
  colorTheme: "system",
  setColorTheme: () => null,
}

const ColorThemeProviderContext = createContext<ColorThemeProviderState>(initialState)

export function ColorThemeProvider({
  children,
  defaultColorTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ColorThemeProviderProps) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(
    () => (localStorage.getItem(storageKey) as ColorTheme) || defaultColorTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (colorTheme === "system") {
      const systemColorTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemColorTheme)
      return
    }

    root.classList.add(colorTheme)
  }, [colorTheme])

  const value = {
    colorTheme,
    setColorTheme: (theme: ColorTheme) => {
      localStorage.setItem(storageKey, theme)
      setColorTheme(theme)
    },
  }

  return (
    <ColorThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ColorThemeProviderContext.Provider>
  )
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeProviderContext)

  if (context === undefined)
    throw new Error("useColorTheme must be used within a ColorThemeProvider")

  return context
}

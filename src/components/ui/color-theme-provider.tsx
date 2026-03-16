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

function isColorTheme(value: unknown): value is ColorTheme {
  return value === "dark" || value === "light" || value === "system"
}

export function ColorThemeProvider({
  children,
  defaultColorTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ColorThemeProviderProps) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem(storageKey)
    return isColorTheme(stored) ? stored : defaultColorTheme
  })

  useEffect(() => {
    const root = window.document.documentElement

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const applyTheme = () => {
      root.classList.remove("light", "dark")

      if (colorTheme === "system") {
        const systemColorTheme = mediaQuery.matches ? "dark" : "light"
        root.classList.add(systemColorTheme)
        return
      }

      root.classList.add(colorTheme)
    }

    applyTheme()

    if (colorTheme !== "system")
      return undefined

    const handleSystemThemeChange = () => applyTheme()
    mediaQuery.addEventListener("change", handleSystemThemeChange)
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange)
  }, [colorTheme])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey)
        return

      const nextTheme = isColorTheme(event.newValue) ? event.newValue : defaultColorTheme
      setColorThemeState(nextTheme)
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [defaultColorTheme, storageKey])

  const value = {
    colorTheme,
    setColorTheme: (theme: ColorTheme) => {
      localStorage.setItem(storageKey, theme)
      setColorThemeState(theme)
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

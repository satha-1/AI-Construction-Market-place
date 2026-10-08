import { useEffect } from "react";

export type ThemeName = "console" | "storefront";

/** Applies the theme class to <html> so portals (modals, toasts) inherit it too. */
export function useTheme(theme: ThemeName) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-console", "theme-storefront");
    root.classList.add(`theme-${theme}`);
  }, [theme]);
}

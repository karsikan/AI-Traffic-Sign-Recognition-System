import { useTheme } from "@/context/ThemeContext";

export function useDarkMode() {
  const { dark, toggle } = useTheme();
  return {
    isDarkMode: dark,
    toggleDarkMode: toggle,
  };
}

import { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

const defaultTheme = {
  colors: {
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    accent: "#10B981",
    background: "#F9FAFB",
    surface: "#FFFFFF",
    text_primary: "#1F2937",
    text_secondary: "#6B7280",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    premium: "#FACC15"
  },
  typography: {
    font_family: "system-ui",
    heading_size: "2rem",
    body_size: "1rem",
    small_size: "0.875rem"
  },
  spacing: {
    card_padding: "1.5rem",
    section_gap: "1.5rem",
    button_padding: "0.75rem 1.5rem"
  },
  borders: {
    radius_small: "0.5rem",
    radius_medium: "1rem",
    radius_large: "1.5rem",
    width: "1px"
  },
  shadows: {
    small: "0 1px 3px rgba(0,0,0,0.1)",
    medium: "0 4px 6px rgba(0,0,0,0.1)",
    large: "0 10px 15px rgba(0,0,0,0.1)"
  },
  animations: {
    duration: "0.3s",
    easing: "ease-in-out",
    hover_scale: 1.02
  },
  components: {
    button_style: "rounded",
    card_style: "elevated",
    header_gradient: true
  },
  buttons: {
    primary_bg: "#3B82F6",
    primary_text: "#FFFFFF",
    primary_hover: "#2563EB"
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Load from localStorage on initial load
    try {
      const saved = localStorage.getItem('app_theme_custom');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("✅ Loaded custom theme from localStorage:", parsed);
        return parsed;
      }
    } catch (error) {
      console.error("Error loading theme from localStorage:", error);
    }
    return defaultTheme;
  });

  const { data: activeTheme } = useQuery({
    queryKey: ['active-theme'],
    queryFn: async () => {
      const themes = await base44.entities.ThemeSettings.list();
      return themes.find(t => t.is_active) || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (activeTheme) {
      const newTheme = {
        colors: { ...defaultTheme.colors, ...activeTheme.colors },
        typography: { ...defaultTheme.typography, ...activeTheme.typography },
        spacing: { ...defaultTheme.spacing, ...activeTheme.spacing },
        borders: { ...defaultTheme.borders, ...activeTheme.borders },
        shadows: { ...defaultTheme.shadows, ...activeTheme.shadows },
        animations: { ...defaultTheme.animations, ...activeTheme.animations },
        components: { ...defaultTheme.components, ...activeTheme.components },
        buttons: { ...defaultTheme.buttons, ...activeTheme.buttons }
      };
      setTheme(newTheme);
      
      // Save to localStorage
      try {
        localStorage.setItem('app_theme_custom', JSON.stringify(newTheme));
        console.log("✅ Saved theme from DB to localStorage");
      } catch (error) {
        console.error("Error saving theme to localStorage:", error);
      }
    }
  }, [activeTheme]);

  // Custom setTheme that saves to localStorage
  const setThemeWithSave = (newTheme) => {
    if (typeof newTheme === 'function') {
      setTheme(prevTheme => {
        const updatedTheme = newTheme(prevTheme);
        try {
          localStorage.setItem('app_theme_custom', JSON.stringify(updatedTheme));
          console.log("✅ Saved theme update to localStorage");
        } catch (error) {
          console.error("Error saving theme:", error);
        }
        return updatedTheme;
      });
    } else {
      setTheme(newTheme);
      try {
        localStorage.setItem('app_theme_custom', JSON.stringify(newTheme));
        console.log("✅ Saved theme to localStorage");
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    }
  };

  useEffect(() => {
    // Apply CSS variables
    const root = document.documentElement;
    
    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/_/g, '-')}`, value);
    });
    
    // Typography
    root.style.setProperty('--font-family', theme.typography.font_family);
    root.style.setProperty('--heading-size', theme.typography.heading_size);
    root.style.setProperty('--body-size', theme.typography.body_size);
    root.style.setProperty('--small-size', theme.typography.small_size);
    
    // Spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key.replace(/_/g, '-')}`, value);
    });
    
    // Borders
    Object.entries(theme.borders).forEach(([key, value]) => {
      root.style.setProperty(`--border-${key.replace(/_/g, '-')}`, value);
    });
    
    // Shadows
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
    
    // Animations
    root.style.setProperty('--animation-duration', theme.animations.duration);
    root.style.setProperty('--animation-easing', theme.animations.easing);
    root.style.setProperty('--hover-scale', theme.animations.hover_scale.toString());
    
    // Buttons
    if (theme.buttons) {
      Object.entries(theme.buttons).forEach(([key, value]) => {
        root.style.setProperty(`--button-${key.replace(/_/g, '-')}`, value);
      });
    }
    
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeWithSave }}>
      {children}
    </ThemeContext.Provider>
  );
}
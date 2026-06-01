/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:       '#1A73E8',   // Google Blue (replaces Sheets green)
        primaryDark:   '#0D47A1',
        primaryLight:  '#E3F2FD',
        accent:        '#174EA6',
        surface:       '#F8F9FA',   // Near-white background (Sheets grey)
        border:        '#DADCE0',   // Sheets border grey
        text:          '#202124',   // Sheets primary text
        textSecondary: '#5F6368',
        success:       '#1A73E8',
        warning:       '#F9A825',
        danger:        '#D93025',
        white:         '#FFFFFF',
      }
    },
  },
  plugins: [],
}

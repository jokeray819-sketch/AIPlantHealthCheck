/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.jsx",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4CAF50',
        secondary: '#2196F3',
        accent: '#FF9800',
        danger: '#F44336',
        warning: '#FFC107',
        success: '#4CAF50',
        dark: '#333333',
        medium: '#666666',
        light: '#EEEEEE'
      }
    }
  },
  plugins: [],
}

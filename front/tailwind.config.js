/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,jsx}",
  ],
  safelist: [
    // Product gradient backgrounds - needed for dynamic classes from database
    'from-green-400',
    'to-green-600',
    'from-yellow-400',
    'to-orange-500',
    'from-blue-400',
    'to-purple-500',
    'from-red-400',
    'to-pink-500',
    'from-gray-400',
    'to-gray-600',
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

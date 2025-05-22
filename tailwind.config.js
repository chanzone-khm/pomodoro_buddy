/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,ts}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        'pomodoro-red': '#E53E3E',
        'pomodoro-green': '#38A169',
      },
    },
  },
  plugins: [],
} 
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        // Doodle/Notebook style fonts
        doodle: ['"Comic Neue"', 'cursive'],
        handwritten: ['"Patrick Hand"', 'cursive'],
        cave: ['"Caveat"', 'cursive'],
        title: ['"Changa One"', 'cursive'],
      },
      colors: {
        // Notebook paper colors
        'paper': {
          light: '#fdfdfd',
          cream: '#faf8f0',
          lines: '#e8e4dc',
        },
        // Doodle accent colors
        'marker': {
          red: '#ff6b6b',
          blue: '#4ecdc4',
          yellow: '#ffe66d',
          green: '#95e1a3',
          purple: '#a29bfe',
          orange: '#f8b739',
        },
      },
      backgroundImage: {
        'notebook': `
          linear-gradient(rgba(150, 150, 255, 0.08) 2px, transparent 2px),
          linear-gradient(90deg, transparent 99px, rgba(255, 100, 100, 0.2) 99px, rgba(255, 100, 100, 0.2) 101px, transparent 101px)
        `,
      },
      backgroundSize: {
        'notebook': '100% 36px, 100% 100%',
      },
      boxShadow: {
        'cutout': '3px 5px 3px rgba(0,0,0,0.15)',
        'cutout-hover': '5px 8px 6px rgba(0,0,0,0.2)',
        'pencil': '2px 3px 1px rgba(0,0,0,0.1)',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'bob': 'bob 3s ease-in-out infinite',
        'wiggle': 'wiggle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(8px) rotate(2deg)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
      },
    },
  },
  plugins: [],
}

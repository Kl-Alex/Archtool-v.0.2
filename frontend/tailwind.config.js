/** @type {import('tailwindcss').Config} */


export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lentaBlue: "#003C71",
        lentaYellow: "#FFD500",
        lentaWhite: "#f4f4f4",
        textMain: "#333333", // ← основной цвет текста
        textSubmain: "#41b6e6"
      },
      fontFamily: {
        verdana: ['Verdana', 'Geneva', 'sans-serif'], // ← шрифт
      },
      animation: {
        "slide-in": "slideIn 0.3s ease-out",
      },
      keyframes: {
        slideIn: {
          "0%": { opacity: 0, transform: "translateY(-10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
            shake: {
      '0%, 100%': { transform: 'translateX(0)' },
      '20%, 60%': { transform: 'translateX(-8px)' },
      '40%, 80%': { transform: 'translateX(8px)' },
    },
      },
    },
  },
  plugins: [],
}

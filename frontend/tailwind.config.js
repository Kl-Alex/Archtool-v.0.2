/** @type {import('tailwindcss').Config} */


export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lentaBlue: "#003c96",
        lentaYellow: "#fdbf1d",
        lentaWhite: "#f4f4f4",
        textMain: "#131722", // ← основной цвет текста
        textSubmain: "#41b6e6"
      },
      fontFamily: {
        verdana: ['Verdana', 'Geneva', 'sans-serif'], // ← шрифт
      },
    },
  },
  plugins: [],
}

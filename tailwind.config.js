/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // `.font-dm` (font-family + letter-spacing) é definido em src/styles.css,
  // porque o `letterSpacing` não é suportado nas opções de `fontFamily`.
  theme: { extend: {} },
  plugins: [],
};

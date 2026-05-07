import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        verde: '#006341',
        rojo: '#CE1126',
        dorado: '#FFD100',
        crema: '#FAF6EE',
        tinta: '#0B1F15',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

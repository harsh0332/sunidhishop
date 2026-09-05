import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF7F2',
          200: '#F4EFE6',
          300: '#E8DEC8',
        },
        editorial: {
          black: '#121212',
          charcoal: '#222222',
          muted: '#666666',
          border: '#E8E6E1',
          card: '#FFFFFF',
          blush: '#F7EBE8',
          sand: '#EFECE6',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      aspectRatio: {
        'fashion': '4/5',
        'reel': '9/16',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 30px -4px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
};
export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFDF5',
        foreground: '#1E293B',
        muted: '#F1F5F9',
        mutedForeground: '#64748B',
        accent: '#8B5CF6',
        accentForeground: '#FFFFFF',
        secondary: '#F472B6',
        tertiary: '#FBBF24',
        quaternary: '#34D399',
        border: '#E2E8F0',
        input: '#FFFFFF',
        card: '#FFFFFF',
        ring: '#8B5CF6',
      },
      fontFamily: {
        heading: ['"Outfit"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '16px',
        lg: '24px',
        full: '9999px',
      },
      borderWidth: {
        DEFAULT: '2px',
      },
      boxShadow: {
        pop: '4px 4px 0px 0px #1E293B',
        'pop-hover': '6px 6px 0px 0px #1E293B',
        'pop-active': '2px 2px 0px 0px #1E293B',
        'pop-soft': '8px 8px 0px #E2E8F0',
        'pop-pink': '8px 8px 0px #F472B6',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(3deg)' },
          '75%': { transform: 'rotate(-3deg)' },
        },
        popIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out',
        popIn: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionTimingFunction: {
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

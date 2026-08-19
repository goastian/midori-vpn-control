import { ref } from 'vue'

const isDark = ref(true)

if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark')
  localStorage.setItem('theme', 'dark')
}

export function useDarkMode() {
  return { isDark, toggle: () => {} }
}

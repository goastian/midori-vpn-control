import { ref, watch } from 'vue'

const isDark = ref(localStorage.getItem('theme') === 'dark' ||
  (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches))

watch(isDark, (val) => {
  document.documentElement.classList.toggle('dark', val)
  localStorage.setItem('theme', val ? 'dark' : 'light')
}, { immediate: true })

export function useDarkMode() {
  function toggle() {
    isDark.value = !isDark.value
  }

  return { isDark, toggle }
}

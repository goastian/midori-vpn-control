<script setup lang="ts">
// This route is the OAuth redirect target for the MidoriVPN browser extension.
// The extension background script intercepts navigation to this URL via
// chrome.webNavigation.onCommitted, exchanges the code for tokens, and
// then closes this tab automatically.
//
// This view is only shown briefly as a fallback if the extension fails to
// close the tab in time.
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center space-y-4">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-midori-600 mx-auto"></div>
      <p class="text-gray-500 text-sm">Completing sign-in… you can close this tab.</p>
    </div>
  </div>
</template>

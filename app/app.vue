<template>
  <NuxtPage />
</template>

<style>
html, body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  margin: 0;
  padding: 0;
}
* {
  font-family: inherit !important;
}
</style>
<script setup>
useHead({
  link: [
    // Standard favicon
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },

    // Apple iPhone / iPad icon
    { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },

  ],

  meta: [
    // iOS status bar color
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },

    // Android theme color
    { name: "theme-color", content: "#1e5f8b" }
  ]
})
</script>

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Redirect from workers.dev to primary domain if reachable
if (window.location.hostname === '5rworkshops.onlyforart.workers.dev') {
  const primaryUrl = 'https://5rworkshops.onlyforlove.eu'
  fetch(primaryUrl, { method: 'HEAD', mode: 'no-cors' })
    .then(() => {
      window.location.href = primaryUrl
    })
    .catch(() => {
      // Primary domain not reachable, stay on current site
      createApp(App).mount('#app')
    })
} else {
  createApp(App).mount('#app')
}

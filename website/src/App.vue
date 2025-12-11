<script setup>
import { ref, computed } from 'vue'
import EventCalendar from './components/EventCalendar.vue'

const fetchedAt = ref(null)

function onMetadataLoaded(metadata) {
  fetchedAt.value = metadata.fetchedAt
}

const formattedFetchedAt = computed(() => {
  if (!fetchedAt.value) return ''
  const date = new Date(fetchedAt.value)
  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }
  return date.toLocaleString(undefined, options) + ' UTC'
})
</script>

<template>
  <div class="app">
    <header>
      <h1>Workshop Calendar</h1>
      <img src="/5rhythms-horizontal-english-black-gold.svg" alt="5Rhythms" class="logo" />
      <span v-if="formattedFetchedAt" class="last-updated">last updated: {{ formattedFetchedAt }}</span>
    </header>
    <main>
      <EventCalendar @metadata-loaded="onMetadataLoaded" />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: #000;
  padding: 0 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4rem;
  position: relative;
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.logo {
  height: calc(4rem - 2px);
  margin: 1px 0;
}

.last-updated {
  position: absolute;
  left: 2rem;
  top: 100%;
  color: #888;
  font-size: 0.75rem;
}

main {
  flex: 1;
  padding: 2rem;
}

@media (max-width: 768px) {
  header {
    padding: 0 1rem;
    height: 3rem;
  }

  header h1 {
    font-size: 1.25rem;
  }

  .logo {
    height: calc(3rem - 2px);
  }

  main {
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  header {
    padding: 0 0.5rem;
    height: 2.5rem;
  }

  header h1 {
    font-size: 1rem;
  }

  .logo {
    height: calc(2.5rem - 2px);
  }

  main {
    padding: 0;
  }
}
</style>

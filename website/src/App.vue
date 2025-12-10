<script setup>
import EventCalendar from './components/EventCalendar.vue'
</script>

<template>
  <div class="app">
    <header>
      <h1>5Rhythms Workshop Calendar</h1>
    </header>
    <main>
      <EventCalendar />
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
  background: var(--bg-secondary);
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border-color);
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
}

main {
  flex: 1;
  padding: 2rem;
}

@media (max-width: 768px) {
  header {
    padding: 0.75rem 1rem;
  }

  header h1 {
    font-size: 1.25rem;
  }

  main {
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  header {
    padding: 0.5rem;
  }

  header h1 {
    font-size: 1rem;
  }

  main {
    padding: 0;
  }
}
</style>

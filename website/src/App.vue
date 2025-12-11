<script setup>
import EventCalendar from './components/EventCalendar.vue'
</script>

<template>
  <div class="app">
    <header>
      <h1>Workshop Calendar</h1>
      <img src="/5rhythms-horizontal-english-black-gold.svg" alt="5Rhythms" class="logo" />
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
  background: #000;
  padding: 0 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4rem;
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

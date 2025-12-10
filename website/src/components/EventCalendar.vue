<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as d3 from 'd3'

const events = ref([])
const loading = ref(true)
const error = ref(null)
const svgRef = ref(null)

// Selected levels (all selected by default)
const selectedLevels = ref(new Set())

// Selected continents (all selected by default)
const selectedContinents = ref(new Set())

// Continent definitions
const continentOrder = [
  'Europe',
  'North America',
  'Central America',
  'South America',
  'Asia',
  'Africa',
  'Oceania'
]

// Country to continent mapping
const countryToContinent = {
  'Australia': 'Oceania',
  'Austria': 'Europe',
  'Belgium': 'Europe',
  'Belize': 'Central America',
  'Bulgaria': 'Europe',
  'Canada': 'North America',
  'Colombia': 'South America',
  'Costa Rica': 'Central America',
  'Croatia': 'Europe',
  'Czech Republic': 'Europe',
  'Denmark': 'Europe',
  'Finland': 'Europe',
  'France': 'Europe',
  'Georgia': 'Europe',
  'Germany': 'Europe',
  'Hungary': 'Europe',
  'Iceland': 'Europe',
  'India': 'Asia',
  'Indonesia': 'Asia',
  'Ireland': 'Europe',
  'Italy': 'Europe',
  'Mexico': 'North America',
  'Morocco': 'Africa',
  'Netherlands': 'Europe',
  'Norway': 'Europe',
  'Poland': 'Europe',
  'Portugal': 'Europe',
  'Romania': 'Europe',
  'Serbia': 'Europe',
  'Slovakia': 'Europe',
  'Slovenia': 'Europe',
  'South Korea': 'Asia',
  'Spain': 'Europe',
  'Sweden': 'Europe',
  'Switzerland': 'Europe',
  'United Kingdom': 'Europe',
  'United States': 'North America'
}

// Get continent for an event
function getContinent(event) {
  return countryToContinent[event.country] || 'Other'
}

// Level order for consistent stacking (same as legend)
const levelOrder = [
  'Waves',
  'Heartbeat',
  'Cycles',
  'Mirrors',
  'God, Sex and the Body',
  'Elective',
  'Training',
  'Teacher in Training'
]

// Color mapping for levels (using d3 schemeCategory10)
// Training and Teacher in Training share the same color
const levelColors = {
  'Waves': d3.schemeCategory10[0],           // #1f77b4
  'Heartbeat': d3.schemeCategory10[1],       // #ff7f0e
  'Cycles': d3.schemeCategory10[2],          // #2ca02c
  'Mirrors': d3.schemeCategory10[3],         // #d62728
  'God, Sex and the Body': d3.schemeCategory10[4], // #9467bd
  'Elective': d3.schemeCategory10[5],        // #8c564b
  'Training': d3.schemeCategory10[6],        // #e377c2
  'Teacher in Training': d3.schemeCategory10[6]  // #e377c2 (same as Training)
}

// Parse date from YYMMDD format
function parseDate(dateStr) {
  if (!dateStr || dateStr.length !== 6) return null
  const year = 2000 + parseInt(dateStr.substring(0, 2))
  const month = parseInt(dateStr.substring(2, 4)) - 1
  const day = parseInt(dateStr.substring(4, 6))
  return new Date(year, month, day)
}

// Get primary level from event
function getPrimaryLevel(event) {
  if (event.levels && event.levels.length > 0) {
    return event.levels[0].title
  }
  if (event.level) {
    return event.level
  }
  return 'Unknown'
}

// Get all dates for an event (from date_from to date_to)
// If event is longer than 14 days, only return first and last day
function getEventDates(event) {
  const dates = []
  const from = parseDate(event.date_from)
  const to = parseDate(event.date_to)

  if (!from) return dates

  const endDate = to || from
  const daysDiff = Math.round((endDate - from) / (1000 * 60 * 60 * 24))

  if (daysDiff > 21) {
    // Only highlight first and last day for long events
    dates.push({
      date: new Date(from),
      event: event,
      level: getPrimaryLevel(event)
    })
    if (endDate > from) {
      dates.push({
        date: new Date(endDate),
        event: event,
        level: getPrimaryLevel(event)
      })
    }
  } else {
    // Highlight all days for shorter events
    const current = new Date(from)
    while (current <= endDate) {
      dates.push({
        date: new Date(current),
        event: event,
        level: getPrimaryLevel(event)
      })
      current.setDate(current.getDate() + 1)
    }
  }

  return dates
}

// Process events into date-indexed map (filtered by selected continents)
const eventsByDate = computed(() => {
  const map = new Map()

  events.value
    .filter(e => !e.is_ondemand && e.date_from)
    .filter(e => selectedContinents.value.has(getContinent(e)))
    .forEach(event => {
      getEventDates(event).forEach(({ date, level }) => {
        const key = d3.timeFormat('%Y-%m-%d')(date)
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key).push({ event, level })
      })
    })

  return map
})

// Get year range from data
const yearRange = computed(() => {
  const years = new Set()
  events.value
    .filter(e => !e.is_ondemand && e.date_from)
    .forEach(e => {
      const date = parseDate(e.date_from)
      if (date) years.add(date.getFullYear())
    })
  return [...years].sort()
})

// Get unmapped countries (countries not in countryToContinent)
const unmappedCountries = computed(() => {
  const unmapped = new Set()
  events.value
    .filter(e => !e.is_ondemand && e.date_from && e.country)
    .forEach(e => {
      if (!countryToContinent[e.country]) {
        unmapped.add(e.country)
      }
    })
  return [...unmapped].sort()
})

// Get unique levels for a day, sorted by levelOrder, filtered by selection
function getLevelsForDay(dayEvents) {
  if (!dayEvents) return []
  const levels = [...new Set(dayEvents.map(e => e.level))]
    .filter(level => selectedLevels.value.has(level))
  return levels.sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b))
}

// Get count of events per level for a day
function getEventCountsByLevel(dayEvents) {
  if (!dayEvents) return {}
  const counts = {}
  dayEvents.forEach(e => {
    if (selectedLevels.value.has(e.level)) {
      counts[e.level] = (counts[e.level] || 0) + 1
    }
  })
  return counts
}

// Toggle level selection
function toggleLevel(level) {
  if (selectedLevels.value.has(level)) {
    selectedLevels.value.delete(level)
  } else {
    selectedLevels.value.add(level)
  }
  // Force reactivity
  selectedLevels.value = new Set(selectedLevels.value)
  renderCalendar()
}

// Check if level is selected
function isLevelSelected(level) {
  return selectedLevels.value.has(level)
}

// Toggle continent selection
function toggleContinent(continent) {
  if (selectedContinents.value.has(continent)) {
    selectedContinents.value.delete(continent)
  } else {
    selectedContinents.value.add(continent)
  }
  // Force reactivity
  selectedContinents.value = new Set(selectedContinents.value)
  renderCalendar()
}

// Check if continent is selected
function isContinentSelected(continent) {
  return selectedContinents.value.has(continent)
}

// Toggle all levels
function toggleAllLevels() {
  if (selectedLevels.value.size === 0) {
    selectedLevels.value = new Set(levelOrder)
  } else {
    selectedLevels.value = new Set()
  }
  renderCalendar()
}

// Toggle all continents
function toggleAllContinents() {
  if (selectedContinents.value.size === 0) {
    const allRegions = [...continentOrder]
    if (unmappedCountries.value.length > 0) {
      allRegions.push('Other')
    }
    selectedContinents.value = new Set(allRegions)
  } else {
    selectedContinents.value = new Set()
  }
  renderCalendar()
}

// Check if all levels are deselected
function allLevelsDeselected() {
  return selectedLevels.value.size === 0
}

// Check if all continents are deselected
function allContinentsDeselected() {
  return selectedContinents.value.size === 0
}

function renderCalendar() {
  if (!svgRef.value || yearRange.value.length === 0) return

  const cellWidth = 15
  const cellHeight = 45  // 3x taller
  const yearHeight = cellHeight * 7 + 25
  const width = cellWidth * 53 + 50
  const height = yearRange.value.length * yearHeight + 20

  // Clear existing
  d3.select(svgRef.value).selectAll('*').remove()

  const svg = d3.select(svgRef.value)
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('style', 'max-width: 100%; height: auto;')

  // Create a group for each year
  yearRange.value.forEach((year, yearIndex) => {
    const yearGroup = svg.append('g')
      .attr('transform', `translate(40, ${yearIndex * yearHeight + 20})`)

    // Year label (positioned above Mon label)
    yearGroup.append('text')
      .attr('x', -35)
      .attr('y', cellHeight * 0.2)
      .attr('text-anchor', 'start')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'var(--text-primary)')
      .text(year)

    // Day labels (Monday first)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    days.forEach((day, i) => {
      yearGroup.append('text')
        .attr('x', -5)
        .attr('y', i * cellHeight + cellHeight / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '9px')
        .attr('fill', 'var(--text-secondary)')
        .text(day)
    })

    // Generate all days of the year
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    const allDays = d3.timeDays(startDate, d3.timeDay.offset(endDate, 1))

    // Draw day cells as groups with stacked colors
    allDays.forEach(d => {
      const key = d3.timeFormat('%Y-%m-%d')(d)
      const dayEvents = eventsByDate.value.get(key)
      const levels = getLevelsForDay(dayEvents)
      const eventCounts = getEventCountsByLevel(dayEvents)
      const x = d3.timeMonday.count(d3.timeYear(d), d) * cellWidth
      // Convert getDay() (0=Sun, 1=Mon, ..., 6=Sat) to Monday-first (0=Mon, ..., 6=Sun)
      const y = ((d.getDay() + 6) % 7) * cellHeight

      const dayGroup = yearGroup.append('g')
        .attr('class', 'day-group')
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          if (!tooltipPinned.value) {
            d3.select(this).select('rect.day-bg')
              .attr('stroke', 'var(--text-primary)')
              .attr('stroke-width', 2)
            showTooltip(event, d, dayEvents)
          }
        })
        .on('mouseout', function() {
          // Don't reset highlight if this is the pinned cell
          if (pinnedCellElement.value !== this) {
            d3.select(this).select('rect.day-bg')
              .attr('stroke', 'var(--bg-secondary)')
              .attr('stroke-width', 1)
          }
          hideTooltip()
        })
        .on('click', function(event) {
          d3.select(this).select('rect.day-bg')
            .attr('stroke', 'var(--text-primary)')
            .attr('stroke-width', 2)
          pinTooltip(event, d, dayEvents)
        })

      // Background rect
      dayGroup.append('rect')
        .attr('class', 'day-bg')
        .attr('width', cellWidth - 2)
        .attr('height', cellHeight - 2)
        .attr('x', x)
        .attr('y', y)
        .attr('rx', 2)
        .attr('fill', 'var(--bg-tertiary)')
        .attr('stroke', 'var(--bg-secondary)')
        .attr('stroke-width', 1)

      // Draw stacked level colors with event counts
      if (levels.length > 0) {
        const segmentHeight = (cellHeight - 4) / levels.length
        levels.forEach((level, i) => {
          dayGroup.append('rect')
            .attr('class', 'level-segment')
            .attr('width', cellWidth - 4)
            .attr('height', segmentHeight)
            .attr('x', x + 1)
            .attr('y', y + 1 + i * segmentHeight)
            .attr('rx', i === 0 ? 2 : 0)
            .attr('ry', i === 0 ? 2 : 0)
            .attr('fill', levelColors[level] || '#718096')

          // Show count if more than 1 event for this level
          const count = eventCounts[level] || 0
          if (count > 1) {
            dayGroup.append('text')
              .attr('class', 'event-count')
              .attr('x', x + (cellWidth - 4) / 2 + 1)
              .attr('y', y + 1 + i * segmentHeight + segmentHeight / 2 + 3)
              .attr('text-anchor', 'middle')
              .attr('font-size', '8px')
              .attr('font-weight', 'bold')
              .attr('fill', 'white')
              .text(count)
          }
        })
      }
    })

    // Month labels
    const months = d3.timeMonths(startDate, endDate)
    yearGroup.selectAll('text.month')
      .data(months)
      .join('text')
      .attr('class', 'month')
      .attr('x', d => d3.timeMonday.count(d3.timeYear(d), d) * cellWidth + 2)
      .attr('y', -5)
      .attr('font-size', '9px')
      .attr('fill', 'var(--text-secondary)')
      .text(d => d3.timeFormat('%b')(d))
  })
}

// Tooltip
const tooltip = ref(null)
const tooltipContent = ref({ date: '', events: [] })
const tooltipStyle = ref({ left: '0px', top: '0px', display: 'none' })
const tooltipPinned = ref(false)
const pinnedCellElement = ref(null)

// Calculate event duration in days
function getEventDuration(event) {
  const from = parseDate(event.date_from)
  const to = parseDate(event.date_to)
  if (!from) return 1
  const endDate = to || from
  return Math.round((endDate - from) / (1000 * 60 * 60 * 24)) + 1
}

// Get teacher names as comma-separated string
function getTeacherNames(event) {
  if (!event.teachers || event.teachers.length === 0) return ''
  return event.teachers.map(t => t.title).join(', ')
}

function showTooltip(event, date, dayEvents, pinned = false) {
  // Don't show hover tooltips if one is pinned
  if (tooltipPinned.value && !pinned) return

  // Filter events by selected levels
  const filteredEvents = dayEvents ? dayEvents.filter(e => selectedLevels.value.has(e.level)) : []

  tooltipContent.value = {
    date: d3.timeFormat('%B %d, %Y')(date),
    events: filteredEvents.map(e => ({
      name: e.event.name,
      url: e.event.url || '',
      level: e.level,
      teachers: getTeacherNames(e.event),
      duration: getEventDuration(e.event),
      country: e.event.country || '',
      color: levelColors[e.level] || '#718096'
    }))
  }
  // Use the target element's bounding rect for accurate positioning
  // Add scroll offsets to make tooltip move with page scroll
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  const tooltipWidth = 350 // max-width of tooltip
  const viewportWidth = window.innerWidth

  // Check if tooltip would go off the right edge of the screen
  const wouldOverflowRight = rect.right + 10 + tooltipWidth > viewportWidth

  if (wouldOverflowRight) {
    // Position to the left of the cell, right-aligned to be adjacent
    tooltipStyle.value = {
      right: `${viewportWidth - rect.left + 10 - window.scrollX}px`,
      left: 'auto',
      top: `${rect.top + window.scrollY}px`,
      display: 'block'
    }
  } else {
    // Position to the right of the cell
    tooltipStyle.value = {
      left: `${rect.right + window.scrollX + 10}px`,
      right: 'auto',
      top: `${rect.top + window.scrollY}px`,
      display: 'block'
    }
  }

  if (pinned) {
    tooltipPinned.value = true
    pinnedCellElement.value = event.currentTarget
  }
}

function hideTooltip(force = false) {
  // Don't hide if pinned unless forced
  if (tooltipPinned.value && !force) return
  tooltipStyle.value.display = 'none'
  tooltipPinned.value = false
  // Reset the pinned cell highlight
  if (pinnedCellElement.value) {
    d3.select(pinnedCellElement.value).select('rect.day-bg')
      .attr('stroke', 'var(--bg-secondary)')
      .attr('stroke-width', 1)
    pinnedCellElement.value = null
  }
}

function pinTooltip(event, date, dayEvents) {
  // If clicking the same cell that's already pinned, unpin it
  if (tooltipPinned.value && pinnedCellElement.value === event.currentTarget) {
    hideTooltip(true)
    return
  }

  // If another cell was pinned, reset its highlight
  if (pinnedCellElement.value) {
    d3.select(pinnedCellElement.value).select('rect.day-bg')
      .attr('stroke', 'var(--bg-secondary)')
      .attr('stroke-width', 1)
  }

  showTooltip(event, date, dayEvents, true)
}

// Handle clicks outside the tooltip to dismiss it
function handleDocumentClick(event) {
  if (!tooltipPinned.value) return

  const tooltipEl = tooltip.value
  const clickedOnTooltip = tooltipEl && tooltipEl.contains(event.target)
  const clickedOnCell = event.target.closest('.day-group')

  if (!clickedOnTooltip && !clickedOnCell) {
    hideTooltip(true)
  }
}

onMounted(async () => {
  // Add document click listener for dismissing pinned tooltips
  document.addEventListener('click', handleDocumentClick)

  try {
    const response = await fetch('/data/event-data.json')
    if (!response.ok) throw new Error('Failed to load event data')
    events.value = await response.json()
    loading.value = false

    // Initialize all levels as selected
    selectedLevels.value = new Set(levelOrder)

    // Initialize all continents as selected (including 'Other' if there are unmapped countries)
    const allRegions = [...continentOrder]
    // Check for unmapped countries
    const hasUnmapped = events.value.some(e =>
      !e.is_ondemand && e.date_from && e.country && !countryToContinent[e.country]
    )
    if (hasUnmapped) {
      allRegions.push('Other')
    }
    selectedContinents.value = new Set(allRegions)

    // Wait for next tick then render
    setTimeout(renderCalendar, 0)
  } catch (e) {
    error.value = e.message
    loading.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="event-calendar">
    <div v-if="loading" class="loading">Loading event data...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <template v-else>
      <div v-if="unmappedCountries.length > 0" class="warning">
        Warning: The following countries are not mapped to a region: {{ unmappedCountries.join(', ') }}
      </div>

      <div class="legend">
        <h3>
          Event Levels
          <span class="legend-hint">(click to filter)</span>
          <button class="deselect-btn" @click="toggleAllLevels">{{ allLevelsDeselected() ? 'select all' : 'deselect all' }}</button>
        </h3>
        <div class="legend-items">
          <div
            v-for="level in levelOrder"
            :key="level"
            class="legend-item"
            :class="{ deselected: !isLevelSelected(level) }"
            @click="toggleLevel(level)"
          >
            <span class="color-box" :style="{ backgroundColor: levelColors[level] }"></span>
            <span>{{ level }}</span>
          </div>
        </div>
      </div>

      <div class="legend continents">
        <h3>
          Regions
          <span class="legend-hint">(click to filter)</span>
          <button class="deselect-btn" @click="toggleAllContinents">{{ allContinentsDeselected() ? 'select all' : 'deselect all' }}</button>
        </h3>
        <div class="legend-items">
          <div
            v-for="continent in continentOrder"
            :key="continent"
            class="legend-item"
            :class="{ deselected: !isContinentSelected(continent) }"
            @click="toggleContinent(continent)"
          >
            <span>{{ continent }}</span>
          </div>
          <div
            v-if="unmappedCountries.length > 0"
            class="legend-item"
            :class="{ deselected: !isContinentSelected('Other') }"
            @click="toggleContinent('Other')"
          >
            <span>Other</span>
          </div>
        </div>
      </div>

      <div class="calendar-container">
        <svg ref="svgRef"></svg>
      </div>

      <div
        ref="tooltip"
        class="tooltip"
        :class="{ pinned: tooltipPinned }"
        :style="tooltipStyle"
      >
        <div class="tooltip-date" @click="hideTooltip(true)">{{ tooltipContent.date }}</div>
        <div
          v-for="(evt, idx) in tooltipContent.events"
          :key="idx"
          class="tooltip-event"
        >
          <div class="event-line1">
            <span class="event-dot" :style="{ backgroundColor: evt.color }"></span>
            <span class="event-duration">{{ evt.duration }}d</span>
            <span class="event-level">{{ evt.level }}</span>
            <span v-if="evt.teachers" class="event-teachers">{{ evt.teachers }}</span>
          </div>
          <div class="event-line2">
            <span v-if="evt.country" class="event-country">{{ evt.country }}</span>
            <a v-if="evt.url" :href="evt.url" target="_blank" rel="noopener noreferrer" class="event-name">{{ evt.name }}</a>
            <span v-else class="event-name">{{ evt.name }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.event-calendar {
  padding: 1rem;
  margin-bottom: 400px;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.error {
  color: #e53e3e;
}

.warning {
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.legend {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.legend h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.legend-hint {
  font-weight: normal;
  font-size: 0.75rem;
  opacity: 0.7;
}

.deselect-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: normal;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
}

.deselect-btn:hover {
  text-decoration: underline;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: opacity 0.2s, background-color 0.2s;
}

.legend-item:hover {
  background-color: var(--bg-tertiary);
}

.legend-item.deselected {
  opacity: 0.4;
}

.legend-item.deselected .color-box {
  background-color: var(--text-secondary) !important;
}

.color-box {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.calendar-container {
  overflow-x: auto;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

@media (max-width: 768px) {
  .event-calendar {
    padding: 0.5rem;
  }

  .legend {
    margin-bottom: 1rem;
    padding: 0.75rem;
    border-radius: 4px;
  }

  .legend-items {
    gap: 0.5rem;
  }

  .legend-item {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
  }

  .calendar-container {
    padding: 0.5rem;
    border-radius: 4px;
  }
}

@media (max-width: 480px) {
  .event-calendar {
    padding: 0;
  }

  .legend {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    border-radius: 0;
  }

  .calendar-container {
    padding: 0.25rem;
    border-radius: 0;
  }
}

.tooltip {
  position: absolute;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.75rem;
  max-width: 350px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.tooltip.pinned {
  pointer-events: auto;
  border-color: var(--text-primary);
}

.tooltip.pinned .tooltip-date {
  cursor: pointer;
}

.tooltip.pinned .tooltip-date:hover {
  color: var(--accent-color);
}

.tooltip-date {
  font-weight: 600;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.tooltip-event {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.tooltip-event:first-of-type {
  border-top: none;
  padding-top: 0;
}

.event-line1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.event-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.event-level {
  font-weight: 600;
}

.event-teachers {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
}

.event-duration {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.event-line2 {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
  padding-left: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-country {
  margin-right: 0.5rem;
  font-weight: 500;
}

.event-name {
  opacity: 0.8;
  font-style: italic;
}

a.event-name {
  color: var(--text-secondary);
  text-decoration: underline;
}

a.event-name:hover {
  color: var(--text-primary);
}
</style>

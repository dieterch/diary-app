<template>
  <div class="page">

    <!-- HEADER -->
    <div class="top-header">
      <div class="left-icons" @click="$router.push('/')">☰</div>
      <div class="title">Analyse</div>
      <div class="right-icons"></div>
    </div>

    <!-- Zeitraum-Auswahl -->
    <div class="filter-bar">
      <select v-model="range" @change="updateFiltered">
        <option value="7">Letzte Woche</option>
        <option value="14">Letzte 2 Wochen</option>
        <option value="30">Letzter Monat</option>
        <option value="90">Letzte 3 Monate</option>
        <option value="180">Letzte 6 Monate</option>
        <option value="365">Letztes Jahr</option>
        <option value="all">Alle Werte</option>
      </select>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="{active: tab === 'line'}" @click="tab = 'line'">Liniengrafik</button>
      <button :class="{active: tab === 'pie'}" @click="tab = 'pie'">Kuchengrafik</button>
      <button :class="{active: tab === 'scatter'}" @click="tab = 'scatter'">Blutzuckerprofil</button>
    </div>

    <!-- TAB-INHALTE -->
    <div class="content">
      
      <!-- Liniengrafik -->
      <div v-if="tab === 'line'" class="chart-container">
        <canvas ref="lineCanvas"></canvas>
      </div>

      <!-- Kuchengrafik -->
      <div v-if="tab === 'pie'" class="chart-container">
        <canvas ref="pieCanvas"></canvas>
      </div>

      <!-- Scatter-Profil -->
      <div v-if="tab === 'scatter'" class="chart-container">
        <canvas ref="scatterCanvas"></canvas>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue"

// Daten vom Server
const { data: entriesRaw } = await useFetch("/api/entries")

const entries = ref([])
const range = ref("30")   // Default = letzter Monat
const tab = ref("line")

// Compute filtered entries by date
function updateFiltered() {
  if (!entriesRaw.value) return

  if (range.value === "all") {
    entries.value = entriesRaw.value
    renderCharts()
    return
  }

  const days = Number(range.value)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  entries.value = entriesRaw.value.filter(e => {
    return new Date(e.date) >= cutoff
  })

  renderCharts()
}

// ---------- Chart.js ----------
let lineChart = null
let pieChart = null
let scatterChart = null

async function renderCharts() {
  const { default: Chart } = await import("chart.js/auto")

  const data = entries.value
  const labels = data.map(e => new Date(e.date).toLocaleDateString("de-DE"))
  const sugar = data.map(e => e.bloodSugar)

  // ---- Linienchart ----
  if (lineChart) lineChart.destroy()
  lineChart = new Chart(lineCanvas.value.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Blutzucker",
          data: sugar,
          borderColor: "#1e78b2",
          backgroundColor: "#1e78b244",
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    }
  })

  // ---- Kuchenchart (Zonen) ----
  const low = 80, high = 140, veryHigh = 210
  const zones = {
    low: sugar.filter(v => v < low).length,
    mid: sugar.filter(v => v >= low && v <= high).length,
    high: sugar.filter(v => v > high && v <= veryHigh).length,
    veryHigh: sugar.filter(v => v > veryHigh).length
  }

  if (pieChart) pieChart.destroy()
  pieChart = new Chart(pieCanvas.value.getContext("2d"), {
    type: "pie",
    data: {
      labels: ["<80 mg/dl", "80–140 mg/dl", "141–210 mg/dl", ">210 mg/dl"],
      datasets: [
        {
          data: [zones.low, zones.mid, zones.high, zones.veryHigh],
          backgroundColor: ["#e67e22", "#2ecc71", "#3498db", "#8e44ad"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  })

  // ---- Scatter (24h Profil) ----
  const scatterData = entries.value
    .filter(e => e.bloodSugar != null)
    .map(e => ({
      x: new Date(e.date).getHours() + new Date(e.date).getMinutes() / 60,
      y: e.bloodSugar
    }))

  if (scatterChart) scatterChart.destroy()
  scatterChart = new Chart(scatterCanvas.value.getContext("2d"), {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "BZ",
          data: scatterData,
          borderColor: "#1e78b2",
          backgroundColor: "#1e78b2"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 24,
          ticks: {
            callback: h => `${String(h).padStart(2, "0")}:00`
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: 250
        }
      }
    }
  })
}

// DOM refs
const lineCanvas = ref(null)
const pieCanvas = ref(null)
const scatterCanvas = ref(null)

onMounted(() => {
  updateFiltered()
})

// new timeframe triggers rerender
watch(range, updateFiltered)
watch(tab, () => setTimeout(renderCharts, 50))
</script>

<style scoped>
.page {
  padding-top: 55px;
  font-family: -apple-system, BlinkMacSystemFont;
}

.top-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 55px;
  background: linear-gradient(180deg, #4a7cb2, #1e5f8b);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  z-index: 10;
  font-size: 22px;
}

.filter-bar {
  padding: 10px;
  display: flex;
  justify-content: center;
}

select {
  padding: 6px 12px;
  font-size: 16px;
  border-radius: 6px;
}

.tabs {
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
}

.tabs button {
  flex: 1;
  padding: 12px;
  border: none;
  background: #d0dbe5;
  font-size: 16px;
  cursor: pointer;
}

.tabs button.active {
  background: #4a7cb2;
  color: white;
}

.chart-container {
  margin-top: 20px;
  height: 380px;
  padding: 10px;
}
</style>

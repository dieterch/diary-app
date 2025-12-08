<template>
  <div class="page">

    <!-- HEADER -->
    <div class="top-header">
      <div class="left-icons" @click="$router.push('/')">☰</div>
      <div class="title">Analyse</div>
      <div class="right-icons"></div>
    </div>

    <!-- Zeitraum -->
    <div class="filter-bar">
      <select v-model="range">
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
      <button :class="{active: tab==='pie'}" @click="changeTab('pie')">Kuchengrafik</button>
      <button :class="{active: tab==='scatter'}" @click="changeTab('scatter')">Blutzuckerprofil</button>
    </div>

    <!-- Inhalte -->
    <div class="content">
      
      <!-- PIE -->
      <div v-show="tab==='pie'" class="chart-container medium">
        <canvas ref="pieRef"></canvas>
      </div>

      <!-- SCATTER -->
      <div v-show="tab==='scatter'" class="chart-container large">
        <canvas ref="scatterRef"></canvas>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue"

// Chart.js
import { Chart } from "chart.js/auto"

let pieChart = null
let scatterChart = null

const pieRef = ref(null)
const scatterRef = ref(null)

const allEntries = ref([])
const filtered = ref([])

const range = ref("all")
const tab = ref("pie")

//
//
// 🔵 1) ALLE EINTRÄGE LADEN
//
async function loadAll() {
  let out = []
  let skip = 0
  const TAKE = 300
  let done = false

  while (!done) {
    const res = await $fetch("/api/entries", { query: { skip, take: TAKE } })
    out.push(...res)
    if (res.length < TAKE) done = true
    skip += TAKE
  }

  // sortieren nach Datum
  out.sort((a,b)=> new Date(a.date) - new Date(b.date))

  allEntries.value = out
  applyFilter()
}

//
//
// 🔵 2) Zeitraumfilter
//
function applyFilter() {
  if (range.value === "all") {
    filtered.value = [...allEntries.value]
    return
  }

  const days = Number(range.value)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  filtered.value = allEntries.value.filter(e => new Date(e.date) >= cutoff)
}

//
//
// 🔵 3) Tabs wechseln
//
async function changeTab(t) {
  tab.value = t
  await nextTick()
  renderCharts()
}

//
//
// 🔵 4) Charts rendern
//
function destroyCharts() {
  pieChart?.destroy()
  scatterChart?.destroy()
}

async function renderCharts() {
  destroyCharts()

  const data = filtered.value
  if (!data.length) return

  //
  // 🟢 PIE CHART
  //
  if (tab.value === "pie" && pieRef.value) {
    const values = data
      .map(e => e.bloodSugar)
      .filter(v => v != null)

    const total = values.length || 1

    const counts = [
      values.filter(v => v < 40).length,
      values.filter(v => v >= 40 && v < 80).length,
      values.filter(v => v >= 80 && v <= 140).length,
      values.filter(v => v > 140 && v <= 210).length,
      values.filter(v => v > 210).length
    ]

    const labels = [
      "< 40 mg/dl",
      "40–79 mg/dl",
      "80–140 mg/dl",
      "141–210 mg/dl",
      "> 210 mg/dl"
    ]

    const percentLabels = labels.map((l,i) => {
      const pct = ((counts[i] / total) * 100).toFixed(1)
      return `${l} (${pct} %)`
    })

    pieChart = new Chart(pieRef.value, {
      type: "pie",
      data: {
        labels: percentLabels,
        datasets: [{
          data: counts,
          backgroundColor: [
            "#d35400",
            "#f39c12",
            "#2ecc71",
            "#3498db",
            "#8e44ad"
          ]
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 18 }
          }
        }
      }
    })
  }

  //
  // 🔵 SCATTER: 24h Profil
  //
  if (tab.value === "scatter" && scatterRef.value) {
    const pts = data
      .filter(e => e.bloodSugar != null)
      .map(e => ({
        x: new Date(e.date).getHours() + new Date(e.date).getMinutes() / 60,
        y: e.bloodSugar,
        originalDate: e.date
      }))

    scatterChart = new Chart(scatterRef.value, {
      type: "scatter",
      data: {
        datasets: [{
          label: "Blutzucker mg/dl",
          data: pts,
          backgroundColor: "#1e78b2",
          pointRadius: 3
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label(ctx) {
                const d = new Date(ctx.raw.originalDate)
                const dt = d.toLocaleDateString("de-DE") + " " +
                           d.toLocaleTimeString("de-DE", {hour:"2-digit", minute:"2-digit"})
                return `${dt}: ${ctx.raw.y} mg/dl`
              }
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 24,
            ticks: {
              callback: h => `${String(h).padStart(2,"0")}:00`
            }
          },
          y: {
            min: 0,
            max: Math.max(300, ...pts.map(p=>p.y))
          }
        }
      }
    })
  }
}

//
// 🔵 Watchers
//
watch(range, async () => {
  applyFilter()
  await nextTick()
  renderCharts()
})

//
// 🔵 Init
//
onMounted(async () => {
  await loadAll()
  await nextTick()
  renderCharts()
})
</script>

<style scoped>
.page {
  padding-top:55px;
}

.top-header {
  position:fixed;
  top:0; left:0; right:0;
  height:55px;
  background:linear-gradient(180deg,#4a7cb2,#1e5f8b);
  color:white;
  padding:0 18px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  z-index:1000;
  font-size:22px;
}

.filter-bar {
  text-align:center;
  margin:12px;
}

.tabs {
  display:flex;
}
.tabs button {
  flex:1;
  padding:12px;
  border:0;
  background:#d0dbe5;
}
.tabs button.active {
  background:#4a7cb2;
  color:white;
}

.chart-container.large {
  height:720px;
  padding:12px;
}
.chart-container.medium {
  height:512px;
  padding:12px;
}
</style>

<template>
  <div class="page">

    <!-- HEADER -->
    <div class="top-header">
      <div class="left-icons" @click="$router.push('/')">☰</div>
      <div class="title">Statistik</div>
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

    <!-- STATISTIK-KARTEN -->
    <div class="cards">

      <!-- BLOODSUGAR -->
      <div class="card">
        <div class="card-title">Blutzucker-Statistiken</div>

        <div class="row"><span>Anzahl Messwerte:</span><b>{{ stats.count }}</b></div>
        <div class="row"><span>Ø Messwerte pro Tag:</span><b>{{ stats.avgPerDay.toFixed(1) }}</b></div>
        <div class="row"><span>Ø Blutzucker letzte 2 Wochen:</span><b>{{ stats.avg14 }} mg/dl</b></div>
        <div class="row"><span>Ø Blutzucker letzte 4 Wochen:</span><b>{{ stats.avg30 }} mg/dl</b></div>
        <div class="row"><span>Ø Blutzucker letzte 6 Wochen:</span><b>{{ stats.avg45 }} mg/dl</b></div>
        <div class="row"><span>Ø Blutzucker letzte 8 Wochen:</span><b>{{ stats.avg60 }} mg/dl</b></div>
        <div class="row"><span>Ø Blutzucker über alle Werte:</span><b>{{ stats.avgAll }} mg/dl</b></div>

        <div class="row"><span>Höchster Blutzucker:</span><b>{{ stats.max }} mg/dl</b></div>
        <div class="row"><span>Niedrigster Blutzucker:</span><b>{{ stats.min }} mg/dl</b></div>
        <div class="row"><span>Blutzucker-Abweichung:</span><b>±{{ stats.std }} mg/dl</b></div>
        <div class="row"><span>HbA1c:</span><b>{{ stats.hba1c }}</b></div>
      </div>

      <!-- GEWICHT -->
      <div class="card">
        <div class="card-title">Gewichts-Statistiken</div>

        <div class="row"><span>Ø Gewicht:</span><b>{{ weight.avg }} kg</b></div>
        <div class="row"><span>Max. Gewicht:</span><b>{{ weight.max }} kg</b></div>
        <div class="row"><span>Min. Gewicht:</span><b>{{ weight.min }} kg</b></div>
      </div>

      <!-- BLOOD PRESSURE -->
      <div class="card">
        <div class="card-title">Blutdruck-Statistiken</div>

        <div class="row"><span>Ø Blutdruck:</span>
          <b>{{ pressure.avgSys }}/{{ pressure.avgDia }} mmHg</b>
        </div>

        <div class="row"><span>Ø Arterieller Mitteldruck:</span>
          <b>{{ pressure.map }} mmHg</b>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue"

const range = ref("all")

const entries = ref([])
const filtered = ref([])

//
// API Daten holen
//
async function loadEntries() {
  let out = []
  let skip = 0
  const TAKE = 300
  let done = false

  while (!done) {
    const res = await $fetch("/api/entries", { query: { skip, take: TAKE }})
    out.push(...res)
    if (res.length < TAKE) done = true
    skip += TAKE
  }

  entries.value = out.sort((a,b)=> new Date(a.date) - new Date(b.date))
  applyFilter()
}

//
// Zeitraumfilter
//
function applyFilter() {
  if (range.value === "all") {
    filtered.value = [...entries.value]
    return
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - Number(range.value))

  filtered.value = entries.value.filter(e => new Date(e.date) >= cutoff)
}

//
// Statistik-Berechnung
//
function average(arr) {
  return arr.length ? (arr.reduce((a,b)=>a+b,0) / arr.length) : 0
}

function stddev(arr) {
  if (!arr.length) return 0
  const mean = average(arr)
  const variance = average(arr.map(v => (v-mean)**2))
  return Math.sqrt(variance).toFixed(1)
}

const stats = ref({
  count: 0,
  avgPerDay: 0,
  avg14: 0,
  avg30: 0,
  avg45: 0,
  avg60: 0,
  avgAll: 0,
  min: 0,
  max: 0,
  std: 0,
  hba1c: "0.0 %"
})

const weight = ref({ avg: 0, min: 0, max: 0 })
const pressure = ref({ avgSys: 0, avgDia: 0, map: 0 })

function calculateStats() {
  const data = filtered.value

  const bz = data.filter(e => e.bloodSugar != null).map(e => e.bloodSugar)

  stats.value.count = bz.length

  if (bz.length === 0) return

  // Zeitraumwerte
  const now = new Date()

  function avgLast(days) {
    const cutoff = new Date(now)
    cutoff.setDate(now.getDate() - days)
    const arr = data.filter(e => new Date(e.date) >= cutoff && e.bloodSugar != null)
                    .map(e => e.bloodSugar)
    return average(arr).toFixed(1)
  }

  stats.value.avg14 = avgLast(14)
  stats.value.avg30 = avgLast(30)
  stats.value.avg45 = avgLast(45)
  stats.value.avg60 = avgLast(60)

  // Durchschnitt gesamt
  stats.value.avgAll = average(bz).toFixed(1)

  // Min / Max
  stats.value.min = Math.min(...bz)
  stats.value.max = Math.max(...bz)

  // Stddev
  stats.value.std = stddev(bz)

  // Werte / Tag
  const first = new Date(data[0].date)
  const days = (now - first) / 86400000
  stats.value.avgPerDay = bz.length / days

  // HbA1c aus geschätztem Mittelwert
  // Formel: HbA1c (%) = (Durchschnitt mg/dl + 46.7) / 28.7
  stats.value.hba1c = ((Number(stats.value.avgAll) + 46.7) / 28.7).toFixed(1) + " %"

  // Gewicht
  const weights = data.filter(e => e.weight != null).map(e => e.weight)
  if (weights.length) {
    weight.value.avg = average(weights).toFixed(1)
    weight.value.min = Math.min(...weights).toFixed(1)
    weight.value.max = Math.max(...weights).toFixed(1)
  }

  // Blutdruck
  const bp = data.filter(e => e.systolic != null && e.diastolic != null)
  if (bp.length) {
    pressure.value.avgSys = average(bp.map(e => e.systolic)).toFixed(0)
    pressure.value.avgDia = average(bp.map(e => e.diastolic)).toFixed(0)
    pressure.value.map = (
      average(bp.map(e => e.diastolic + (e.systolic - e.diastolic) / 3))
    ).toFixed(1)
  }
}

watch(range, () => {
  applyFilter()
  calculateStats()
})

onMounted(async () => {
  await loadEntries()
  calculateStats()
})
</script>

<style scoped>
.page { padding-top:55px; }

.top-header {
  position:fixed; top:0; left:0; right:0;
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

.filter-bar { text-align:center; margin:12px; }

.cards {
  display:flex;
  flex-wrap:wrap;
  gap:20px;
  justify-content:center;
  padding:10px;
}

.card {
  width:420px;
  background:white;
  border-radius:12px;
  padding:18px 22px;
  box-shadow:0 2px 10px rgba(0,0,0,0.15);
}

.card-title {
  font-size:20px;
  margin-bottom:12px;
  color:#1e5f8b;
  font-weight:600;
}

.row {
  display:flex;
  justify-content:space-between;
  padding:4px 0;
  font-size:15px;
}
</style>

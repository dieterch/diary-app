<template>
  <div class="page">

    <!-- ⭐ Hamburger Menü Overlay -->
    <div v-if="menuOpen" class="side-menu" @click.self="menuOpen = false">
      <div class="menu-panel">
        <h2>Menü</h2>
        <button @click="goDiary">📘 Tagebuch</button>
        <button @click="goAnalysis">📊 Analyse</button>
      </div>
    </div>

    <!-- ⭐ Header -->
    <div class="top-header">
      <div class="left-icons" @click="menuOpen = !menuOpen">☰</div>
      <div class="title">Tagebuch</div>
      <div class="right-icons"></div>
    </div>

    <!-- ⭐ Tagesgruppen -->
    <div
      v-for="(group, date) in grouped"
      :key="date"
      class="day-block"
    >

      <!-- Tageskopf → öffnet Tagesprofil -->
      <div class="day-header" @click="openDayProfile(date)">
        <div class="day-title">{{ weekday(date) }}</div>
        <div class="day-date">{{ formatDate(date) }}</div>
      </div>

      <!-- ⭐ Einträge -->
      <div
        v-for="(item, idx) in group"
        :key="item.id"
        class="entry"
        @click="editEntry(item)"
        :class="{ last: idx === group.length - 1 }"
      >
        <!-- Zeit -->
        <div class="col-time">{{ time(item.date) }}</div>

        <!-- Blutzucker -->
        <div class="col-sugar">
          <div
            class="sugar-box"
            :style="{
              background: sugarBackground(item.bloodSugar),
              color: item.bloodSugar == null ? '#000' : '#fff'
            }"
          >
            <div class="sugar-value">{{ item.bloodSugar ?? '-' }}</div>
            <div class="sugar-unit">mg/dl</div>
          </div>
        </div>

        <!-- Blutdruck -->
        <div class="col">
          <div class="main">{{ item.systolic ?? "/" }}/{{ item.diastolic ?? "/" }}</div>
          <div class="unit">mmHg</div>
        </div>

        <!-- Puls -->
        <div class="col">
          <div class="main">{{ item.pulse ?? "/" }}</div>
          <div class="unit">spm</div>
        </div>

        <!-- Gewicht -->
        <div class="col">
          <div class="main">{{ formatWeight(item.weight) }}</div>
          <div class="unit">kg</div>
        </div>

        <!-- Sport -->
        <div class="col">
          <div class="main">{{ item.sportMinutes ?? "/" }}</div>
          <div class="unit">Sport</div>
        </div>

        <!-- Notiz -->
        <div class="col note-col" @click.stop="openNote(item)">
          <div class="main note-preview">
            <span v-if="item.note">📝</span>
            <span v-else>/</span>
          </div>
          <div class="unit">Notiz</div>
        </div>

      </div>
    </div>

    <!-- Sentinel for Infinite Scroll -->
    <div ref="sentinel" class="sentinel"></div>

  </div>

  <!-- ⭐ Modal für Eintrag -->
  <EntryDialog
    v-model="dialogVisible"
    :entry="selectedEntry"
    @saved="reload"
  />

  <!-- ⭐ Modal für Tagesprofil -->
  <DayProfileModal
    v-model="showDayModal"
    :date="modalDate"
    :entries="entries"
  />

  <!-- ⭐ Floating Action Button -->
  <button class="fab" @click="openDialogForNew">
    <span class="fab-plus">+</span>
  </button>

</template>

<script setup>
/* Imports */
import EntryDialog from '~/components/EntryDialog.vue'
import DayProfileModal from '~/components/DayProfileModal.vue'
const router = useRouter()

/* Hamburger Menü */
const menuOpen = ref(false)
function goDiary() { router.push("/") }
function goAnalysis() { router.push("/analysis") }

/* Dialog */
const dialogVisible = ref(false)
const selectedEntry = ref(null)

function editEntry(item) {
  selectedEntry.value = { ...item }
  dialogVisible.value = true
}

function openDialogForNew() {
  selectedEntry.value = null
  dialogVisible.value = true
}

/* Tagesprofil Modal */
const showDayModal = ref(false)
const modalDate = ref(null)

function openDayProfile(date) {
  modalDate.value = date
  showDayModal.value = true
}

/* Daten laden mit Infinite Scroll */
const { data: config } = await useFetch("/api/config")

const entries = ref([])
const loading = ref(false)
const finished = ref(false)

async function reload() {
  entries.value = []
  finished.value = false
  await loadMore()
}

const TAKE = 100

async function loadMore() {
  if (loading.value || finished.value) return
  loading.value = true

  const res = await $fetch('/api/entries', {
    query: {
      skip: entries.value.length,
      take: TAKE
    }
  })

  if (res.length < TAKE) finished.value = true
  entries.value = [...entries.value, ...res]

  loading.value = false
}

onMounted(loadMore)

/* Gruppieren */
const grouped = computed(() => {
  const g = {}
  if (!entries.value) return g

  const sorted = [...entries.value].sort((a, b) => new Date(b.date) - new Date(a.date))

  for (const e of sorted) {
    const d = e.date.split("T")[0]
    ;(g[d] ??= []).push(e)
  }
  return g
})

/* Helpers */
function weekday(dateStr) {
  return new Date(dateStr)
    .toLocaleDateString("de-DE", { weekday: "long" })
    .replace(/^\w/, c => c.toUpperCase())
}
function formatDate(d) { return new Date(d).toLocaleDateString("de-DE") }
function time(dt) {
  return new Date(dt).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  })
}
function formatWeight(w) { return w == null ? "/" : Number(w).toFixed(1) }
function openNote(i) { alert(i.note || "Keine Notiz") }

/* Farben */
function sugarBackground(v) {
  if (v == null) return "transparent"
  const low = config.value?.glucose.low ?? 80
  const high = config.value?.glucose.high ?? 140
  if (v < low * 0.5) return "#b33939"
  if (v < low) return "#e1a32a"
  if (v <= high) return "#3cb371"
  if (v <= high * 1.5) return "#25a7d9"
  return "#6a0dad"
}

/* Infinite scroll watcher */
const sentinel = ref(null)
onMounted(() => {
  const obs = new IntersectionObserver(e => {
    if (e[0].isIntersecting) loadMore()
  })
  obs.observe(sentinel.value)
})
</script>

<style scoped>
/* ——————————————————————
   LAYOUT
—————————————————————— */

.page {
  font-family: -apple-system, BlinkMacSystemFont;
  margin: 0;
  padding-top: 0;
}

/* ⭐ Hamburger Menü */
.side-menu {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1500;
}
.menu-panel {
  width: 260px;
  background: #fff;
  height: 100%;
  padding: 20px;
}
.menu-panel h2 {
  margin: 0 0 14px 0;
}
.menu-panel button {
  width: 100%;
  padding: 12px;
  margin-bottom: 10px;
  font-size: 18px;
  text-align: left;
}

/* ⭐ Header */
.top-header {
  height: 55px;
  background: linear-gradient(180deg,#4a7cb2,#1e5f8b);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  font-size: 22px;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1000;
}
.left-icons { cursor: pointer; }

/* ⭐ Tagesblöcke */
.day-block {
  background: linear-gradient(90deg,#4a7cb2,#7fb7db);
  padding-top: 6px;
}
.day-header {
  display: flex;
  justify-content: space-between;
  padding: 6px 14px;
  color: white;
  cursor: pointer;
}
.day-title {
  font-size: 22px;
  font-weight: 600;
}
.day-date {
  font-size: 18px;
}

/* ⭐ Eintrag */
.entry {
  background: white;
  padding: 0 10px;
  height: 58px;
  display: grid;
  grid-template-columns: 70px 90px 100px 60px 60px 60px 60px;
  align-items: center;
  border-bottom: 1px solid #ddd;
}
.entry.last {
  border-bottom: none;
}

/* Spalten */
.col-time {
  font-size: 16px;
  font-weight: 500;
}
.col {
  text-align: center;
}
.main { font-size: 15px; font-weight: 500; }
.unit { font-size: 10px; color:#777; margin-top: 5px; }

/* ⭐ Zuckerfeld */
.col-sugar {
  height: 100%;
  display: flex;
}
.sugar-box {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.sugar-value { font-size: 18px; font-weight: 600; }
.sugar-unit { font-size: 11px; }

/* ⭐ Notiz */
.note-col { cursor: pointer; }
.note-preview { white-space: nowrap; overflow: hidden; }

/* Sentinel */
.sentinel { height: 40px; }

/* ⭐ Floating Action Button */
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 54px;
  height: 54px;
  background: #1e5f8b;
  color: white;
  border-radius: 50%;
  border: none;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.fab-plus { transform: translateY(-2px); }
</style>

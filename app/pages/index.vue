<template>
  <div class="page">

    <!-- Globaler Header -->
    <div class="top-header">
      <div class="left-icons">☰</div>
      <div class="title">Tagebuch</div>
      <div class="right-icons">⚙︎ ＋</div>
    </div>

    <!-- Tagesgruppen -->
    <div v-for="(group, date) in grouped" :key="date" class="day-block">

      <!-- Tagesheader -->
      <div class="day-header">
        <div class="day-title">{{ weekday(date) }}</div>
        <div class="day-date">{{ formatDate(date) }}</div>
      </div>

      <!-- Einträge -->
      <div
        v-for="(item, idx) in group"
        :key="item.id"
        class="entry"
        :class="{ last: idx === group.length - 1 }"
      >

        <!-- Zeit -->
        <div class="col-time">{{ time(item.date) }}</div>

        <!-- Zucker -->
        <div class="col-sugar">
          <div
            class="sugar-box"
            :style="{
              background: sugarBackground(item.bloodSugar),
              color: item.bloodSugar == null ? '#000' : '#fff'
            }"
          >
            <div class="sugar-value">{{ item.bloodSugar ?? "-" }}</div>
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

        <!-- Medikamente -->
        <div class="col">
          <div class="main">{{ item.insulinBolus ?? "/" }}</div>
          <div class="unit">Medikamente</div>
        </div>

        <!-- Notiz -->
        <div class="col note-col" @click="openNote(item)">
          <div class="main note-preview">
            <!-- <span v-if="item.note">📝 Notiz…</span> -->
            <span v-if="item.note">📝</span>
            <span v-else>/</span>
          </div>
          <div class="unit">Notiz</div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
const { data: entries } = await useFetch("/api/entries")
const { data: config } = await useFetch("/api/config")

// Gruppierung
const grouped = computed(() => {
  const g = {}
  if (!entries.value) return g
  for (const e of entries.value) {
    const d = e.date.split("T")[0]
    ;(g[d] ??= []).push(e)
  }
  return g
})

function weekday(dateStr) {
  return new Date(dateStr)
    .toLocaleDateString("de-DE", { weekday: "long" })
    .replace(/^\w/, c => c.toUpperCase())
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("de-DE")
}
function time(dt) {
  return new Date(dt).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}
function formatWeight(w) {
  return w == null ? "/" : Number(w).toFixed(1)
}

function openNote(item) {
  alert(item.note || "Keine Notiz")
}

/* ⭐ Farblogik (nutzt Werte aus configuration.yml) */
function sugarBackground(value) {
  if (value == null) return "transparent"   // <-- kein Hintergrund sichtbar

  const low = config.value?.glucose.low ?? 80
  const target = config.value?.glucose.target ?? 120
  const high = config.value?.glucose.high ?? 140

  if (value < low * 0.5) return "#b33939"
  if (value < low) return "#e1a32a"
  if (value <= high) return "#3cb371"
  if (value <= high * 1.5) return "#25a7d9"
  return "#6a0dad"
}
</script>

<style scoped>
.page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding-top: 0; /* Höhe des Headers */
}


/* Header */
.top-header {
  height: 55px;
  background: linear-gradient(180deg, #4a7cb2, #1e5f8b);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  color: white;
  font-size: 22px;
  font-weight: 600;

  position: sticky;
  top: 0;
  z-index: 999;
  background-clip: padding-box; /* <-- neues Fix */
}


.day-block {
  background: linear-gradient(90deg, #4a7cb2, #7fb7db);
  padding-top: 6px;
}

/* Tageskopf */
.day-header {
  display: flex;
  justify-content: space-between;
  color: white;
  padding: 6px 14px 8px;
}
.day-title { font-size: 22px; font-weight: 600; }
.day-date { font-size: 18px; font-weight: 600; }

/* Eintrag */
.entry {
  display: grid;
  grid-template-columns:
    70px 90px 100px 55px 55px 55px 100px 90px;
  height: 58px;
  align-items: center;
  padding: 0 10px;
  background: white;
  border-bottom: 1px solid #e5e5e5;
}

/* letzte Zeile ohne Linie */
.entry.last {
  border-bottom: none !important;
}

/* Zeit */
.col-time { font-size: 16px; font-weight: 500; }

/* Zucker */
.col-sugar {
  height: 100%;
  display: flex;
}
.sugar-box {
  width: 100%;
  height: 100%;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.sugar-value {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}
.sugar-unit {
  font-size: 11px;
}

/* Spalten */
.col {
  text-align: center;
}
.main {
  font-size: 15px;
  font-weight: 500;
}
.unit {
  font-size: 10px;
  margin-top: 6px;
  color: #777;
}

/* Notiz */
.note-col {
  cursor: pointer;
}
.note-preview {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

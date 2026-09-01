<template>
  <div class="page">
    <!-- ⭐ Hamburger Menü Overlay -->
    <div v-if="menuOpen" class="side-menu" @click.self="menuOpen = false">
      <div class="menu-panel">
        <h2>Menü</h2>
        <button @click="goDiary">📘 Tagebuch</button>
        <button @click="goAnalysis">📊 Analyse</button>
        <button @click="goStatistics">📈 Statistik</button>
      </div>
    </div>

    <!-- ⭐ Header -->
    <div class="top-header">
      <div class="left-icons" @click="menuOpen = !menuOpen">☰</div>
      <div class="period-nav">
        <button class="nav-btn" :disabled="!canGoNewer" title="Neuere Periode" @click="goNewer">‹</button>
        <div class="title">{{ currentPeriod?.label ?? "Tagebuch" }}</div>
        <button class="nav-btn" :disabled="!canGoOlder" title="Ältere Periode" @click="goOlder">›</button>
      </div>
      <div class="level-switch">
        <button
          v-for="level in viewLevels"
          :key="level.value"
          :class="{ active: viewLevel === level.value }"
          :title="level.title"
          @click="setViewLevel(level.value)"
        >
          {{ level.label }}
        </button>
      </div>
    </div>

    <div v-if="loading && !entries.length" class="empty-state">Lade Daten...</div>
    <div v-else-if="!currentPeriod" class="empty-state">Keine Einträge</div>

    <template v-else>
      <div
        v-if="viewLevel !== 'day'"
        class="period-header"
        @click="togglePeriod(currentPeriod.key)"
      >
        <div>
          <div class="period-title">{{ currentPeriod.label }}</div>
          <div class="period-range">{{ currentPeriod.rangeLabel }}</div>
        </div>
        <div class="period-summary">
          <span>{{ currentPeriod.entries.length }} Werte</span>
          <span>Ø {{ currentPeriod.avgBloodSugar }}</span>
          <span>{{ isPeriodExpanded(currentPeriod.key) ? "−" : "+" }}</span>
        </div>
      </div>

      <template v-if="viewLevel === 'day' || isPeriodExpanded(currentPeriod.key)">
        <div v-for="day in currentPeriod.days" :key="day.date" class="day-block">
          <!-- Tageskopf → öffnet Tagesprofil -->
          <div class="day-header" @click="openDayProfile(day.date)">
            <div class="day-title">{{ weekday(day.date) }}</div>
            <div class="day-date">{{ formatDate(day.date) }}</div>
          </div>

          <!-- ⭐ Einträge -->
          <div
            v-for="(item, idx) in day.entries"
            :key="item.id"
            class="entry"
            @click="editEntry(item)"
            :class="{ last: idx === day.entries.length - 1 }"
          >
            <!-- Zeit -->
            <div class="col-time">{{ time(item.date) }}</div>

            <!-- Blutzucker -->
            <div class="col-sugar">
              <div
                class="sugar-box"
                :style="{
                  background: sugarBackground(item.bloodSugar),
                  color: item.bloodSugar == null ? '#000' : '#fff',
                }"
              >
                <div class="sugar-value">{{ item.bloodSugar ?? "-" }}</div>
                <div class="sugar-unit">mg/dl</div>
              </div>
            </div>

            <!-- Blutdruck -->
            <div class="col">
              <div class="main">
                {{ item.systolic ?? "/" }}/{{ item.diastolic ?? "/" }}
              </div>
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
      </template>
    </template>
  </div>

  <!-- ⭐ Modal für Eintrag -->
  <EntryDialog v-model="dialogVisible" :entry="selectedEntry" @saved="reload" />

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
import EntryDialog from "~/components/EntryDialog.vue";
import DayProfileModal from "~/components/DayProfileModal.vue";
const router = useRouter();

/* Hamburger Menü */
const menuOpen = ref(false);
function goDiary() {
  router.push("/");
}
function goAnalysis() {
  router.push("/analysis");
}
function goStatistics() {
  menuOpen.value = false;
  router.push("/statistics");
}

/* Dialog */
const dialogVisible = ref(false);
const selectedEntry = ref(null);

function editEntry(item) {
  selectedEntry.value = { ...item };
  dialogVisible.value = true;
}

function openDialogForNew() {
  selectedEntry.value = null;
  dialogVisible.value = true;
}

/* Tagesprofil Modal */
const showDayModal = ref(false);
const modalDate = ref(null);

function openDayProfile(date) {
  modalDate.value = date;
  showDayModal.value = true;
}

/* Daten laden */
const { data: config } = await useFetch("/api/config");

const entries = ref([]);
const loading = ref(false);
const currentPeriodIndex = ref(0);
const expandedPeriods = ref(new Set());

const viewLevels = [
  { value: "day", label: "D", title: "Tag" },
  { value: "week", label: "W", title: "Woche" },
  { value: "month", label: "M", title: "Monat" },
  { value: "year", label: "Y", title: "Jahr" },
];

const viewLevel = useCookie("diary-view-level", {
  default: () => "day",
  sameSite: "lax",
});

async function reload() {
  entries.value = [];
  await loadAll();
}

const TAKE = 300;

async function loadAll() {
  if (loading.value) return;
  loading.value = true;

  const out = [];
  let skip = 0;
  let done = false;

  while (!done) {
    const res = await $fetch("/api/entries", {
      query: { skip, take: TAKE },
    });

    out.push(...res);
    if (res.length < TAKE) done = true;
    skip += TAKE;
  }

  entries.value = out;
  currentPeriodIndex.value = Math.min(currentPeriodIndex.value, Math.max(periods.value.length - 1, 0));

  loading.value = false;
}

onMounted(loadAll);

/* Gruppieren */
const periods = computed(() => {
  const byPeriod = new Map();

  const sorted = [...entries.value].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  for (const e of sorted) {
    if (!e.date) continue;
    const key = periodKey(e, viewLevel.value);

    if (!byPeriod.has(key)) {
      byPeriod.set(key, []);
    }
    byPeriod.get(key).push(e);
  }

  return [...byPeriod.entries()]
    .map(([key, periodEntries]) => buildPeriod(key, periodEntries))
    .sort((a, b) => b.sortTime - a.sortTime);
});

const currentPeriod = computed(() => periods.value[currentPeriodIndex.value] ?? null);
const canGoNewer = computed(() => currentPeriodIndex.value > 0);
const canGoOlder = computed(() => currentPeriodIndex.value < periods.value.length - 1);

watch(viewLevel, () => {
  currentPeriodIndex.value = 0;
  expandedPeriods.value = new Set();
});

watch(periods, (next) => {
  if (currentPeriodIndex.value >= next.length) {
    currentPeriodIndex.value = Math.max(next.length - 1, 0);
  }
});

function setViewLevel(level) {
  viewLevel.value = level;
}

function goNewer() {
  if (canGoNewer.value) currentPeriodIndex.value--;
}

function goOlder() {
  if (canGoOlder.value) currentPeriodIndex.value++;
}

function isPeriodExpanded(key) {
  return !expandedPeriods.value.has(key);
}

function togglePeriod(key) {
  const next = new Set(expandedPeriods.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedPeriods.value = next;
}

/* Helpers */
function periodKey(entry, level) {
  const date = new Date(entry.date);
  const day = entry.date.split("T")[0];

  if (level === "day") return day;
  if (level === "week") return isoWeekKey(date);
  if (level === "month") return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  return String(date.getFullYear());
}

function buildPeriod(key, periodEntries) {
  const sorted = [...periodEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const days = groupDays(sorted);
  const dates = sorted.map((e) => new Date(e.date));
  const first = new Date(Math.min(...dates));
  const last = new Date(Math.max(...dates));

  return {
    key,
    entries: sorted,
    days,
    label: periodLabel(key, first, last),
    rangeLabel: rangeLabel(first, last),
    avgBloodSugar: averageBloodSugar(sorted),
    sortTime: last.getTime(),
  };
}

function groupDays(list) {
  const byDay = new Map();
  for (const e of list) {
    const day = e.date.split("T")[0];
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(e);
  }

  return [...byDay.entries()]
    .map(([date, dayEntries]) => ({
      date,
      entries: dayEntries.sort((a, b) => new Date(b.date) - new Date(a.date)),
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function periodLabel(key, first, last) {
  if (viewLevel.value === "day") return formatDate(key);
  if (viewLevel.value === "week") {
    const [, year, week] = key.match(/^(\d{4})-W(\d{2})$/) ?? [];
    return `KW ${Number(week)} / ${year}`;
  }
  if (viewLevel.value === "month") {
    return last.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  }
  return key;
}

function rangeLabel(first, last) {
  if (first.toDateString() === last.toDateString()) return formatDate(toDateKey(last));
  return `${formatDate(toDateKey(first))} - ${formatDate(toDateKey(last))}`;
}

function averageBloodSugar(list) {
  const values = list.map((e) => e.bloodSugar).filter((v) => v != null);
  if (!values.length) return "-";
  const avg = values.reduce((sum, value) => sum + Number(value), 0) / values.length;
  return `${avg.toFixed(0)} mg/dl`;
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad(week)}`;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function weekday(dateStr) {
  return new Date(`${dateStr}T12:00:00`)
    .toLocaleDateString("de-DE", { weekday: "long" })
    .replace(/^\w/, (c) => c.toUpperCase());
}
function formatDate(d) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("de-DE");
}
function time(dt) {
  return new Date(dt).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatWeight(w) {
  return w == null ? "/" : Number(w).toFixed(1);
}
function openNote(i) {
  alert(i.note || "Keine Notiz");
}

/* Farben */
function sugarBackground(v) {
  if (v == null) return "transparent";
  const verylow = config.value?.glucose.verylow ?? 40;
  const low = config.value?.glucose.low ?? 80;
  const high = config.value?.glucose.high ?? 140;
  const veryhigh = config.value?.glucose.veryhigh ?? 210;
  if (v < verylow) return "#b33939";
  if (v < low) return "#e1a32a";
  if (v <= high) return "#3cb371";
  if (v <= veryhigh) return "#25a7d9";
  return "#6a0dad";
}
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
  background: rgba(0, 0, 0, 0.45);
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
  min-height: 55px;
  background: linear-gradient(180deg, #4a7cb2, #1e5f8b);
  color: white;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  font-size: 22px;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1000;
}
.left-icons {
  cursor: pointer;
  font-size: 24px;
}
.period-nav {
  min-width: 0;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 32px;
  gap: 4px;
  align-items: center;
}
.title {
  min-width: 0;
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 19px;
}
.nav-btn {
  width: 32px;
  height: 34px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
}
.nav-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.level-switch {
  display: grid;
  grid-template-columns: repeat(4, 28px);
  gap: 3px;
}
.level-switch button {
  width: 28px;
  height: 30px;
  border: 0;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.level-switch button.active {
  background: white;
  color: #1e5f8b;
}
.empty-state {
  padding: 24px;
  text-align: center;
  color: #555;
}
.period-header {
  background: linear-gradient(90deg, #4a7cb2, #7fb7db);
  color: white;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}
.period-title {
  font-size: 22px;
  font-weight: 600;
}
.period-range {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 2px;
}
.period-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  white-space: nowrap;
}

/* ⭐ Tagesblöcke */
.day-block {
  background: linear-gradient(90deg, #4a7cb2, #7fb7db);
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
  grid-template-columns: 55px 70px 90px 50px 50px 50px 50px;
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
.main {
  font-size: 15px;
  font-weight: 500;
}
.unit {
  font-size: 10px;
  color: #777;
  margin-top: 5px;
}

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
.sugar-value {
  font-size: 18px;
  font-weight: 600;
}
.sugar-unit {
  font-size: 11px;
}

/* ⭐ Notiz */
.note-col {
  cursor: pointer;
}
.note-preview {
  white-space: nowrap;
  overflow: hidden;
}

/* Sentinel */
.sentinel {
  height: 40px;
}

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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.fab-plus {
  transform: translateY(-2px);
}

@media (max-width: 560px) {
  .top-header {
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 5px;
    padding: 6px;
  }
  .period-nav {
    grid-template-columns: 28px minmax(0, 1fr) 28px;
  }
  .title {
    font-size: 15px;
  }
  .nav-btn {
    width: 28px;
    height: 30px;
    font-size: 22px;
  }
  .level-switch {
    grid-template-columns: repeat(4, 24px);
  }
  .level-switch button {
    width: 24px;
    height: 28px;
    font-size: 12px;
  }
  .period-header {
    align-items: flex-start;
  }
  .period-title {
    font-size: 18px;
  }
  .period-summary {
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
}
</style>

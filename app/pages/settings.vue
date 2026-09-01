<template>
  <div class="page">
    <div class="top-header">
      <button class="back-btn" title="Zurueck" @click="$router.push('/')">‹</button>
      <div class="title">Einstellungen</div>
      <div class="right-icons"></div>
    </div>

    <main class="settings">
      <section class="panel">
        <h2>Blutzucker-Farben</h2>

        <div class="bands">
          <label v-for="band in bands" :key="band.key" class="band-row">
            <span>
              <b>{{ band.label }}</b>
              <small>{{ band.range }}</small>
            </span>
            <input v-model="localColors[band.key]" type="color">
          </label>
        </div>

        <div class="actions">
          <button class="secondary" @click="reset">Zuruecksetzen</button>
          <button class="primary" @click="save">Speichern</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
const { data: config } = await useFetch("/api/config");
const { bandColors, thresholds, saveColors, resetColors } = useGlucoseBands(config);

const localColors = reactive({ ...bandColors.value });

const bands = computed(() => {
  const limits = thresholds.value;
  return [
    { key: "verylow", label: "Sehr niedrig", range: `< ${limits.verylow} mg/dl` },
    { key: "low", label: "Niedrig", range: `${limits.verylow} - ${limits.low - 1} mg/dl` },
    { key: "target", label: "Zielbereich", range: `${limits.low} - ${limits.high} mg/dl` },
    { key: "high", label: "Hoch", range: `${limits.high + 1} - ${limits.veryhigh} mg/dl` },
    { key: "veryhigh", label: "Sehr hoch", range: `> ${limits.veryhigh} mg/dl` },
  ];
});

watch(bandColors, (next) => {
  Object.assign(localColors, next);
});

function save() {
  saveColors(localColors);
}

function reset() {
  resetColors();
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7f9;
  padding-top: 55px;
}

.top-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 55px;
  background: linear-gradient(180deg, #4a7cb2, #1e5f8b);
  color: white;
  padding: 0 18px;
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  z-index: 1000;
  font-size: 22px;
}

.back-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.title {
  text-align: center;
  font-weight: 600;
}

.settings {
  max-width: 560px;
  margin: 0 auto;
  padding: 18px;
}

.panel {
  background: white;
  border-radius: 8px;
  padding: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
}

h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #1e5f8b;
}

.bands {
  display: grid;
  gap: 10px;
}

.band-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 10px 0;
  border-bottom: 1px solid #ececec;
}

.band-row:last-child {
  border-bottom: 0;
}

.band-row span {
  display: grid;
  gap: 3px;
}

.band-row small {
  color: #666;
}

input[type="color"] {
  width: 56px;
  height: 36px;
  padding: 2px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.actions button {
  border: 0;
  border-radius: 6px;
  padding: 9px 14px;
  cursor: pointer;
  font-weight: 600;
}

.secondary {
  background: #d0dbe5;
}

.primary {
  background: #4a7cb2;
  color: white;
}
</style>

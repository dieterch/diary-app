<template>
  <div class="page">
    <div class="top-header">
      <button class="back-btn" title="Zurueck" @click="$router.push('/')">‹</button>
      <div class="title">Einstellungen</div>
      <div class="right-icons"></div>
    </div>

    <main class="settings">
      <section class="panel">
        <h2>Blutzucker-Bereiche</h2>

        <div class="bands">
          <label v-for="band in bands" :key="band.key" class="band-row">
            <span>
              <b>{{ band.label }}</b>
              <small>{{ band.range }}</small>
            </span>
            <input v-model="localColors[band.key]" type="color">
          </label>
        </div>

        <div class="thresholds">
          <label v-for="border in borders" :key="border.key" class="threshold-row">
            <span>{{ border.label }}</span>
            <input
              v-model.number="localThresholds[border.key]"
              type="number"
              inputmode="numeric"
              :min="border.min"
              :max="border.max"
              step="1"
              @input="clampThreshold(border.key)"
              @change="clampThreshold(border.key)"
            >
          </label>
        </div>

        <p v-if="thresholdError" class="error">{{ thresholdError }}</p>

        <div class="actions">
          <button class="secondary" @click="reset">Zuruecksetzen</button>
          <button class="primary" :disabled="Boolean(thresholdError)" @click="save">Speichern</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
const { data: config } = await useFetch("/api/config");
const {
  bandColors,
  thresholds,
  saveColors,
  resetColors,
  saveThresholds,
  resetThresholds,
} = useGlucoseBands(config);

const localColors = reactive({ ...bandColors.value });
const localThresholds = reactive({
  verylow: thresholds.value.verylow,
  low: thresholds.value.low,
  high: thresholds.value.high,
  veryhigh: thresholds.value.veryhigh,
});

const previewThresholds = computed(() => ({
  verylow: Number(localThresholds.verylow),
  low: Number(localThresholds.low),
  high: Number(localThresholds.high),
  veryhigh: Number(localThresholds.veryhigh),
}));

const borders = computed(() => {
  const limits = previewThresholds.value;
  return [
    { key: "verylow", label: "Grenze sehr niedrig / niedrig", min: 1, max: limits.low - 1 },
    { key: "low", label: "Untergrenze Zielbereich", min: limits.verylow + 1, max: limits.high },
    { key: "high", label: "Obergrenze Zielbereich", min: limits.low, max: limits.veryhigh - 1 },
    { key: "veryhigh", label: "Grenze hoch / sehr hoch", min: limits.high + 1, max: 1000 },
  ];
});

const thresholdError = computed(() => {
  const limits = previewThresholds.value;
  if (Object.values(limits).some((value) => !Number.isFinite(value))) {
    return "Alle Grenzwerte muessen Zahlen sein.";
  }
  if (limits.verylow >= limits.low) {
    return "Die Grenze fuer sehr niedrig muss kleiner als die Untergrenze des Zielbereichs sein.";
  }
  if (limits.low > limits.high) {
    return "Die Untergrenze des Zielbereichs darf nicht groesser als die Obergrenze sein.";
  }
  if (limits.high >= limits.veryhigh) {
    return "Die Obergrenze des Zielbereichs muss kleiner als die Grenze fuer sehr hoch sein.";
  }
  return "";
});

const bands = computed(() => {
  const limits = thresholdError.value ? thresholds.value : previewThresholds.value;
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

watch(thresholds, (next) => {
  Object.assign(localThresholds, {
    verylow: next.verylow,
    low: next.low,
    high: next.high,
    veryhigh: next.veryhigh,
  });
});

function clampThreshold(key) {
  const value = Math.round(Number(localThresholds[key]));
  localThresholds[key] = Number.isFinite(value) ? value : thresholds.value[key];

  if (key === "verylow" && localThresholds.verylow >= localThresholds.low) {
    localThresholds.low = localThresholds.verylow + 1;
  }
  if (key === "low") {
    if (localThresholds.low <= localThresholds.verylow) localThresholds.verylow = localThresholds.low - 1;
    if (localThresholds.low > localThresholds.high) localThresholds.high = localThresholds.low;
  }
  if (key === "high") {
    if (localThresholds.high < localThresholds.low) localThresholds.low = localThresholds.high;
    if (localThresholds.high >= localThresholds.veryhigh) localThresholds.veryhigh = localThresholds.high + 1;
  }
  if (key === "veryhigh" && localThresholds.veryhigh <= localThresholds.high) {
    localThresholds.high = localThresholds.veryhigh - 1;
  }

  localThresholds.verylow = Math.max(1, Math.min(localThresholds.verylow, 998));
  localThresholds.low = Math.max(localThresholds.verylow + 1, Math.min(localThresholds.low, 999));
  localThresholds.high = Math.max(localThresholds.low, Math.min(localThresholds.high, 999));
  localThresholds.veryhigh = Math.max(localThresholds.high + 1, Math.min(localThresholds.veryhigh, 1000));
}

function save() {
  if (thresholdError.value) return;
  saveColors(localColors);
  saveThresholds(localThresholds);
}

function reset() {
  resetColors();
  resetThresholds();
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

.thresholds {
  display: grid;
  gap: 10px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #ececec;
}

.threshold-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  align-items: center;
  gap: 14px;
}

.threshold-row span {
  font-weight: 600;
}

.threshold-row input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  text-align: right;
}

.error {
  margin: 14px 0 0 0;
  color: #b33939;
  font-size: 14px;
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

.actions button:disabled {
  cursor: default;
  opacity: 0.5;
}

.secondary {
  background: #d0dbe5;
}

.primary {
  background: #4a7cb2;
  color: white;
}
</style>

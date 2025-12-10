<template>
  <teleport to="body">
    <div v-if="show" class="overlay" @click.self="close">
      <div class="modal">

        <!-- HEADER -->
        <div class="modal-header">
          <div class="title">{{ title }}</div>
          <button class="close" @click="close">✕</button>
        </div>

        <!-- BODY -->
        <div class="modal-body">
          <div class="chart-area">
            <canvas ref="canvas"></canvas>
          </div>

          <div class="stats">
            <h3>Statistik</h3>
            <dl>
              <div><dt>Ø Blutzucker:</dt><dd class="nowrap">{{ meanValue }} mg/dl</dd></div>
              <div><dt>Blutzucker-Abweichung:</dt><dd class="nowrap">±{{ stdValue }} mg/dl</dd></div>
              <div><dt>Höchster Blutzucker:</dt><dd class="nowrap">{{ maxValue }} mg/dl</dd></div>
              <div><dt>Niedrigster Blutzucker:</dt><dd class="nowrap">{{ minValue }} mg/dl</dd></div>
              <div><dt>Gesamt BE:</dt><dd class="nowrap">{{ totalBE }} BE</dd></div>
            </dl>
          </div>

        </div>

      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";

// const props = defineProps({
//   modelValue: { type: Boolean, default: false },
//   date: { type: String, required: true },
//   entries: { type: Array, default: () => [] }
// });

const props = defineProps({
  modelValue: { type: Boolean, default: false },

  // FIX: date darf null sein → Warnung verschwindet
  date: {
    type: String,
    required: false,
    default: null
  },

  entries: {
    type: Array,
    default: () => []
  }
});


const emit = defineEmits(["update:modelValue"]);

const show = ref(props.modelValue);

// v-model binding
watch(
  () => props.modelValue,
  v => (show.value = v)
);
watch(show, v => emit("update:modelValue", v));

const title = computed(() => {
  const d = new Date(props.date);
  return d.toLocaleDateString("de-DE");
});

// filter entries for the day and sort by time ascending
function dayEntries() {
  return props.entries
    .filter(e => e.date.split("T")[0] === props.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// utility: convert datetime -> decimal hours (0..24)
function toHourDecimal(isoDatetime) {
  const d = new Date(isoDatetime);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

// stats computation
function stats(list) {
  const vals = list.map(x => Number(x.bloodSugar)).filter(v => !isNaN(v));
  if (vals.length === 0) {
    return { mean: "-", std: "-", max: "-", min: "-", totalBE: 0 };
  }
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance =
    vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / vals.length;
  const std = Math.sqrt(variance);

  const max = Math.max(...vals);
  const min = Math.min(...vals);

  const totalBE =
    list.reduce((s, e) => s + (Number(e.carbs || 0) / 12 || 0), 0) || 0;

  return {
    mean: mean.toFixed(1),
    std: std.toFixed(1),
    max: max.toFixed(1),
    min: min.toFixed(1),
    totalBE: totalBE.toFixed(1)
  };
}

const computedStats = computed(() => stats(dayEntries()));
const meanValue = computed(() => computedStats.value.mean);
const stdValue = computed(() => computedStats.value.std);
const maxValue = computed(() => computedStats.value.max);
const minValue = computed(() => computedStats.value.min);
const totalBE = computed(() => computedStats.value.totalBE);

const canvas = ref(null);
let chart = null;

function formatHourLabel(val) {
  // val is decimal hours 0..24
  const h = Math.floor(val);
  const m = Math.round((val - h) * 60);
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

async function renderChart() {
  await nextTick();

  if (!canvas.value) return;

  const list = dayEntries();
  // destroy previous chart to avoid issues
  if (chart) {
    try { chart.destroy(); } catch(e){}
    chart = null;
  }

  // Build dataset as points with x = hourDecimal, y = value
  const dataPoints = list.map(l => {
    const x = toHourDecimal(l.date); // 0..24
    const y = l.bloodSugar != null ? Number(l.bloodSugar) : null;
    return { x, y, raw: l }; // keep original for tooltip if needed
  }).filter(p => p.y != null);

  // If there are no numeric values, still clear canvas and return
  if (dataPoints.length === 0) {
    // clear the canvas visually
    const ctx = canvas.value.getContext("2d");
    ctx.clearRect(0,0,canvas.value.width, canvas.value.height);
    return;
  }

  // find max to decide y axis range (200 or 300)
  const maxDataValue = Math.max(...dataPoints.map(d=>d.y));
  const yMax = maxDataValue > 200 ? 300 : 200;

  const targetLow = 80;
  const targetHigh = 140;

  const { default: Chart } = await import("chart.js/auto");

  const bgPlugin = {
    id: "targetBg",
    beforeDraw(chartInstance) {
      const { ctx, scales } = chartInstance;
      const y = scales.y;
      const x = scales.x;
      if (!y || !x) return;

      const yLow = y.getPixelForValue(targetLow);
      const yHigh = y.getPixelForValue(targetHigh);

      ctx.save();
      ctx.fillStyle = "rgba(60,179,113,0.12)";
      ctx.fillRect(x.left, yHigh, x.right - x.left, yLow - yHigh);
      ctx.restore();
    }
  };

  const ctx = canvas.value.getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Blutzucker",
          data: dataPoints, // {x: hour, y: value}
          borderColor: "#1e78b2",
          backgroundColor: "rgba(30,120,178,0.05)",
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#1e78b2",
          fill: false,
          parsing: false // we pass x/y directly
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              // items[0].raw is our point; we can show time nicely
              const p = items[0].raw;
              const h = Math.floor(p.x);
              const m = Math.round((p.x - h) * 60);
              return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
            },
            label: (ctx) => {
              return `${ctx.parsed.y} mg/dl`;
            }
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 24,
          ticks: {
            callback: (v) => formatHourLabel(v),
            stepSize: 3 // shows ticks every 3 hours; Chart.js will adapt if small
          },
          grid: { display: true }
        },
        y: {
          min: 0,
          max: yMax,
          ticks: { stepSize: 20 },
          grid: { display: true }
        }
      }
    },
    plugins: [bgPlugin]
  });

  // small resize after render to avoid blank canvas in some envs
  setTimeout(() => {
    try { chart.resize(); } catch(e){}
  }, 20);
}

// render chart when modal opens or when data/date changes
watch(show, async v => {
  if (v) {
    await nextTick();
    setTimeout(() => renderChart(), 40);
  } else {
    if (chart) {
      try { chart.destroy(); } catch(e){}
      chart = null;
    }
  }
});

watch(
  () => props.entries,
  () => {
    if (show.value) renderChart();
  },
  { deep: true }
);

watch(
  () => props.date,
  () => {
    if (show.value) renderChart();
  }
);

function close() {
  show.value = false;
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal {
  width: min(1100px, 95%);
  max-height: 92vh;
  background: white;
  border-radius: 14px;
  overflow: auto;
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.45);
}
.modal-header {
  background: linear-gradient(180deg, #4a7cb2, #1e5f8b);
  padding: 18px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  font-size: 22px;
  font-weight: 600;
}
.close {
  background: transparent;
  border: none;
  color: white;
  font-size: 26px;
  cursor: pointer;
  padding: 0;
}
.modal-body {
  padding: 18px;
  display: grid;
  grid-template-columns: 1fr 330px;
  gap: 18px;
}
.chart-area {
  height: 420px;
  background: white;
  border-radius: 10px;
  padding: 10px;
  border: 1px solid #ececec;
}
.stats {
  background: white;
  border-radius: 10px;
  padding: 18px;
  border: 1px solid #ececec;
}
.stats h3 {
  margin-top: 0;
  font-size: 20px;
}
.stats dl div {
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
}
/* wichtig: Einheiten nicht umbrechen */
.nowrap {
  white-space: nowrap;
}
</style>

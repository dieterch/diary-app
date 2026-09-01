<template>
  <div class="chart-wrap">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({ entries: { type: Array, default: () => [] } })
const { bandColors, thresholds } = useGlucoseBands()
const canvas = ref(null)
let chart = null

function categories(entries) {
  const limits = thresholds.value
  const buckets = {
    [`<${limits.verylow}`]: 0,
    [`${limits.verylow}-${limits.low - 1}`]: 0,
    [`${limits.low}-${limits.high}`]: 0,
    [`${limits.high + 1}-${limits.veryhigh}`]: 0,
    [`>${limits.veryhigh}`]: 0
  }
  for (const e of entries) {
    if (e.bloodSugar == null) continue
    const v = Number(e.bloodSugar)
    if (v < limits.verylow) buckets[`<${limits.verylow}`]++
    else if (v < limits.low) buckets[`${limits.verylow}-${limits.low - 1}`]++
    else if (v <= limits.high) buckets[`${limits.low}-${limits.high}`]++
    else if (v <= limits.veryhigh) buckets[`${limits.high + 1}-${limits.veryhigh}`]++
    else buckets[`>${limits.veryhigh}`]++
  }
  return buckets
}

async function renderChart() {
  if (!canvas.value) return
  const { default: Chart } = await import('chart.js/auto')
  const b = categories(props.entries)
  const labels = Object.keys(b)
  const data = labels.map(l => b[l])
  if (chart) chart.destroy()
  chart = new Chart(canvas.value.getContext('2d'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          bandColors.value.verylow,
          bandColors.value.low,
          bandColors.value.target,
          bandColors.value.high,
          bandColors.value.veryhigh
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  })
}

onMounted(renderChart)
watch(() => props.entries, () => renderChart(), { deep: true })
</script>

<style scoped>
.chart-wrap { height: 620px; background: white; padding: 18px; border-radius: 6px; }
</style>

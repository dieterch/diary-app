<template>
  <div class="chart-wrap">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({ entries: { type: Array, default: () => [] } })
const canvas = ref(null)
let chart = null

function categories(entries) {
  const buckets = {
    '<40': 0,
    '40-79': 0,
    '80-140': 0,
    '141-210': 0,
    '>210': 0
  }
  for (const e of entries) {
    if (e.bloodSugar == null) continue
    const v = Number(e.bloodSugar)
    if (v < 40) buckets['<40']++
    else if (v < 80) buckets['40-79']++
    else if (v <= 140) buckets['80-140']++
    else if (v <= 210) buckets['141-210']++
    else buckets['>210']++
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
        backgroundColor: ['#d9534f','#f0ad4e','#49a94f','#09a7c6','#6a0dad']
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

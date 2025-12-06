<template>
  <div class="chart-wrap">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  entries: { type: Array, default: () => [] },
  targetLow: { type: Number, default: 80 },
  targetHigh: { type: Number, default: 140 }
})

const canvas = ref(null)
let chart = null

function preparePoints(entries) {
  // convert date -> hour decimals, keep value
  const pts = []
  for (const e of entries) {
    if (e.bloodSugar == null) continue
    const d = new Date(e.date)
    const x = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
    pts.push({ x, y: Number(e.bloodSugar) })
  }
  return pts
}

async function renderChart() {
  if (!canvas.value) return
  const { default: Chart } = await import('chart.js/auto')

  const pts = preparePoints(props.entries)

  const bgPlugin = {
    id: 'targetBackground',
    beforeDraw: (chartInstance) => {
      const ctx = chartInstance.ctx
      const yScale = chartInstance.scales['y']
      const xScale = chartInstance.scales['x']
      if (!yScale || !xScale) return
      const yLow = yScale.getPixelForValue(props.targetLow)
      const yHigh = yScale.getPixelForValue(props.targetHigh)
      ctx.save()
      ctx.fillStyle = 'rgba(60,179,113,0.12)'
      ctx.fillRect(xScale.left, yHigh, xScale.right - xScale.left, yLow - yHigh)
      ctx.restore()
    }
  }

  if (chart) chart.destroy()
  chart = new Chart(canvas.value.getContext('2d'), {
    type: 'scatter',
    data: { datasets: [{ label: 'Messwerte', data: pts, pointRadius: 3, pointBackgroundColor: '#1e78b2' }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          min: 0, max: 23,
          ticks: { callback: v => (v|0).toString().padStart(2,'0') + ':00' }
        },
        y: { beginAtZero: false }
      },
      plugins: { legend: { display: false } }
    },
    plugins: [bgPlugin]
  })
}

onMounted(renderChart)
watch(() => props.entries, () => renderChart(), { deep: true })
</script>

<style scoped>
.chart-wrap { height: 620px; background: white; padding: 18px; border-radius: 6px; }
</style>

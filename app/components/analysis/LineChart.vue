<template>
  <div class="chart-wrap">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  entries: { type: Array, default: () => [] },
  targetLow: { type: Number, default: 80 },
  targetHigh: { type: Number, default: 140 }
})

const canvas = ref(null)
let chart = null

function prepareData(entries) {
  // group by yyyy-mm-dd -> average bloodSugar
  const byDay = {}
  for (const e of entries) {
    if (e.bloodSugar == null) continue
    const d = e.date.split('T')[0]
    ;(byDay[d] ??= []).push(Number(e.bloodSugar))
  }
  const labels = Object.keys(byDay).sort((a,b)=> new Date(a)-new Date(b))
  const data = labels.map(l => {
    const arr = byDay[l]
    const sum = arr.reduce((s,x)=>s+x,0)
    return Math.round((sum/arr.length) * 10) / 10
  })
  return { labels, data }
}

async function renderChart() {
  if (!canvas.value) return
  const { default: Chart } = await import('chart.js/auto')

  const { labels, data } = prepareData(props.entries)

  const backgroundPlugin = {
    id: 'targetBackground',
    beforeDraw: (chartInstance) => {
      const ctx = chartInstance.ctx
      const yScale = chartInstance.scales['y']
      const xScale = chartInstance.scales['x']
      if (!yScale || !xScale) return
      const yLow = yScale.getPixelForValue(props.targetLow)
      const yHigh = yScale.getPixelForValue(props.targetHigh)
      ctx.save()
      ctx.fillStyle = 'rgba(60,179,113,0.12)' // pale green
      ctx.fillRect(xScale.left, yHigh, xScale.right - xScale.left, yLow - yHigh)
      ctx.restore()
    }
  }

  if (chart) chart.destroy()

  chart = new Chart(canvas.value.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Ø Blutzucker',
        data,
        borderColor: '#1e78b2',
        backgroundColor: 'rgba(30,120,178,0.08)',
        fill: false,
        tension: 0.15,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#1e78b2'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
      plugins: { legend: { display: false } }
    },
    plugins: [backgroundPlugin]
  })
}

onMounted(() => renderChart())
watch(() => props.entries, () => renderChart(), { deep: true })
</script>

<style scoped>
.chart-wrap { height: 620px; background: white; padding: 18px; border-radius: 6px; }
</style>

<template>
  <transition name="fade">
    <div v-if="modelValue" class="overlay" @click.self="close">
      <transition name="popup">
        <div class="dialog">
          
          <h2 class="title">
            {{ isNew ? "Neuer Eintrag" : "Eintrag bearbeiten" }}
          </h2>

          <div class="form">

            <!-- Datum & Uhrzeit -->
            <label>Datum & Uhrzeit</label>
            <input type="datetime-local" v-model="local.date">

            <label>Zucker (mg/dl)</label>
            <input type="number" v-model.number="local.bloodSugar">

            <label>Blutdruck</label>
            <div class="row2">
              <input type="number" placeholder="Systolisch" v-model.number="local.systolic">
              <input type="number" placeholder="Diastolisch" v-model.number="local.diastolic">
            </div>

            <label>Puls</label>
            <input type="number" v-model.number="local.pulse">

            <label>Gewicht (kg)</label>
            <input type="number" step="0.1" v-model.number="local.weight">

            <label>Sport (Minuten)</label>
            <input type="number" v-model.number="local.sportMinutes">

            <label>Notiz</label>
            <textarea rows="3" v-model="local.note"></textarea>

          </div>

          <div class="buttons">
            <button class="cancel" @click="close">Abbrechen</button>

            <button class="delete" v-if="!isNew" @click="remove">
              Löschen
            </button>

            <button class="save" @click="save">
              Speichern
            </button>
          </div>

        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  entry: Object
})
const emit = defineEmits(["update:modelValue", "saved"])

const isNew = computed(() => !props.entry?.id)

const local = reactive({})

/* ⭐ FIX: Datum korrekt übernehmen 
function toLocalInput(dt) {
  const d = new Date(dt)
  const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
  return localISO
} 

function toLocalInput(dt) {
  return new Date(dt).toISOString().slice(0, 16)
}. */

function toLocalInput(utc) {
  const d = new Date(utc)
  const pad = (n) => String(n).padStart(2, "0")

  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes())
  )
}

/*
function localInputToUTC(localStr) {
  // localStr: "2025-02-03T10:30"
  const d = new Date(localStr)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()
} */

function localInputToUTC(localStr) {
  return new Date(localStr).toISOString()
}

watch(() => props.entry, (v) => {
  if (v) {
    Object.assign(local, {
      id: v.id,
      date: toLocalInput(v.date),
      bloodSugar: v.bloodSugar,
      systolic: v.systolic,
      diastolic: v.diastolic,
      pulse: v.pulse,
      weight: v.weight,
      sportMinutes: v.sportMinutes,
      note: v.note ?? ""
    })
  } else {
    Object.assign(local, {
      date: toLocalInput(new Date()),
      bloodSugar: null,
      systolic: null,
      diastolic: null,
      pulse: null,
      weight: null,
      sportMinutes: null,
      note: ""
    })
  }
}, { immediate: true })


function close() {
  emit("update:modelValue", false)
}

/* +1h Bug !!!!
async function save() {
  const url = isNew.value ? "/api/entries/add" : "/api/entries/update"

  await $fetch(url, {
    method: isNew.value ? "POST" : "PUT",
    body: local
  })

  emit("saved")
  close()
} */

async function save() {
  const url = isNew.value ? "/api/entries/add" : "/api/entries/update"

  const payload = {
    ...local,
    date: localInputToUTC(local.date), // ⭐ FIX
  }

  await $fetch(url, {
    method: isNew.value ? "POST" : "PUT",
    body: payload
  })

  emit("saved")
  close()
}



async function remove() {
  if (!confirm("Wirklich löschen?")) return

  await $fetch(`/api/entries/delete?id=${local.id}`, {
    method: "DELETE"
  })

  emit("saved")
  close()
}
</script>

<style scoped>
/* gleiche Styles wie vorher */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(2px);
}
.dialog {
  width: 92%;
  max-width: 480px;
  background: white;
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.25);
}
.title {
  text-align: center;
  margin-bottom: 18px;
  font-size: 22px;
  font-weight: 600;
}
.form label {
  font-weight: 600;
  margin-top: 12px;
  display: block;
}
.form input,
.form textarea {
  width: 95%;
  margin-top: 4px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
}
.row2 {
  display: flex;
  gap: 8px;
}
.buttons {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
}
.cancel { background: #999; color: white; padding: 8px 16px; border-radius: 6px; }
.delete { background: #c0392b; color: white; padding: 8px 16px; border-radius: 6px; }
.save { background: #2e86de; color: white; padding: 8px 16px; border-radius: 6px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.popup-enter-active { animation: popup 0.25s ease; }
.popup-leave-active { animation: popup 0.2s ease reverse; }
@keyframes popup {
  from { transform: scale(0.8); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
</style>

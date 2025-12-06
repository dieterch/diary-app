import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const entry = await prisma.entry.create({
    data: {
      date: body.date ? new Date(body.date) : null,
      note: body.note ?? null,
      bloodSugar: body.bloodSugar ?? null,
      systolic: body.systolic ?? null,
      diastolic: body.diastolic ?? null,
      weight: body.weight ?? null,
      pulse: body.pulse ?? null,
      carbs: body.carbs ?? null,
      insulinBolus: body.insulinBolus ?? null,
      insulinBasal: body.insulinBasal ?? null,
      sportType: body.sportType ?? null,
      sportMinutes: body.sportMinutes ?? null
    }
  })

  return entry
})

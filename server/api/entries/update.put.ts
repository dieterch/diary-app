import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const entry = await prisma.entry.update({
    where: { id: body.id },
    data: {
      date: new Date(body.date),
      bloodSugar: body.bloodSugar,
      systolic: body.systolic,
      diastolic: body.diastolic,
      pulse: body.pulse,
      weight: body.weight,
      sportMinutes: body.sportMinutes,
      insulinBolus: body.insulinBolus,
      note: body.note ?? "",
    }
  })

  return entry
})

import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  await prisma.entry.delete({
    where: { id: Number(id) }
  })

  return { success: true }
})

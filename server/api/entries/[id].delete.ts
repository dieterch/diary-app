import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(event?.context?.params?.id)

  await prisma.entry.delete({
    where: { id }
  })

  return { success: true }
})

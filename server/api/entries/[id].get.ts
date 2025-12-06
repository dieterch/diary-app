import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(event?.context?.params?.id)

  return prisma.entry.findUnique({
    where: { id }
  })
})

import prisma from "../../utils/prisma"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const skip = Number(query.skip ?? 0)
  const take = Number(query.take ?? 100)

  const entries = await prisma.entry.findMany({
    orderBy: { date: "desc" },
    skip,
    take,
  })

  return entries
})

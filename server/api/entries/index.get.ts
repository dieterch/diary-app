import prisma from "../../utils/prisma";

export default defineEventHandler(async () => {
  return prisma.entry.findMany({
    orderBy: { date: "desc" }
  });
});

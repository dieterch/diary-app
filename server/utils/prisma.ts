import pkg from '@prisma/client'
const { PrismaClient } = pkg

// import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({
  url: 'file:./prisma/app.sqlite'
})

export const prisma = new PrismaClient({
  adapter
})

export default prisma

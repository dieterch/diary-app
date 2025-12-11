import { readFileSync } from "fs"
import { defineEventHandler } from "h3"

export default defineEventHandler(() => {
  const json = readFileSync("./server/configuration.json", "utf8")
  return JSON.parse(json)
})

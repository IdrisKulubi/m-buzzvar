import { auth } from "@/lib/auth/better-auth-server"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth.handler)
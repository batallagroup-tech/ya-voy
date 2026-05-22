import { neon } from '@neondatabase/serverless'

const databaseUrl = import.meta.env.VITE_DATABASE_URL

if (!databaseUrl) throw new Error('Falta DATABASE_URL en .env')

// sql: funcion para hacer queries a Neon
// Uso: const result = await sql'SELECT * FROM viveres'
export const sql = neon(databaseUrl)

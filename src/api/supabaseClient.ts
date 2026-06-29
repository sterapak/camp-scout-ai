// src/api/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// pulled from env (works for both Vite and Jest)
const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_KEY

export const supabase = createClient(SUPA_URL, SUPA_KEY)

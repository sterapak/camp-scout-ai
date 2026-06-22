// src/api/supabaseJobsClient.js
import { supabase } from './supabaseClient'

export async function fetchJobs() {
  const { data, error } = await supabase.from('jobs').select('*')
  console.log('[fetchJobs] Data:', data)
  if (error) console.error('[fetchJobs] Error:', error)
  return data || []
}


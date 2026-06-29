// src/api/supabaseJobsClient.ts
import { supabase } from './supabaseClient.js'

export async function fetchJobs() {
  const { data, error } = await supabase.from('jobs').select('*')
  console.log('[fetchJobs] Data:', data)
  if (error) console.error('[fetchJobs] Error:', error)
  return data || []
}

export const supabaseJobsClient = {
  fetchAll: fetchJobs,
  async add(job: unknown) {
    return job
  },
  async remove() {
    // no-op stub
  },
}


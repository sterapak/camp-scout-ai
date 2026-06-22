// src/api/jobsClient.js
import { supabaseJobsClient } from './supabaseJobsClient'
import { prismaJobsClient }    from './prismaJobsClient'

// Choose adapter via env var (default = supabase)
const ADAPTER = process.env.VITE_DB_ADAPTER || 'supabase'

export const jobsClient =
  ADAPTER === 'prisma' ? prismaJobsClient : supabaseJobsClient

// src/api/jobsClient.ts
import { supabaseJobsClient } from './supabaseJobsClient.js'
import { prismaJobsClient } from './prismaJobsClient.js'

// Choose adapter via env var (default = supabase)
const ADAPTER = process.env.VITE_DB_ADAPTER || 'supabase'

export const jobsClient =
  ADAPTER === 'prisma' ? prismaJobsClient : supabaseJobsClient

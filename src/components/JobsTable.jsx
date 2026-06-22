import React, { useEffect, useState } from 'react'
import { fetchJobs } from '../api/supabaseJobsClient'

export default function JobsTable() {
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    const loadJobs = async () => {
      const data = await fetchJobs()
      setJobs(data)
    }

    loadJobs()
  }, [])

  return (
    <div>
      <h3 className="font-bold mb-2">Company Title Status</h3>
      <ul>
        {jobs.map((job) => (
          <li key={job.id}>
            {job.company} - {job.title} ({job.status})
          </li>
        ))}
      </ul>
    </div>
  )
}

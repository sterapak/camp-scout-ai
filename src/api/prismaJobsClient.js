// src/api/prismaJobsClient.js
// This is a placeholder. In a “real” App you’d import your Prisma client.
export const prismaJobsClient = {
  async fetchAll() {
    // Example: return await prisma.job.findMany({ orderBy: { createdAt: 'desc' } })
    return []  // no-op stub
  },
  async add(job) {
    // Example: return await prisma.job.create({ data: job })
    return job
  },
  async remove() {
    // Example: await prisma.job.delete({ where: { id } })
  },
}

// Shared job store for analysis tasks
// In production, this should be replaced with Redis or Vercel KV

export interface JobStatus {
  status: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  data?: any;
  error?: string;
  progress?: string;
  startTime: number;
}

// Global job store - in memory for development
const jobStore = new Map<string, JobStatus>();

export const JobStore = {
  set: (jobId: string, job: JobStatus) => jobStore.set(jobId, job),
  get: (jobId: string) => jobStore.get(jobId),
  delete: (jobId: string) => jobStore.delete(jobId),
  has: (jobId: string) => jobStore.has(jobId),
  size: () => jobStore.size,
};

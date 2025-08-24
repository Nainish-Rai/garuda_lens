import { NextRequest, NextResponse } from "next/server";
import { JobStore } from "@/lib/job-store";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const job = JobStore.get(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Calculate elapsed time
    const elapsedTime = Date.now() - job.startTime;

    // Clean up completed/failed jobs after 30 minutes
    if (
      (job.status === "COMPLETE" || job.status === "FAILED") &&
      elapsedTime > 30 * 60 * 1000
    ) {
      JobStore.delete(jobId);
      return NextResponse.json({ error: "Job expired" }, { status: 410 });
    }

    const response = {
      jobId,
      status: job.status,
      progress: job.progress,
      elapsedTime,
      ...(job.status === "COMPLETE" && job.data && { data: job.data }),
      ...(job.status === "FAILED" && job.error && { error: job.error }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check job status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

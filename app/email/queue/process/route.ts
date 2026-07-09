import {
  authorizeQueueRequest,
  processEmailQueue,
} from "@/lib/email/queue-processor";

export async function GET(request: Request) {
  if (!authorizeQueueRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return processEmailQueue();
}

export async function POST(request: Request) {
  if (!authorizeQueueRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return processEmailQueue();
}
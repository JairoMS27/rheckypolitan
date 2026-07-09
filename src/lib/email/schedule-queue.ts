import { after } from "next/server";
import { processEmailQueue } from "@/lib/email/queue-processor";

type ScheduleOptions = {
  /** Process multiple batches until the queue is empty or rate-limited */
  drain?: boolean;
  maxRounds?: number;
};

async function runQueueRound(): Promise<boolean> {
  const response = await processEmailQueue();
  if (!response.ok) return false;

  const body = (await response.json()) as {
    processed?: number;
    skipped?: boolean;
    stopped?: string;
  };

  if (body.skipped || body.stopped) return false;
  return (body.processed ?? 0) > 0;
}

export function scheduleEmailQueueProcessing(
  options: ScheduleOptions = {},
): void {
  const { drain = false, maxRounds = drain ? 100 : 1 } = options;

  after(async () => {
    try {
      for (let round = 0; round < maxRounds; round++) {
        const hasMore = await runQueueRound();
        if (!hasMore || !drain) break;
      }
    } catch (error) {
      console.error("Background email queue processing failed", error);
    }
  });
}
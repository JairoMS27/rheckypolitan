/** Shared analytics dashboard types (client-safe). */

export type AnalyticsSummary = {
  totalHits: number;
  uniqueVisitors: number;
  hitsLast7Days: number;
  hitsLast30Days: number;
  topPaths: { path: string; count: number }[];
  recent: {
    id: string;
    visitor_id: string;
    path: string;
    referrer: string | null;
    created_at: string;
  }[];
};

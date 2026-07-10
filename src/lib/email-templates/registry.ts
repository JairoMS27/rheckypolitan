import type { ComponentType } from "react";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

import { template as newsletterConfirmation } from "./newsletter-confirmation";
import { template as newIssueAnnouncement } from "./new-issue-announcement";
import { template as followedAuthorPost } from "./followed-author-post";

export const TEMPLATES: Record<string, TemplateEntry> = {
  "newsletter-confirmation": newsletterConfirmation,
  "new-issue-announcement": newIssueAnnouncement,
  "followed-author-post": followedAuthorPost,
};

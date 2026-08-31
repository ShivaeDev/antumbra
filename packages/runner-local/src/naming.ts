import { createHash } from "node:crypto";

export const mirrorName = (slug: string, source: string): string => `${slug}-${createHash("sha256").update(source).digest("hex").slice(0, 8)}.git`;

export const workBranch = (agentId: string, slug: string): string => `work/${agentId.slice(0, 8)}/${slug}`;

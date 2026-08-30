import { createHash } from "node:crypto";

// why: a slug is unique among registered repositories but not across time — a
// forgotten source's mirror can still sit on disk when a new source takes its
// name, so the mirror carries a source hash and the two never collide.
export const mirrorName = (slug: string, source: string): string => `${slug}-${createHash("sha256").update(source).digest("hex").slice(0, 8)}.git`;

export const workBranch = (agentId: string, slug: string): string => `work/${agentId.slice(0, 8)}/${slug}`;

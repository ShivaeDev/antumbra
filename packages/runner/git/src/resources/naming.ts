export const workBranch = (agentId: string, slug: string): string => `work/${agentId.slice(0, 8)}/${slug}`;

export const workBranch = (agentId: string, slug: string): string => `work/${agentId}/${slug}`;

export const namesResources = (agentId: string): boolean => /^[0-9a-z]+$/.test(agentId);

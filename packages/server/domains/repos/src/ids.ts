import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const RepoId = Id.brand("RepoId");
export type RepoId = typeof RepoId.Type;

export const repoReferenceId = (rulingId: string, repoId: RepoId): string => `${rulingId}/repo/${repoId}`;

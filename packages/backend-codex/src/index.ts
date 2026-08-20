// why: the tree is the half of this backend that runs without a provider
// process. The composition root drives it over a scripted notification script —
// the frames codex broadcasts for a session and for every thread it delegated
// to — so the whole acquisition path (tree rows, journals, gaps) is held to a
// real provider shape at zero model tokens.
export type { RpcNotification } from "#adapters/rpc.ts";
export { codexPlugin } from "#plugin.ts";
export { censusEvents, censusUnreadable } from "#thread-census.ts";
export { openThreadClaims, type ThreadClaims } from "#thread-claims.ts";
export { threadOpened } from "#thread-open.ts";
export type { CensusSweep, SpawnedChild } from "#thread-sweep.ts";
export { openThreadTree, type ThreadTree } from "#thread-tree.ts";

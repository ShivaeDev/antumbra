import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { keysOf } from "@antumbra/server-journal/live.ts";
import type { ListKey } from "@shivaedev/changes/keys.ts";

export const watchKeys = (reads: readonly RowShape[], scope: string | undefined): readonly ListKey[] =>
	keysOf(reads, scope).map((collection) => ({ _tag: "List", collection }));

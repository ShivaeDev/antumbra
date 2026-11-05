import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { type Key, readKeys } from "@shivaedev/changes/keys.ts";

export const watchKeys = (reads: readonly RowShape[], scope: string | undefined): readonly Key[] =>
	reads.map((row) =>
		scope !== undefined && row.scope !== undefined
			? { _tag: "Bucket", collection: row.name, field: row.scope, value: scope }
			: { _tag: "List", collection: row.name },
	);

export const keysOf = (reads: readonly RowShape[], scope: string | undefined): readonly string[] => readKeys(watchKeys(reads, scope));

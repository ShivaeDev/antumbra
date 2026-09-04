import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingSupersedeInput } from "#retirement.ts";

export const markSuperseded = (rulingId: string, successor: Pick<RulingSupersedeInput, "by" | "byRulingId">, at: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Ruling.where({ id: rulingId }).update({
			supersededAt: at,
			supersededBy: successor.by,
			supersededById: successor.byRulingId,
		});
	});

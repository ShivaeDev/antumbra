import type * as Source from "@antumbra/domain-rulings/queries/display.ts";
import { openOrder } from "@antumbra/domain-rulings/queries/order.ts";
import { type RulingDisplay, rulingDisplay } from "@antumbra/domain-rulings/rows/display.ts";
import { selection as rulingDisplaySelection } from "@antumbra/server-storage/records/ruling-display.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

const Group = Schema.Struct({ id: Schema.String, name: Schema.String, rulings: Schema.Array(rulingDisplay.Row) });
const grouped = (rulings: readonly RulingDisplay[]): readonly (typeof Group.Type)[] => {
	const groups = new Map<string, { id: string; name: string; rulings: RulingDisplay[] }>();
	for (const ruling of rulings) {
		const id = ruling.voyage?.id ?? "fleet";
		const name = ruling.voyage?.name ?? "Fleet";
		const group = groups.get(id) ?? { id, name, rulings: [] };
		group.rulings.push(ruling);
		groups.set(id, group);
	}
	return [...groups.values()];
};
export const display = Effect.fn("rulings.display")(function* (
	_input: Schema.Struct.Type<typeof Source.display.input>,
): Effect.fn.Return<typeof Source.display.output.Type, never, Records> {
	const rows = yield* Records;

	const all = yield* rows.rulingDisplay
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingDisplaySelection })
		.pipe(Effect.orDie);
	const open = all.filter((ruling) => ruling.answer === null).sort(openOrder);
	return {
		groups: grouped(open.filter((ruling) => ruling.parked === null)),
		parked: open.filter((ruling) => ruling.parked !== null),
		openCount: open.length,
		standing: all
			.filter((ruling) => ruling.answer !== null && ruling.supersession === null && ruling.withdrawal === null)
			.sort((a, b) => (b.answer?.at ?? "").localeCompare(a.answer?.at ?? "")),
	};
});

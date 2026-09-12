import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { openOrder } from "#queries/order.ts";
import { type RulingDisplay, rulingDisplay } from "#rows/display.ts";

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
export const display = query("display", {
	input: {},
	output: Schema.Struct({
		groups: Schema.Array(Group),
		parked: Schema.Array(rulingDisplay.Row),
		openCount: Schema.Number,
		standing: Schema.Array(rulingDisplay.Row),
	}),
	reads: [rulingDisplay],
	run: Effect.fn("rulings.display")(function* (_input, rows) {
		const all = yield* rows.rulingDisplay.where({});
		const open = all.filter((ruling) => ruling.answer === null).sort(openOrder);
		return {
			groups: grouped(open.filter((ruling) => ruling.parked === null)),
			parked: open.filter((ruling) => ruling.parked !== null),
			openCount: open.length,
			standing: all
				.filter((ruling) => ruling.answer !== null && ruling.supersession === null && ruling.withdrawal === null)
				.sort((a, b) => (b.answer?.at ?? "").localeCompare(a.answer?.at ?? "")),
		};
	}),
});

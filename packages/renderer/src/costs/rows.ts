import type { CostsView, UsageTotal } from "@antumbra/contract";

export type RowTone = "absent" | "mono" | "name";

export interface SpendRow {
	readonly key: string;
	readonly name: string;
	readonly tone: RowTone;
	readonly total: UsageTotal;
}

const bySpend = (left: SpendRow, right: SpendRow): number => {
	if (left.total.costUsd !== null && right.total.costUsd !== null) {
		return right.total.costUsd - left.total.costUsd;
	}
	if (left.total.costUsd === right.total.costUsd) {
		return right.total.turns - left.total.turns;
	}
	return left.total.costUsd === null ? 1 : -1;
};

export const voyageRows = (costs: CostsView): ReadonlyArray<SpendRow> =>
	[
		...costs.voyages.map((spent) => ({ key: spent.voyageId, name: spent.name, tone: "name" as const, total: spent.total })),
		...(costs.unassigned.turns === 0 ? [] : [{ key: "", name: "No voyage", tone: "absent" as const, total: costs.unassigned }]),
	].toSorted(bySpend);

const modelRow = (model: string | null, total: UsageTotal): SpendRow =>
	model === null ? { key: "", name: "not reported", tone: "absent", total } : { key: model, name: model, tone: "mono", total };

export const modelRows = (costs: CostsView): ReadonlyArray<SpendRow> =>
	costs.models.map((spent) => modelRow(spent.model, spent.total)).toSorted(bySpend);

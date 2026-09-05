import { costCell, costReported, costTitle, exactTokens } from "#costs/format.ts";
import type { RowTone, SpendRow } from "#costs/rows.ts";
import { cn } from "#lib/utils.ts";

const HEADS = ["Turns", "Input", "Cache read", "Cache write", "Output", "Cost"] as const;

const TONE: Readonly<Record<RowTone, string | undefined>> = {
	absent: "text-muted-foreground",
	mono: "font-mono",
	name: undefined,
};

const NUMBER = "py-1 pl-3 text-right";

const Head = ({ lead }: { readonly lead: string }) => (
	<thead className="text-muted-foreground">
		<tr>
			<th className="py-1 pr-3 text-left font-normal">{lead}</th>
			{HEADS.map((head) => (
				<th className={cn(NUMBER, "font-normal whitespace-nowrap")} key={head}>
					{head}
				</th>
			))}
		</tr>
	</thead>
);

const Row = ({ row }: { readonly row: SpendRow }) => (
	<tr className="border-border border-t">
		<td className={cn("py-1 pr-3", TONE[row.tone])}>{row.name}</td>
		<td className={NUMBER}>{exactTokens(row.total.turns)}</td>
		<td className={NUMBER}>{exactTokens(row.total.inputTokens)}</td>
		<td className={NUMBER}>{exactTokens(row.total.cacheReadTokens)}</td>
		<td className={NUMBER}>{exactTokens(row.total.cacheWriteTokens)}</td>
		<td className={NUMBER}>{exactTokens(row.total.outputTokens)}</td>
		<td className={cn(NUMBER, costReported(row.total) ? undefined : "text-muted-foreground")} title={costTitle(row.total)}>
			{costCell(row.total)}
		</td>
	</tr>
);

export const SpendTable = ({
	heading,
	lead,
	rows,
	span,
}: {
	readonly heading: string;
	readonly lead: string;
	readonly rows: ReadonlyArray<SpendRow>;
	readonly span: string;
}) => (
	<section aria-label={heading} className="flex min-w-0 flex-col gap-2">
		<div className="flex min-w-0 items-baseline gap-2">
			<h3 className="text-sm">{heading}</h3>
			<span className="text-2xs text-muted-foreground">{span}</span>
		</div>
		<div className="min-w-0 overflow-x-auto">
			<table className="w-full text-2xs tabular-nums">
				<Head lead={lead} />
				<tbody>
					{rows.map((row) => (
						<Row key={`${row.tone}-${row.key}`} row={row} />
					))}
				</tbody>
			</table>
		</div>
	</section>
);

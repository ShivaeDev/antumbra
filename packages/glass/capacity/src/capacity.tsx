import type { capacity } from "@antumbra/domain-capacity/feature.ts";
import type { capacity as capacityRow } from "@antumbra/domain-capacity/rows/capacity.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { CommandAct } from "@antumbra/glass-components/act.tsx";

type CapacityApi = Glass<readonly [typeof capacity]>["api"];

const evidence = (row: typeof capacityRow.Row.Type): string =>
	[
		row.reason?.replaceAll("-", " "),
		row.utilization === null ? null : `${Math.round(row.utilization * 100)}% used`,
		row.resetsAt === null ? null : `resets ${new Date(row.resetsAt).toLocaleString()}`,
	]
		.filter((part) => part !== null && part !== undefined)
		.join(" · ");

const ProviderCapacity = (props: { readonly api: CapacityApi; readonly row: typeof capacityRow.Row.Type }) => (
	<section className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
		<div className="flex items-center gap-2">
			<span>{props.row.backend}</span>
			<span>{props.row.status === "blocked" ? "Provider paused" : "Provider limit warning"}</span>
			{props.row.status === "blocked" ? (
				<CommandAct command={props.api.capacity.release} input={{ backend: props.row.backend }} label="Retry provider" />
			) : null}
		</div>
		{props.row.detail === null ? null : <p>{props.row.detail}</p>}
		<p>{evidence(props.row)}</p>
		<p>
			{props.row.status === "blocked"
				? "Waiting work stays parked until you retry this provider."
				: "Work continues; this warning does not pause the provider."}
		</p>
	</section>
);

export const ProviderCapacities = (props: { readonly api: CapacityApi }) => (
	<Live input={{}} query={props.api.capacity.providers} waiting="Reading provider capacity…">
		{(rows) => rows.filter((row) => row.status !== "available").map((row) => <ProviderCapacity key={row.backend} api={props.api} row={row} />)}
	</Live>
);

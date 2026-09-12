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

export const ProviderCapacities = (props: { readonly api: CapacityApi }) => (
	<Live input={{}} query={props.api.capacity.providers} waiting="Reading provider capacity…">
		{(rows) =>
			rows
				.filter((row) => row.status !== "available")
				.map((row) => (
					<section key={row.backend} className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
						<div className="flex items-center gap-2">
							<span>{row.backend}</span>
							<span>{row.status === "blocked" ? "Provider paused" : "Provider limit warning"}</span>
							{row.status === "blocked" ? (
								<CommandAct command={props.api.capacity.release} input={{ backend: row.backend }} label="Retry provider" />
							) : null}
						</div>
						{row.detail === null ? null : <p>{row.detail}</p>}
						<p>{evidence(row)}</p>
						<p>
							{row.status === "blocked"
								? "Waiting work stays parked until you retry this provider."
								: "Work continues; this warning does not pause the provider."}
						</p>
					</section>
				))
		}
	</Live>
);

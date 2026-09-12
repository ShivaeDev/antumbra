import { Live } from "@antumbra/glass-client/live.tsx";
import { CommandAct } from "@antumbra/glass-components/act.tsx";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import { AdoptChangeDialog } from "#adopt-change-dialog.tsx";
import { AdoptionRequests } from "#adoption-requests.tsx";
import type { ChangesApi } from "#glass.ts";
import { whenLabel } from "#time.ts";
export const QuayHeader = ({ api, sightedAt }: { readonly api: ChangesApi; readonly sightedAt: string | null }) => (
	<header className="flex flex-col gap-2 border-b border-border px-4 py-3">
		<div className="flex flex-wrap items-start gap-3">
			<div>
				<h2 className="text-base">The quay</h2>
				{sightedAt === null ? null : <span className="text-2xs text-muted-foreground">sighted {whenLabel(sightedAt)}</span>}
				<p className="text-2xs text-muted-foreground">Pull requests waiting on review, checks or merge.</p>
			</div>
			<div className="ml-auto flex gap-2">
				<AdoptChangeDialog api={api} />
				<CommandAct command={api.changes.refresh} input={{}} label="Refresh" />
			</div>
		</div>
		<Live query={api.changes.hostCapabilities} input={{}}>
			{(hosts) =>
				hosts.length === 0 ? (
					<span className="text-2xs text-muted-foreground">No change host is registered</span>
				) : (
					<div className="flex flex-wrap gap-3">
						{hosts.map((host) => (
							<div className="flex items-center gap-1.5" key={host.host}>
								<Badge variant={host.available ? "outline" : "warning"}>{host.host}</Badge>
								<span className="text-2xs text-muted-foreground">{host.detail}</span>
							</div>
						))}
					</div>
				)
			}
		</Live>
		<AdoptionRequests api={api} />
	</header>
);

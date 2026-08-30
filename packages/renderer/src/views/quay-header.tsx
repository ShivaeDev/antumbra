import type { HostCapabilityView, QuayView } from "@antumbra/contract";
import { refreshChanges } from "#adapters/trpc-quay.ts";
import { Badge } from "#components/ui/badge.tsx";
import { Button } from "#components/ui/button.tsx";
import { useCall } from "#hooks/call.ts";
import { lastSight } from "#quay/groups.ts";
import { AdoptChangeDialog } from "#views/adopt-change-dialog.tsx";
import { whenLabel } from "#voyages/labels.ts";

// why: a host that cannot act says so in its own words — signed in as whom, or
// what to run — so the reason a change cannot be adopted is read before the
// attempt rather than after it.
const HostLine = ({ host }: { readonly host: HostCapabilityView }) => (
	<div className="flex min-w-0 items-center gap-1.5">
		<Badge variant={host.available ? "outline" : "warning"}>{host.tag}</Badge>
		<span className="min-w-0 truncate text-2xs text-muted-foreground">{host.detail}</span>
	</div>
);

const HeaderTitle = ({ sighted }: { readonly sighted: string | undefined }) => (
	<div>
		<div className="flex items-baseline gap-2">
			<h2 className="text-base">The quay</h2>
			{sighted === undefined ? null : <span className="text-2xs text-muted-foreground">sighted {whenLabel(sighted)}</span>}
		</div>
		<p className="text-2xs text-muted-foreground">Pull requests waiting on review, checks or merge.</p>
	</div>
);

export const QuayHeader = ({ onError, view }: { readonly onError: (message: string) => void; readonly view: QuayView }) => {
	const asking = useCall<void>();
	const sighted = lastSight(view);
	// why: the button rings the watcher; what a pass costs stays the cadence's
	// decision, so it settles as soon as the ring lands, not when news arrives.
	const ring = () => {
		asking.run((onDone) => refreshChanges(onDone, onError));
	};
	return (
		<header className="flex flex-col gap-2 border-border border-b px-4 py-3">
			<div className="flex flex-wrap items-start gap-x-3 gap-y-1">
				<HeaderTitle sighted={sighted} />
				<div className="ml-auto flex items-center gap-1.5">
					<AdoptChangeDialog pieces={view.pieces} />
					<Button disabled={asking.state._tag === "pending"} onClick={ring} size="sm" variant="outline">
						{asking.state._tag === "pending" ? "Asking…" : "Refresh"}
					</Button>
				</div>
			</div>
			{view.hosts.length === 0 ? (
				<span className="text-2xs text-muted-foreground">No change host is registered</span>
			) : (
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
					{view.hosts.map((host) => (
						<HostLine host={host} key={host.tag} />
					))}
				</div>
			)}
		</header>
	);
};

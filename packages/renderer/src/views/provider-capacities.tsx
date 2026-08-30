import type { BackendCapacitySummary } from "@antumbra/contract";
import { retryBackend } from "#adapters/trpc.ts";
import { Badge } from "#components/ui/badge.tsx";
import { Button } from "#components/ui/button.tsx";

const percentage = (utilization: number | null): string | undefined =>
	utilization === null ? undefined : `${Math.round(utilization * 100)}% used`;

const resetWords = (resetsAt: number | null): string | undefined =>
	resetsAt === null
		? undefined
		: `resets ${new Date(resetsAt).toLocaleString()}`;

const evidence = (capacity: BackendCapacitySummary): string =>
	[
		capacity.reason?.replaceAll("-", " "),
		percentage(capacity.utilization),
		resetWords(capacity.resetsAt),
	]
		.filter((word): word is string => word !== null && word !== undefined)
		.join(" · ");

const ProviderCapacity = ({
	capacity,
	onError,
}: {
	readonly capacity: BackendCapacitySummary;
	readonly onError: (message: string) => void;
}) => {
	const blocked = capacity.status === "blocked";
	const facts = evidence(capacity);
	return (
		<div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<Badge variant="warning">{capacity.backend}</Badge>
				<span className="min-w-0 flex-1 font-medium text-warning">
					{blocked ? "Provider paused" : "Provider limit warning"}
				</span>
				{blocked ? (
					<Button
						onClick={() => retryBackend(capacity.backend, onError)}
						size="sm"
						variant="outline"
					>
						Retry provider
					</Button>
				) : null}
			</div>
			{capacity.detail === null ? null : (
				<p className="wrap-anywhere text-foreground">{capacity.detail}</p>
			)}
			{facts === "" ? null : <p className="text-muted-foreground">{facts}</p>}
			<p className="text-muted-foreground">
				{blocked
					? "Waiting work stays parked until you retry this provider."
					: "Work continues; this warning does not pause the provider."}
			</p>
		</div>
	);
};

export const ProviderCapacities = ({
	capacities,
	onError,
}: {
	readonly capacities: ReadonlyArray<BackendCapacitySummary>;
	readonly onError: (message: string) => void;
}) => {
	const limited = capacities.filter(
		(capacity) => capacity.status !== "available",
	);
	return limited.length === 0 ? null : (
		<div className="flex min-w-0 shrink-0 flex-col gap-2 px-4 pt-4">
			{limited.map((capacity) => (
				<ProviderCapacity
					capacity={capacity}
					key={capacity.backend}
					onError={onError}
				/>
			))}
		</div>
	);
};

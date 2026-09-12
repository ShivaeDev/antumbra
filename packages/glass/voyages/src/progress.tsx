import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import type { VoyagesApi } from "#glass.ts";

export const VoyageState = (props: { readonly api: VoyagesApi; readonly voyageId: string }) => (
	<Live input={{ id: VoyageId.make(props.voyageId) }} query={props.api.voyages.progress}>
		{(progress) =>
			progress === null ? null : (
				<Badge variant={progress.state === "quiet" ? "outline" : "success"}>{progress.state === "quiet" ? "Quiet" : "Under way"}</Badge>
			)
		}
	</Live>
);

export const VoyageProgress = (props: { readonly api: VoyagesApi; readonly voyageId: string; readonly withLegend?: boolean }) => (
	<Live input={{ id: VoyageId.make(props.voyageId) }} query={props.api.voyages.progress}>
		{(progress) => (progress === null ? null : <ProgressBar progress={progress} withLegend={props.withLegend} />)}
	</Live>
);

const ProgressBar = (props: {
	readonly progress: typeof import("@antumbra/domain-voyages/rows/voyage-progress.ts").voyageProgress.Row.Type;
	readonly withLegend?: boolean | undefined;
}) => {
	const progress = props.progress;
	if (progress.total === 0) return <p className="text-2xs text-muted-foreground">Nothing chartered yet</p>;
	const slices = [
		{ name: "landed", count: progress.counts.done, color: "bg-muted-foreground" },
		{ name: "active", count: progress.counts.active, color: "bg-success" },
		{ name: "ready", count: progress.counts.ready, color: "bg-info" },
	];
	const legend = props.withLegend ? slices.filter((slice) => slice.name !== "landed" && slice.count > 0) : [];
	const label = `${progress.counts.done} of ${progress.total} landed`;
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<div
				aria-label={[
					label,
					...slices.filter((slice) => slice.name !== "landed" && slice.count > 0).map((slice) => `${slice.count} ${slice.name}`),
				].join(", ")}
				className="flex h-1 w-full gap-px overflow-hidden rounded-full bg-muted"
				role="img"
			>
				{slices
					.filter((slice) => slice.count > 0)
					.map((slice) => (
						<span className={`h-full ${slice.color}`} key={slice.name} style={{ width: `${(slice.count / progress.total) * 100}%` }} />
					))}
			</div>
			<div className="flex flex-wrap gap-x-3 text-2xs text-muted-foreground">
				<span className="tabular-nums">{label}</span>
				{legend.map((slice) => (
					<span className="tabular-nums" key={slice.name}>
						{slice.count} {slice.name}
					</span>
				))}
			</div>
		</div>
	);
};

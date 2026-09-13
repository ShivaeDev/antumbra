import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { voyageProgress } from "@antumbra/domain-voyages/rows/voyage-progress.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";
import { Progress } from "@antumbra/glass-components/shadcn/progress.tsx";
import type { ReactNode } from "react";
import type { VoyagesApi } from "#glass.ts";
import { QUIET_CHIP, QUIET_DETAIL } from "#quiet.tsx";

type Reading = typeof voyageProgress.Row.Type;

const NOTHING = "No pieces yet";

const wordsOf = (progress: Reading): string => {
	if (progress.total === 0) return NOTHING;
	const words = [`${progress.counts.done} of ${progress.total} landed`];
	if (progress.counts.active > 0) words.push(`${progress.counts.active} active`);
	if (progress.counts.ready > 0) words.push(`${progress.counts.ready} ready`);
	return words.join(" · ");
};

const watched = (props: { readonly api: VoyagesApi; readonly voyageId: string }) => ({
	input: { id: VoyageId.make(props.voyageId) },
	query: props.api.voyages.progress,
});

export const VoyageState = (props: { readonly api: VoyagesApi; readonly voyageId: string; readonly quieted: boolean }) => {
	if (props.quieted) return <StatusBadge state={QUIET_CHIP} />;
	return <Live {...watched(props)}>{(progress) => (progress?.state === "quiet" ? <StatusBadge state="quiet" /> : null)}</Live>;
};

export const VoyageCaption = (props: {
	readonly api: VoyagesApi;
	readonly voyageId: string;
	readonly quieted: boolean;
	readonly spend?: ReactNode;
}) => (
	<Live {...watched(props)}>
		{(progress) =>
			progress === null ? null : (
				<>
					<span className="tabular-nums">{wordsOf(progress)}</span>
					{props.spend}
					{props.quieted ? (
						<span className="flex min-w-0 items-center gap-1.5">
							<span>·</span>
							<span>{QUIET_DETAIL}</span>
						</span>
					) : null}
				</>
			)
		}
	</Live>
);

export const VoyageProgress = (props: { readonly api: VoyagesApi; readonly voyageId: string }) => (
	<Live {...watched(props)}>
		{(progress) =>
			progress === null ? null : (
				<div className="flex min-w-0 flex-col gap-1.5">
					{progress.total === 0 ? null : (
						<Progress aria-label={wordsOf(progress)} className="h-1" value={(progress.counts.done / progress.total) * 100} />
					)}
					<span className="text-xs text-muted-foreground tabular-nums">{wordsOf(progress)}</span>
				</div>
			)
		}
	</Live>
);

import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { VoyageSpend } from "@antumbra/glass-sessions/spend.tsx";
import { VoyageDetail } from "@antumbra/glass-voyages/voyage-detail.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Cause, Effect } from "effect";
import { VoyagesAside } from "#navigation/voyages-aside.tsx";
import type { RendererProps } from "#props.ts";

export const VoyagesPage = (
	props: RendererProps & {
		readonly place: ConsolePlace;
		readonly onPlace: (place: ConsolePlace) => void;
		readonly onError: (message: string) => void;
	},
) => {
	const run = (action: Effect.Effect<unknown, unknown>) => {
		Effect.runFork(action.pipe(Effect.catchCause((cause) => Effect.sync(() => props.onError(Cause.pretty(cause))))));
	};
	const hail = (voyageId: string) =>
		run(props.sessions["admiral.hail"]({ requestId: Id.Request.make(Id.make()), voyageId: VoyageId.make(voyageId) }));
	return (
		<div className="flex min-h-0 min-w-0 flex-1">
			<aside className="flex w-80 shrink-0 flex-col gap-5 overflow-x-hidden overflow-y-auto border-r border-border p-3">
				<VoyagesAside
					onHail={hail}
					api={props.api}
					selected={props.place.voyageId ?? undefined}
					onSelect={(voyageId) => props.onPlace({ ...props.place, voyageId, pieceId: null })}
				/>
			</aside>
			{props.place.voyageId === null ? (
				<section className="m-auto text-xs text-muted-foreground">select a voyage to see its pieces</section>
			) : (
				<VoyageDetail
					api={props.api}
					voyageId={props.place.voyageId}
					pieceId={props.place.pieceId ?? undefined}
					onPiece={(voyageId, pieceId) => props.onPlace({ ...props.place, voyageId, pieceId })}
					readArtifact={props.readArtifact}
					onHail={hail}
					onWorkNow={(pieceId) => run(props.sessions["admiral.workNow"]({ requestId: Id.Request.make(Id.make()), pieceId: PieceId.make(pieceId) }))}
					onRetireCrew={(pieceId) => run(props.api.agents.retireCrew({ pieceId: PieceId.make(pieceId) }))}
					onSmooth={(voyageId) => run(props.api.boards.requestSmoothing({ voyageId: VoyageId.make(voyageId), pieceId: null, throughToday: true }))}
					renderSpend={(voyageId) => <VoyageSpend api={props.api} voyageId={voyageId} />}
					openArtifact={(artifactId) => run(props.shell.open({ role: "artifact", artifactId }))}
				/>
			)}
		</div>
	);
};

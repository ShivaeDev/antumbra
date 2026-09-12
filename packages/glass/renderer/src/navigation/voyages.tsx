import { VoyageDetail } from "@antumbra/glass-voyages/voyage-detail.tsx";
import { VoyageList } from "@antumbra/glass-voyages/voyage-list.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { Cause, Effect } from "effect";
import type { RendererProps } from "#props.ts";

export const VoyagesPage = (
	props: RendererProps & {
		readonly place: ConsolePlace;
		readonly onPlace: (place: ConsolePlace) => void;
		readonly onError: (message: string) => void;
	},
) => (
	<div className="flex min-h-0 min-w-0 flex-1">
		<aside className="flex w-80 shrink-0 flex-col gap-5 overflow-x-hidden overflow-y-auto border-r border-border p-3">
			<VoyageList
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
				openArtifact={(artifactId) => {
					Effect.runFork(
						props.shell
							.open({ role: "artifact", artifactId })
							.pipe(Effect.catchCause((cause) => Effect.sync(() => props.onError(Cause.pretty(cause))))),
					);
				}}
			/>
		)}
	</div>
);

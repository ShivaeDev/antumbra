import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { TwoPane } from "@antumbra/glass-components/compositions/two-pane.tsx";
import { AgentSession } from "@antumbra/glass-sessions/agent-session.tsx";
import { PieceSession } from "@antumbra/glass-sessions/piece-session.tsx";
import { PaneNote } from "@antumbra/glass-sessions/session-pane.tsx";
import { VoyageSpend } from "@antumbra/glass-sessions/spend.tsx";
import { VoyageDetail } from "@antumbra/glass-voyages/voyage-detail.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { Cause, Effect } from "effect";
import { type ReactNode, useState } from "react";
import { VoyagesAside } from "#navigation/voyages-aside.tsx";
import type { RendererProps } from "#props.ts";

const NOTHING_OPEN = "Nothing open yet — pick a piece or a member of the crew to read the conversation here";

export const VoyagesPage = (
	props: Pick<RendererProps, "api" | "readArtifact" | "shell"> & {
		readonly place: ConsolePlace;
		readonly onPlace: (place: ConsolePlace) => void;
		readonly onError: (message: string) => void;
		readonly renderSession: (sessionId: string, onClose?: () => void) => ReactNode;
	},
) => {
	const [crew, setCrew] = useState<string | null>(null);
	const run = (action: Effect.Effect<unknown, unknown>) => {
		Effect.runFork(action.pipe(Effect.catchCause((cause) => Effect.sync(() => props.onError(Cause.pretty(cause))))));
	};
	const hail = (voyageId: string) => run(props.api.agents.hail({ voyageId: VoyageId.make(voyageId) }));
	const openVoyage = (voyageId: string) => {
		setCrew(null);
		props.onPlace({ ...props.place, voyageId, pieceId: null });
	};
	const openPiece = (voyageId: string, pieceId: string | null) => {
		setCrew(null);
		props.onPlace({ ...props.place, voyageId, pieceId });
	};
	const openAgent = (agentId: string) => {
		setCrew(agentId);
		props.onPlace({ ...props.place, pieceId: null });
	};
	const beside = (): ReactNode => {
		if (props.place.voyageId === null) return null;
		const reading = props.place.pieceId ?? null;
		if (reading !== null) {
			const close = () => props.onPlace({ ...props.place, pieceId: null });
			return <PieceSession api={props.api} pieceId={reading} renderSession={(sessionId) => props.renderSession(sessionId, close)} />;
		}
		if (crew === null) return <PaneNote>{NOTHING_OPEN}</PaneNote>;
		return <AgentSession api={props.api} agentId={crew} renderSession={(sessionId) => props.renderSession(sessionId, () => setCrew(null))} />;
	};
	const chosen = (): ReactNode => {
		if (props.place.voyageId === null) return <section className="m-auto text-xs text-muted-foreground">select a voyage to see its pieces</section>;
		return (
			<VoyageDetail
				api={props.api}
				voyageId={props.place.voyageId}
				pieceId={props.place.pieceId ?? undefined}
				agentId={crew ?? undefined}
				onPiece={openPiece}
				onAgent={openAgent}
				readArtifact={props.readArtifact}
				onHail={hail}
				onWorkNow={(pieceId) => run(props.api.agents.workNow({ pieceId: PieceId.make(pieceId) }))}
				onRetireCrew={(pieceId) => run(props.api.agents.retireCrew({ pieceId: PieceId.make(pieceId) }))}
				onSmooth={(voyageId) => run(props.api.boards.requestSmoothing({ voyageId: VoyageId.make(voyageId), pieceId: null, throughToday: true }))}
				renderSpend={(voyageId) => <VoyageSpend api={props.api} voyageId={voyageId} />}
				openArtifact={(artifactId) => run(props.shell.open({ role: "artifact", artifactId }))}
			/>
		);
	};
	return (
		<div className="flex min-h-0 min-w-0 flex-1">
			<aside className="flex w-80 shrink-0 flex-col gap-5 overflow-x-hidden overflow-y-auto border-r border-border p-3">
				<VoyagesAside onHail={hail} api={props.api} selected={props.place.voyageId ?? undefined} onSelect={openVoyage} />
			</aside>
			<TwoPane list={chosen()} pane={beside()} />
		</div>
	);
};

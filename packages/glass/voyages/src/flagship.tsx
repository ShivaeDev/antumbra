import { Live } from "@antumbra/glass-client/live.tsx";
import type { ReactNode } from "react";
import { CaptainCall } from "#captain.tsx";
import type { VoyagesDisplayApi } from "#display.ts";

export const Flagship = (props: {
	readonly api: VoyagesDisplayApi;
	readonly onHail: (voyageId: string) => void;
	readonly renderSession: (sessionId: string) => ReactNode;
}) => (
	<Live input={{}} query={props.api.voyages.list} waiting="taking a sight…">
		{(voyages) => {
			const flagship = voyages.find((voyage) => voyage.kind === "flagship");
			if (flagship === undefined) return <section className="m-auto text-xs text-muted-foreground">taking a sight…</section>;
			return <CaptainConversation {...props} voyageId={flagship.id} />;
		}}
	</Live>
);

const CaptainConversation = (props: {
	readonly api: VoyagesDisplayApi;
	readonly voyageId: import("@antumbra/domain-voyages/ids.ts").VoyageId;
	readonly onHail: (voyageId: string) => void;
	readonly renderSession: (sessionId: string) => ReactNode;
}) => (
	<Live input={{ voyageId: props.voyageId }} query={props.api.agents.captainReading}>
		{(captain) =>
			captain?.currentSessionId == null ? (
				<section className="m-auto flex flex-col items-center gap-3">
					<p className="text-xs text-muted-foreground">the flagship captain has no conversation open yet</p>
					<CaptainCall api={props.api} onHail={props.onHail} voyageId={props.voyageId} />
				</section>
			) : (
				props.renderSession(captain.currentSessionId)
			)
		}
	</Live>
);

import type { sessionSituation } from "@antumbra/domain-changes/rows/session-situation.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { useState } from "react";
import type { ChangesApi } from "#glass.ts";
import { SituationDialog } from "#situation-dialog.tsx";
import { situationLabel } from "#situation-labels.ts";
export const SessionSituations = (props: {
	readonly api: ChangesApi;
	readonly inputs: InputsClient;
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly onError: (message: string) => void;
}) => {
	const [chosen, setChosen] = useState<typeof sessionSituation.Row.Type>();
	return (
		<>
			<Live query={props.api.changes.sessionSituations} input={{ sessionId: SessionId.make(props.sessionId) }}>
				{(situations) => (
					<div className="flex min-w-0 flex-wrap gap-2">
						{situations.map((situation) => (
							<Button key={situation.id} onClick={() => setChosen(situation)} size="sm" variant="outline">
								{situationLabel[situation.situation]} {situation.reference}
							</Button>
						))}
					</div>
				)}
			</Live>
			{chosen === undefined ? null : (
				<SituationDialog
					inputs={props.inputs}
					drafts={props.drafts}
					sessionId={props.sessionId}
					onError={props.onError}
					situation={chosen}
					onClose={() => setChosen(undefined)}
				/>
			)}
		</>
	);
};

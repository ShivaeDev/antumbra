import type { SessionSituation } from "@antumbra/contract";
import { useState } from "react";
import { Button } from "#components/ui/button.tsx";
import { situationLabel } from "#fleet/situations.ts";
import { SituationDialog } from "#views/situation-dialog.tsx";

const keyOf = (situation: SessionSituation): string => `${situation.changeId}:${situation.situation}`;

export const SessionSituations = ({
	onError,
	sessionId,
	situations,
}: {
	readonly onError: (message: string) => void;
	readonly sessionId: string;
	readonly situations: ReadonlyArray<SessionSituation>;
}) => {
	const [chosen, setChosen] = useState<SessionSituation | undefined>(undefined);
	if (situations.length === 0) {
		return null;
	}
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			{situations.map((situation) => (
				<Button key={keyOf(situation)} onClick={() => setChosen(situation)} size="sm" type="button" variant="outline">
					{situationLabel[situation.situation]} {situation.reference}
				</Button>
			))}
			{chosen === undefined ? null : (
				<SituationDialog onClose={() => setChosen(undefined)} onError={onError} sessionId={sessionId} situation={chosen} />
			)}
		</div>
	);
};

import type { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import type { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { OutcomeChips } from "@antumbra/glass-components/outcome-detail.tsx";
import type { OutcomeRef } from "@antumbra/glass-components/outcome-read.ts";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { ArtifactDetail } from "#detail.tsx";
import type { ArtifactsApi, ReadArtifact } from "#glass.ts";
export const ArtifactOutcomes = (props: {
	readonly api: ArtifactsApi;
	readonly pieceId: PieceId;
	readonly read: ReadArtifact;
	readonly openWindow: (id: ArtifactId) => void;
}) => {
	const [asked, setAsked] = useState<OutcomeRef>();
	return (
		<Live input={{ pieceId: props.pieceId }} query={props.api.artifacts.byPiece} waiting="Reading Artifacts…">
			{({ current, history }) => (
				<>
					<OutcomeChips disabled={false} icon={<ImageIcon />} onOpen={setAsked} outcomes={current} />
					{history.length === 0 ? null : (
						<details>
							<summary>History</summary>
							<OutcomeChips disabled={false} icon={<ImageIcon />} onOpen={setAsked} outcomes={history} />
						</details>
					)}
					{asked === undefined ? null : (
						<ArtifactDetail artifact={asked} key={asked.id} onClose={() => setAsked(undefined)} openWindow={props.openWindow} read={props.read} />
					)}
				</>
			)}
		</Live>
	);
};

import type {
	AgentDiagnostics,
	FleetDiagnostics,
	IntentDiagnostic,
	SessionDiagnostics,
} from "@antumbra/contract";
import { chipStyle, rowStyle } from "#views/styles.ts";

const Chip = ({ children }: { readonly children: string }) => (
	<span style={chipStyle}>{children}</span>
);

// why: the raw words go out unedited. A chip that paraphrased stored state
// would be another projection to distrust, which is the thing it exists to
// remove.
const IntentChips = ({
	intents,
}: {
	readonly intents: ReadonlyArray<IntentDiagnostic>;
}) => (
	<>
		{intents.map((intent) => (
			<Chip key={intent.id}>{`intent: ${intent.kind} ${intent.state}`}</Chip>
		))}
	</>
);

export const AgentDiagChips = ({
	diag,
}: {
	readonly diag: AgentDiagnostics;
}) => (
	<>
		<Chip>{`current ${diag.currentSessionId?.slice(0, 8) ?? "none"}`}</Chip>
		<IntentChips intents={diag.intents} />
	</>
);

export const SessionDiagChips = ({
	diag,
}: {
	readonly diag: SessionDiagnostics;
}) => (
	<>
		<Chip>{diag.current ? `${diag.execution} · current` : diag.execution}</Chip>
		<IntentChips intents={diag.intents} />
	</>
);

// why: an Intent whose Agent or Session row does not exist yet has nowhere to
// sit on the list, and those are the ones a stalled fleet is made of.
export const FleetDiagChips = ({
	diag,
}: {
	readonly diag: FleetDiagnostics;
}) =>
	diag.intents.length === 0 ? null : (
		<div style={{ ...rowStyle, flexWrap: "wrap" }}>
			<IntentChips intents={diag.intents} />
		</div>
	);

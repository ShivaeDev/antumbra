import type { RulingSubject } from "@antumbra/rulings";
import { Option } from "effect";
import { tagSubjects } from "#ruling-inputs.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the asker never names its own scope. Where the work sits is durable
// truth the session was opened with, so a ruling can never be filed against a
// piece or voyage the agent is not on, and the agent itself is always a
// subject: what binds it is readable from its own record afterwards.
const identitySubjects = (identity: SessionIdentity): ReadonlyArray<RulingSubject> => [
	...Option.match(identity.pieceId, {
		onNone: (): ReadonlyArray<RulingSubject> => [],
		onSome: (id): ReadonlyArray<RulingSubject> => [{ id, kind: "piece" }],
	}),
	...Option.match(identity.voyageId, {
		onNone: (): ReadonlyArray<RulingSubject> => [],
		onSome: (id): ReadonlyArray<RulingSubject> => [{ id, kind: "voyage" }],
	}),
	{ id: identity.agentId, kind: "agent" },
];

export const subjectsOf = (identity: SessionIdentity, tags: ReadonlyArray<string> | undefined): ReadonlyArray<RulingSubject> => [
	...identitySubjects(identity),
	...tagSubjects(tags),
];

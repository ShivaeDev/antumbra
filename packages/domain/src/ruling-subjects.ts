import type { RulingSubject } from "@antumbra/rulings";
import { Option } from "effect";
import { tagSubjects } from "#ruling-inputs.ts";
import type { SessionIdentity } from "#tool-identity.ts";

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

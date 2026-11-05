import type { FactPayload, FactShape } from "@antumbra/platform-feature/fact.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";

export interface ObservationMetadata {
	readonly logId: string;
	readonly cursor: number;
	readonly at: number;
	readonly requestId: Request;
}

export interface Observation<Payload> extends ObservationMetadata {
	readonly payload: Payload;
}

export interface ObservedFact {
	readonly fact: FactShape;
	readonly payload: unknown;
}

export const observation = <Fact extends FactShape>(fact: Fact, payload: FactPayload<Fact>): ObservedFact => ({ fact, payload });

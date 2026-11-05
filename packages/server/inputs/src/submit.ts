import { InputDelivery } from "@antumbra/domain-inputs/commands/delivery-port.ts";
import { InputAmbiguous, InputConflict } from "@antumbra/domain-inputs/commands/errors.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import type { Draft, Receipt } from "@antumbra/platform-vocabulary/inputs.ts";
import { Effect } from "effect";
import { digestRequest } from "#adapters/digest.ts";
import { prepare } from "#adapters/prepare.ts";
import { Inputs } from "#service.ts";
import { InputStorage } from "#storage.ts";

export const submit = Effect.fn("Inputs.submit")(function* (draft: Draft) {
	const transport = yield* InputDelivery;
	const records = yield* Inputs;

	yield* records.admit(draft);
	yield* transport.admit(draft);
	const held = yield* records.reading({ sessionId: draft.sessionId, id: draft.id });
	const digest = digestRequest(draft.sessionId, draft.parts);
	if (held !== null && held.requestDigest !== digest) return yield* new InputConflict({ inputId: draft.id });
	if (held?.status === "ambiguous") return yield* new InputAmbiguous({ inputId: draft.id });
	if (held?.status === "accepted" || held?.status === "queued_for_wake") return { id: draft.id, status: held.status } satisfies Receipt;
	if (held?.status === "refused") {
		yield* records.retry({ id: draft.id, requestId: Request.make(make()) }).pipe(
			Effect.catchTag("DeliverySettled", () => Effect.void),
			Effect.catchTag("AlreadyDone", () => Effect.void),
		);
	}
	if (held === null) {
		const prepared = yield* prepare((yield* InputStorage).root, draft);
		yield* records.record({ ...prepared, requestId: Request.make(`input:${draft.id}`) }).pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	}
	const status = yield* transport.deliver({ sessionId: draft.sessionId, inputId: draft.id });
	yield* records.delivery({ id: draft.id, status, detail: null, requestId: Request.make(make()) }).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.catchTag("DeliverySettled", () => Effect.void),
	);
	return { id: draft.id, status } satisfies Receipt;
});

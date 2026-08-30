import type { AgentBackend, BackendFailure, OpenSessionOptions } from "@antumbra/plugin-api";
import { Effect } from "effect";
import type { SessionAttachmentFailure } from "#errors.ts";
import type { EventSink, SessionAttachment } from "#session-attachment.ts";
import type { SessionFabricState } from "#session-fabric-state.ts";
import type { SessionStartPermit } from "#session-start-permit.ts";

export const makeStart = (attachments: SessionFabricState["attachments"], lifecycles: SessionFabricState["lifecycles"]) =>
	Effect.fn("sessionFabric.start")(
		<Failure, Requirements>(
			_permit: SessionStartPermit,
			agentId: string,
			backend: AgentBackend,
			options: OpenSessionOptions,
			sink: EventSink,
			admit: (attachment: SessionAttachment) => Effect.Effect<void, Failure, Requirements>,
		): Effect.Effect<void, BackendFailure | SessionAttachmentFailure | Failure, Requirements> =>
			lifecycles
				.admit(options.sessionId, attachments.attach(agentId, backend, options, sink, admit))
				.pipe(Effect.annotateSpans({ agentId, sessionId: options.sessionId })),
	);

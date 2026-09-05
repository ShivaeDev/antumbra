import { bind, writeSummarySpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import type { EventSink } from "@antumbra/session-fabric";
import { Deferred, Effect } from "effect";

export type SummaryWritten = { readonly _tag: "silent" } | { readonly _tag: "written"; readonly text: string };

type Written = Deferred.Deferred<SummaryWritten>;

const silence = (written: Written) => Deferred.succeed(written, { _tag: "silent" } as const).pipe(Effect.asVoid);

export const boundSummaryTool = (written: Written): DirectTool =>
	bind(writeSummarySpec, ({ text }) =>
		Deferred.succeed(written, { _tag: "written", text } as const).pipe(
			Effect.as({ ok: true, text: text.trim() === "" ? "the summary was empty" : "summary written" }),
		),
	);

export const endingSink = (sink: EventSink, written: Written): EventSink => ({
	attached: sink.attached,
	detached: sink.detached.pipe(Effect.andThen(silence(written))),
	record: (event) => sink.record(event).pipe(Effect.tap(() => (event.type === "turn.completed" ? silence(written) : Effect.void))),
});

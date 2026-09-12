import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { Deferred, Effect } from "effect";
import { writeSummarySpec } from "#tools/boards/specs.ts";

export type SummaryWritten = { readonly _tag: "silent" } | { readonly _tag: "timedOut" } | { readonly _tag: "written"; readonly text: string };

export const boundSummaryTool = (written: Deferred.Deferred<SummaryWritten>) =>
	bind(writeSummarySpec, (_context, { text }) =>
		Deferred.succeed(written, { _tag: "written", text } as const).pipe(
			Effect.as({ ok: true, text: text.trim() === "" ? "the summary was empty" : "summary written" }),
		),
	);

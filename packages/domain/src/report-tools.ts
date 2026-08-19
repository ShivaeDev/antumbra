import { bind, readReportSpec } from "@antumbra/agent-tools";
import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { type ReportReading, Reports } from "@antumbra/reports";
import { Effect, Option } from "effect";
import { CaptainMembership } from "#captain-membership.ts";
import { called, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: an id a model guessed must not tell it whether a report exists, so a
// report landed on another voyage and a report that was never landed at all
// come back as the same refusal.
const OUT_OF_REACH = "no report with that id is on your voyage";

const byline = (authorAgentId: string | null): string =>
	authorAgentId === null ? "report" : `report by ${authorAgentId}`;

const renderReport = (reading: ReportReading): string =>
	[`# ${reading.title}`, byline(reading.authorAgentId), ``, reading.body].join(
		"\n",
	);

export const makeReportToolCompiler = Effect.gen(function* () {
	const membership = yield* CaptainMembership;
	const reports = yield* Reports;
	// why: reports are landed against pieces and pieces sail on a voyage, so a
	// reader's reach is its voyage — crew read what their sibling pieces landed,
	// and nothing crosses a hull.
	const withinReach = (identity: SessionIdentity, reportId: string) => {
		const reached = (reading: ReportReading) =>
			membership
				.reaches(identity, reading.pieceIds)
				.pipe(
					Effect.map((yes) => (yes ? Option.some(reading) : Option.none())),
				);
		return reports
			.read(reportId)
			.pipe(
				Effect.flatMap(
					Option.match({ onNone: () => Effect.succeedNone, onSome: reached }),
				),
			);
	};
	const serve = (
		identity: SessionIdentity,
		reportId: string,
	): Effect.Effect<DirectToolOutcome> =>
		called(identity, readReportSpec.name).pipe(
			Effect.andThen(withinReach(identity, reportId)),
			Effect.matchCauseEffect({
				onFailure: (cause) =>
					Effect.logWarning(
						"read_report could not read",
						{ agentId: identity.agentId },
						cause,
					).pipe(Effect.as(refused("the report could not be read"))),
				onSuccess: Option.match({
					onNone: () => Effect.succeed(refused(OUT_OF_REACH)),
					onSome: (reading) =>
						Effect.succeed({ ok: true, text: renderReport(reading) }),
				}),
			}),
		);
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(readReportSpec, (input) => serve(identity, input.reportId)),
	];
});

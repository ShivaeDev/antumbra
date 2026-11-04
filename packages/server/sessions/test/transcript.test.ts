import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { entry, provider, raw, started } from "@antumbra/app-testing/test-support/execution-data.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { expect } from "vitest";

const log = "transcript-story";
const id = SessionId.make("root");
const entries = [
	started(log, 0, id),
	entry(log, 1, { type: "InputAccepted", sessionId: id, requestId: `start:${id}`, inputId: "charter" }),
	provider(log, 2, id, { type: "message", role: "agent", text: "Sound the reef", raw }),
	provider(log, 3, id, { type: "subsession.opened", subsessionRef: "child", spawnedBy: "spawn", label: "Surveyor", raw }),
	provider(log, 4, id, { type: "message", role: "agent", text: "Shoal ahead", origin: { node: "child", spawnedBy: "spawn" }, raw }),
];
postgresApp.it(
	"preserves ordered transcripts and never ends an unattached session",
	[],
	function* ({ journal, replayJournal, api, appendRunner, retainRunnerLog, transcript, transcriptFromSources, disconnectTranscript, rebuild }) {
		const legacy = yield* journal();
		const runner = yield* legacy.runner({ runnerId: "runner", logId: log, backends: [], imageInputBackends: [] });
		yield* runner.append(entries);
		yield* replayJournal(legacy);
		yield* retainRunnerLog(log, entries);
		const sources = yield* answered(legacy.api.sessions.transcriptSources({ id }), "journal transcript sources");
		expect(yield* api["sessions.transcriptSources"]({ id })).toEqual(sources);
		const reading = yield* transcript(id);
		expect(reading).toEqual(yield* transcriptFromSources(sources, id));
		expect(reading.items).toEqual(expect.arrayContaining([expect.objectContaining({ text: "Sound the reef" })]));
		yield* rebuild();
		expect(yield* transcript(id)).toEqual(reading);
		yield* appendRunner(log, [entry(log, 5, { type: "SessionDetached", sessionId: id })]);
		yield* disconnectTranscript(log);
		expect(yield* api["sessions.reading"]({ id })).toMatchObject({
			status: "open",
			attached: false,
			executionStatus: "active",
			completeness: "recording",
		});
		expect((yield* transcript(id)).unavailable).toHaveLength(1);
		expect(yield* api["sessions.tree"]({ rootSessionId: id })).toMatchObject([{ status: "open" }, { status: "open" }]);
	},
);

import { expect } from "vitest";
import { secret, tracing } from "#test/tracing-kit.ts";

const correlatedLog = (traceId: string) =>
	new RegExp(`"name":"effect.log","parentSpanId":"[^"]+","spanId":"[^"]+","startedAtMillis":\\d+,"status":"[^"]+","traceId":"${traceId}"`);

tracing.it("flushes a real shell action and a server request with redacted correlated logs", [], function* ({ recordShell, host, story }) {
	story.tell("remember the renderer endpoint in a traced shell scope");
	const shell = yield* recordShell(false);
	expect(shell.stored).toContain("ShellState.rememberPort");
	expect(shell.stored).toContain("effect.log");
	expect(shell.stored).toMatch(correlatedLog(shell.traceId));
	expect(shell.stored).toContain("<redacted>");
	expect(shell.stored).not.toContain(secret);
	story.tell("record and close the server request scope");
	const server = yield* host();
	const traceId = yield* server.traceRequest;
	yield* server.stop;
	const stored = yield* server.traces;
	expect(stored).toContain("settings.setCount");
	expect(stored).toContain("effect.log");
	expect(stored).toMatch(correlatedLog(traceId));
	expect(stored).not.toContain(server.machineToken);
	expect(stored).not.toContain(server.options.bearerToken);
});

tracing.it("does not create a trace store in a packaged shell", [], function* ({ recordShell }) {
	expect((yield* recordShell(true)).stored).toBeUndefined();
});

import { expect, it } from "@effect/vitest";
import { listeningUrl } from "#adapters/listening.ts";
import { openSseBuffer } from "#adapters/sse.ts";

it("reads the address out of the line the server announces it on", () => {
	expect(listeningUrl("     opencode server listening on http://127.0.0.1:51491\n")).toBe("http://127.0.0.1:51491");
	expect(listeningUrl("all LSPs are disabled")).toBeUndefined();
});

it("holds a frame split across two reads until its newline arrives", () => {
	const buffer = openSseBuffer();
	expect(buffer.take('data: {"payload":{"type":"ses')).toEqual([]);
	expect(buffer.take('sion.idle"}}\n\n')).toEqual([{ payload: { type: "session.idle" } }]);
});

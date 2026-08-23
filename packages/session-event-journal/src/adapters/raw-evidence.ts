import { createHash } from "node:crypto";
import { chmod, mkdir, open, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { RawPayload } from "@antumbra/vocabulary/session-events";
import { Effect } from "effect";

const INLINE_BYTES = 64 * 1024;
const EXTERNAL_PAYLOAD = "[raw provider evidence stored in local CAS]";

const digestBytes = (bytes: Uint8Array): string =>
	createHash("sha256").update(bytes).digest("hex");

const needsExternalCustody = (payload: string): boolean =>
	new TextEncoder().encode(payload).length > INLINE_BYTES ||
	payload.includes('"type":"localImage"') ||
	payload.includes('"type":"base64"') ||
	payload.includes("data:image/");

const install = (root: string, digest: string, bytes: Uint8Array) =>
	Effect.tryPromise({
		catch: (cause) => cause,
		try: async () => {
			const directory = join(root, digest);
			const destination = join(directory, "payload.json");
			const temporary = join(directory, `.install-${crypto.randomUUID()}`);
			await mkdir(root, { mode: 0o700, recursive: true });
			await chmod(root, 0o700);
			await mkdir(directory, { mode: 0o700, recursive: true });
			await chmod(directory, 0o700);
			const file = await open(temporary, "wx", 0o600);
			try {
				await file.writeFile(bytes);
				await file.sync();
			} finally {
				await file.close();
			}
			await rename(temporary, destination).catch((cause: unknown) =>
				unlink(temporary)
					.catch(() => undefined)
					.then(() => Promise.reject(cause)),
			);
			await chmod(destination, 0o600);
			const parent = await open(directory, "r");
			try {
				await parent.sync();
			} finally {
				await parent.close();
			}
		},
	});

export const externalizeRaw = (root: string, raw: RawPayload) => {
	if (!needsExternalCustody(raw.payload)) return Effect.succeed(raw);
	const bytes = new TextEncoder().encode(raw.payload);
	const digest = digestBytes(bytes);
	return install(root, digest, bytes).pipe(
		Effect.as({
			...raw,
			evidence: {
				byteSize: bytes.length,
				digest,
				storage: "local-cas" as const,
			},
			payload: EXTERNAL_PAYLOAD,
		}),
	);
};

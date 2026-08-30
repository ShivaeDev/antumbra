import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readSync, realpathSync, statSync } from "node:fs";
import { type LegacyArtifact, resolveLegacyArtifactIdentity } from "#adapters/artifact-custody-identity.ts";

const MAX_BYTES = 1_048_576;

export interface VerifiedArtifact extends LegacyArtifact {
	readonly basename: string;
	readonly byteSize: number;
	readonly digest: string;
}

export const hashArtifactCustody = (bytes: Uint8Array | string): string => createHash("sha256").update(bytes).digest("hex");

const readBounded = (descriptor: number, size: number): Uint8Array => {
	const bytes = new Uint8Array(size);
	let offset = 0;
	while (offset < size) {
		const count = readSync(descriptor, bytes, offset, size - offset, offset);
		if (count === 0) {
			break;
		}
		offset += count;
	}
	if (offset !== size) {
		throw new Error("size changed while reading");
	}
	return bytes;
};

const verifyOpenedLegacy = (descriptor: number, expected: string, digest: string) => {
	const opened = fstatSync(descriptor);
	if (!opened.isFile()) {
		throw new Error("CAS object is not a regular file");
	}
	if (opened.size > MAX_BYTES) {
		throw new Error("Markdown exceeds 1,048,576 bytes");
	}
	const resolved = realpathSync(expected);
	const observed = statSync(resolved);
	if (resolved !== expected || !observed.isFile() || opened.dev !== observed.dev || opened.ino !== observed.ino) {
		throw new Error("CAS path was substituted");
	}
	const bytes = readBounded(descriptor, opened.size);
	const final = fstatSync(descriptor);
	if (final.size !== opened.size || final.dev !== opened.dev || final.ino !== opened.ino) {
		throw new Error("CAS object changed while being verified");
	}
	try {
		new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw new Error("Markdown is not strict UTF-8");
	}
	if (hashArtifactCustody(bytes) !== digest) {
		throw new Error("CAS digest does not match the stored bytes");
	}
	return bytes.length;
};

export const verifyLegacyArtifact = (artifact: LegacyArtifact, canonicalRoot: string): VerifiedArtifact => {
	const { digest, expected, storedBasename } = resolveLegacyArtifactIdentity(artifact, canonicalRoot);
	let descriptor: number;
	try {
		descriptor = openSync(expected, constants.O_RDONLY | constants.O_NOFOLLOW);
	} catch {
		throw new Error("CAS object cannot be opened without following links");
	}
	try {
		return {
			...artifact,
			basename: storedBasename,
			byteSize: verifyOpenedLegacy(descriptor, expected, digest),
			digest,
		};
	} finally {
		closeSync(descriptor);
	}
};

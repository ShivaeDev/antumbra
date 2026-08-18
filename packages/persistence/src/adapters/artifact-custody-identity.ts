import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export interface LegacyArtifact {
	readonly id: string;
	readonly uri: string;
}

export interface LegacyArtifactIdentity {
	readonly digest: string;
	readonly expected: string;
	readonly storedBasename: string;
}

const isDigest = (value: string): boolean => /^[0-9a-f]{64}$/.test(value);

const isSafeBasename = (value: string): boolean =>
	value.length > 0 &&
	value !== "." &&
	value !== ".." &&
	!value.includes("/") &&
	!value.includes("\\") &&
	!value.includes("\0");

const parseLocalFileUrl = (uri: string): string => {
	let url: URL;
	try {
		url = new URL(uri);
	} catch {
		throw new Error("not a canonical local file URL");
	}
	if (
		url.protocol !== "file:" ||
		url.username !== "" ||
		url.password !== "" ||
		url.host !== "" ||
		url.search !== "" ||
		url.hash !== ""
	) {
		throw new Error("external or noncanonical URL");
	}
	try {
		return fileURLToPath(url);
	} catch {
		throw new Error("invalid local file URL");
	}
};

export const resolveLegacyArtifactIdentity = (
	artifact: LegacyArtifact,
	canonicalRoot: string,
): LegacyArtifactIdentity => {
	const filePath = parseLocalFileUrl(artifact.uri);
	const inside = relative(canonicalRoot, filePath);
	const segments = inside.split(sep);
	if (
		inside === "" ||
		inside === ".." ||
		inside.startsWith(`..${sep}`) ||
		segments.length !== 2
	) {
		throw new Error("path is outside the canonical CAS layout");
	}
	const [digest, storedBasename] = segments;
	if (digest === undefined || !isDigest(digest)) {
		throw new Error("CAS directory is not a lowercase SHA-256 digest");
	}
	if (storedBasename === undefined || !isSafeBasename(storedBasename)) {
		throw new Error("storage basename is unsafe");
	}
	const expected = join(canonicalRoot, digest, storedBasename);
	if (
		filePath !== expected ||
		basename(filePath) !== storedBasename ||
		dirname(filePath) !== join(canonicalRoot, digest) ||
		pathToFileURL(expected).toString() !== artifact.uri
	) {
		throw new Error("file URL does not name the exact canonical CAS object");
	}
	return { digest, expected, storedBasename };
};

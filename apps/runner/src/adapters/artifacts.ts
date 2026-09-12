import { open, realpath } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { Effect } from "effect";
import { FileFailure } from "#adapters/file-error.ts";

const ownedPath = async (rootPath: string, relativePath: string) => {
	if (relativePath.length === 0 || relativePath.startsWith("\\") || isAbsolute(relativePath) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(relativePath)) {
		throw new Error("artifact path must be relative to its moorage");
	}
	const root = await realpath(rootPath);
	const resolved = await realpath(resolve(root, relativePath));
	const inside = relative(root, resolved);
	if (inside === "" || inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside))
		throw new Error("artifact source is outside its moorage");
	return resolved;
};

export const readArtifact = (rootPath: string, relativePath: string) =>
	Effect.tryPromise({
		try: async () => {
			const resolved = await ownedPath(rootPath, relativePath);
			const file = await open(resolved, "r");
			try {
				const stat = await file.stat();
				if (!stat.isFile()) throw new Error("artifact source is not a regular file");
				if (stat.size > 1024 * 1024) throw new Error("artifact exceeds 1 MiB");
				const bytes = Buffer.alloc(stat.size);
				let offset = 0;
				while (offset < bytes.length) {
					const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, offset);
					if (bytesRead === 0) throw new Error("artifact changed while being read");
					offset += bytesRead;
				}
				return {
					type: "ArtifactRead" as const,
					name: basename(resolved),
					content: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes),
				};
			} finally {
				await file.close();
			}
		},
		catch: (cause) => new FileFailure({ detail: String(cause) }),
	});

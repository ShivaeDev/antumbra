import { Schema } from "effect";

export const brand = <Name extends string>(name: Name) => Schema.String.pipe(Schema.brand(name));

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const LENGTH = 10;
const CHARACTER = 31n;
const SIXTY_FOUR_BITS = 0xffffffffffffffffn;
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

export const make = (): string => {
	const bytes = globalThis.crypto.getRandomValues(new Uint8Array(LENGTH));
	let id = "";
	for (const byte of bytes) id += ALPHABET.charAt(byte % ALPHABET.length);
	return id;
};

export const derive = (...parts: readonly string[]): string => {
	let counted = "";
	for (const part of parts) counted += `${part.length}:${part}`;
	let hash = FNV_OFFSET;
	for (const byte of new TextEncoder().encode(counted)) hash = ((hash ^ BigInt(byte)) * FNV_PRIME) & SIXTY_FOUR_BITS;
	let id = "";
	for (let taken = 0; taken < LENGTH; taken += 1) {
		id = ALPHABET.charAt(Number(hash & CHARACTER)) + id;
		hash >>= 5n;
	}
	return id;
};

export const Request = brand("RequestId");

export type Request = typeof Request.Type;

import ts from "typescript";
import { effectValue } from "#lint/rules/effect-value.ts";
import type { CheckedSource } from "#lint/rules/service-parameter-program.ts";
import { canonicalSymbol } from "#lint/rules/service-symbol.ts";
import { typeNodeMentionsService } from "#lint/rules/service-type-node.ts";

const SERVICE_NAMES = new Set(["DatabaseService"]);

const symbolOf = (checker: ts.TypeChecker, name: ts.DeclarationName | undefined): ts.Symbol | undefined =>
	name === undefined ? undefined : canonicalSymbol(checker, checker.getSymbolAtLocation(name));

const seedAt = (node: ts.Node, checker: ts.TypeChecker): ts.Symbol | undefined => {
	if ((ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) && SERVICE_NAMES.has(node.name.text)) {
		return symbolOf(checker, node.name);
	}
	if (!ts.isClassDeclaration(node)) return undefined;
	const isService = node.heritageClauses?.some((clause) =>
		clause.types.some((type) => {
			const value = effectValue(type.expression, checker);
			return value === "Service" || value === "Tag";
		}),
	);
	return isService === true ? symbolOf(checker, node.name) : undefined;
};

const declarationBearing = (
	node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
	checker: ts.TypeChecker,
	services: ReadonlySet<ts.Symbol>,
): boolean => {
	if (ts.isTypeAliasDeclaration(node)) {
		return typeNodeMentionsService(node.type, checker, services);
	}
	return node.members.some((member) => {
		let found = false;
		ts.forEachChild(member, (child) => {
			if (ts.isTypeNode(child) && typeNodeMentionsService(child, checker, services)) {
				found = true;
			}
		});
		return found;
	});
};

const seedSource = (source: ts.SourceFile, checker: ts.TypeChecker, found: Set<ts.Symbol>): void => {
	const visit = (node: ts.Node) => {
		const symbol = seedAt(node, checker);
		if (symbol !== undefined) found.add(symbol);
		ts.forEachChild(node, visit);
	};
	visit(source);
};

const expandSource = (source: ts.SourceFile, checker: ts.TypeChecker, found: Set<ts.Symbol>): boolean => {
	let changed = false;
	const visit = (node: ts.Node) => {
		if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
			const symbol = symbolOf(checker, node.name);
			if (node.typeParameters === undefined && symbol !== undefined && !found.has(symbol) && declarationBearing(node, checker, found)) {
				found.add(symbol);
				changed = true;
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return changed;
};

export const serviceSymbols = (checker: ts.TypeChecker, sources: readonly CheckedSource[]): ReadonlySet<ts.Symbol> => {
	const found = new Set<ts.Symbol>();
	for (const { source } of sources) seedSource(source, checker, found);
	let changed = true;
	while (changed) {
		changed = false;
		for (const { source } of sources) {
			if (expandSource(source, checker, found)) changed = true;
		}
	}
	return found;
};

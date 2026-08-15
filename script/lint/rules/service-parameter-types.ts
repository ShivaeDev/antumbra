import ts from "typescript";
import {
	addImportedServiceAliases,
	declaredServiceNames,
	type ParsedSource,
} from "#lint/rules/service-type-names.ts";

export type { ParsedSource } from "#lint/rules/service-type-names.ts";

const referenceName = (node: ts.TypeNode, source: ts.SourceFile): string =>
	ts.isTypeReferenceNode(node) ? node.typeName.getText(source) : "";

const containsName = (
	node: ts.Node,
	source: ts.SourceFile,
	name: string,
): boolean =>
	(ts.isTypeReferenceNode(node) &&
		referenceName(node, source).split(".").at(-1) === name) ||
	node.getChildren(source).some((child) => containsName(child, source, name));

const memberType = (member: ts.TypeElement): ts.TypeNode | undefined =>
	ts.isPropertySignature(member) ||
	ts.isMethodSignature(member) ||
	ts.isCallSignatureDeclaration(member) ||
	ts.isConstructSignatureDeclaration(member) ||
	ts.isIndexSignatureDeclaration(member)
		? member.type
		: undefined;

const memberIsServiceBearing = (
	member: ts.TypeElement,
	source: ts.SourceFile,
	tainted: ReadonlySet<string>,
): boolean => {
	const name = member.name?.getText(source);
	if (name === "write" && containsName(member, source, "WriteExecutors")) {
		return true;
	}
	const type = memberType(member);
	return type !== undefined && typeIsServiceBearing(type, source, tainted);
};

const referenceIsServiceBearing = (
	node: ts.TypeReferenceNode,
	source: ts.SourceFile,
	tainted: ReadonlySet<string>,
): boolean => {
	const name = referenceName(node, source);
	if (tainted.has(name) || tainted.has(name.split(".").at(-1) ?? "")) {
		return true;
	}
	if (name.endsWith(".Effect") || name.endsWith(".Stream")) return false;
	if (name.endsWith(".Context")) {
		return node.typeArguments?.[0]?.kind !== ts.SyntaxKind.NeverKeyword;
	}
	return (
		node.typeArguments?.some((argument) =>
			typeIsServiceBearing(argument, source, tainted),
		) === true
	);
};

export const typeIsServiceBearing = (
	node: ts.TypeNode,
	source: ts.SourceFile,
	tainted: ReadonlySet<string>,
): boolean => {
	if (ts.isTypeQueryNode(node)) {
		const name = node.exprName.getText(source);
		return tainted.has(name) || tainted.has(name.split(".").at(-1) ?? "");
	}
	if (ts.isTypeLiteralNode(node)) {
		return node.members.some((member) =>
			memberIsServiceBearing(member, source, tainted),
		);
	}
	if (ts.isTypeReferenceNode(node)) {
		return referenceIsServiceBearing(node, source, tainted);
	}
	if (ts.isFunctionOrConstructorTypeNode(node)) return false;
	return node
		.getChildren(source)
		.some((child) =>
			ts.isTypeNode(child)
				? typeIsServiceBearing(child, source, tainted)
				: false,
		);
};

const declarationTainted = (
	statement: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
	source: ts.SourceFile,
	tainted: ReadonlySet<string>,
): boolean => {
	if (ts.isInterfaceDeclaration(statement)) {
		return statement.members.some((member) =>
			memberIsServiceBearing(member, source, tainted),
		);
	}
	if (ts.isTypeLiteralNode(statement.type)) {
		return statement.type.members.some((member) =>
			memberIsServiceBearing(member, source, tainted),
		);
	}
	return typeIsServiceBearing(statement.type, source, tainted);
};

export const serviceBearingTypes = (
	sources: readonly ParsedSource[],
): ReadonlySet<string> => {
	const tainted = new Set(declaredServiceNames(sources));
	let changed = true;
	while (changed) {
		changed = false;
		for (const { source } of sources) {
			if (addImportedServiceAliases(source, tainted)) changed = true;
			for (const statement of source.statements) {
				if (
					(ts.isInterfaceDeclaration(statement) ||
						ts.isTypeAliasDeclaration(statement)) &&
					!tainted.has(statement.name.text) &&
					declarationTainted(statement, source, tainted)
				) {
					tainted.add(statement.name.text);
					changed = true;
				}
			}
		}
	}
	return tainted;
};

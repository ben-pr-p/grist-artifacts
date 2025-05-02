import { NodePath } from "@babel/core";
import * as Babel from "@babel/standalone";
import * as t from "@babel/types";

export const transformCode = (code: string) => {
  const { modifiedInput: codeWithoutExports, exportedName: componentName } =
    removeDefaultExport(code);

  const transpiledCode = Babel.transform(codeWithoutExports, {
    presets: ["react"],
    plugins: [importTransformerPlugin],
  }).code;

  return `
return function(React, recharts, uiComponents, lucide, gristHooks, jotai) {
  ${transpiledCode}
  return ${componentName};
}
  `;
};

const importTransformerPlugin = () => ({
  name: "import-transformer",
  visitor: {
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      const source = path.node.source.value;
      const specifiers = path.node.specifiers;

      if (specifiers.length === 0) return;

      let objectName: string;
      if (source === "react") {
        objectName = "React";
      } else if (source.startsWith("@/components/ui")) {
        objectName = "uiComponents";
      } else if (source === "lucide-react") {
        objectName = "lucide";
      } else if (source === "grist-hooks") {
        objectName = "gristHooks";
      } else if (source === "jotai") {
        objectName = "jotai";
      } else if (source === "util-hooks") {
        objectName = "utilHooks";
      } else {
        objectName = source;
      }

      const properties = specifiers
        .map((specifier) => {
          if (t.isImportSpecifier(specifier)) {
            const imported = specifier.imported;
            const importedName = t.isIdentifier(imported)
              ? imported.name
              : t.isStringLiteral(imported)
              ? imported.value
              : null;

            if (importedName === null) {
              console.warn("Unexpected import specifier type");
              return null;
            }

            return t.objectProperty(
              t.identifier(importedName),
              t.identifier(specifier.local.name),
              false,
              importedName === specifier.local.name
            );
          }
          return null;
        })
        .filter((prop): prop is t.ObjectProperty => prop !== null);

      const newDeclaration = t.variableDeclaration("const", [
        t.variableDeclarator(
          t.objectPattern(properties),
          t.identifier(objectName)
        ),
      ]);

      path.replaceWith(newDeclaration);
    },
  },
});

export const removeDefaultExport = (
  input: string
): {
  modifiedInput: string;
  exportedName: string | null;
} => {
  // Regex to match the default export with declaration line
  const defaultExportWithDeclarationRegex =
    /export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*{[^}]*}/;

  // Regex to match the default export line
  const defaultExportRegex = /export\s+default\s+([A-Za-z0-9_]+);?/;

  let match = input.match(defaultExportWithDeclarationRegex);
  let exportedName: string | null = null;
  let modifiedInput = input;

  if (match) {
    exportedName = match[1];
    // Remove the 'export default ' part but keep the rest of the declaration
    modifiedInput = modifiedInput
      .replace(/export\s+default\s+function/, "function")
      .trim();
  } else {
    match = input.match(defaultExportRegex);
    if (match) {
      exportedName = match[1];
      // Remove the matched line from the input
      modifiedInput = modifiedInput.replace(defaultExportRegex, "").trim();
    }
  }

  return { modifiedInput, exportedName };
};

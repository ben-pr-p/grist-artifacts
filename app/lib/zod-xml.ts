import { XMLParser } from "fast-xml-parser";
import {
  ZodArray,
  ZodBoolean,
  ZodFirstPartyTypeKind,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  z,
  type ZodSchema,
} from "zod";

function getPropertyEntries(
  schema: ZodObject<any, any>
): [string, ZodSchema][] {
  return Object.entries(schema.shape);
}

type UnknownXML = Record<string, unknown> | unknown[] | unknown | null;

function isXMLRecord(xml: UnknownXML): xml is Record<string, unknown> {
  return typeof xml === "object" && xml !== null;
}

function isXMLArray(xml: UnknownXML): xml is unknown[] {
  return Array.isArray(xml);
}

function isPrimitive(xml: UnknownXML): xml is string | number | boolean {
  return (
    typeof xml === "string" ||
    typeof xml === "number" ||
    typeof xml === "boolean"
  );
}

function isXMLTextNode(xml: UnknownXML): xml is Record<string, string> {
  return typeof xml === "object" && xml !== null && "#text" in xml;
}

function throwWithPathIfParseFailsOrReturn(
  path: string[],
  result: z.SafeParseReturnType<any, any>
) {
  if (!result.success) {
    throw new Error(`Failed at ${path.join(".")}: ${result.error}`);
  }
  return result.data;
}

class UnparsedString extends ZodString {
  constructor() {
    super({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: false,
    });
  }
}

export const createUnparsedString = () => new UnparsedString();

function getUnparsedStringNodeNames(
  schema: ZodSchema,
  path: string[] = [],
  acc: string[] = []
): string[] {
  const newAcc = [...acc];
  if (schema instanceof ZodObject) {
    const entries = getPropertyEntries(schema);
    for (const [key, value] of entries) {
      if (
        value instanceof UnparsedString ||
        (value instanceof ZodOptional &&
          value._def.innerType instanceof UnparsedString)
      ) {
        newAcc.push(path.concat([key]).join("."));
      } else if (value instanceof ZodObject) {
        newAcc.push(
          ...getUnparsedStringNodeNames(value, [...path, key], newAcc)
        );
      } else if (value instanceof ZodArray) {
        // What to do here?
        newAcc.push(
          ...getUnparsedStringNodeNames(value, [...path, key], newAcc)
        );
      }
    }
  } else if (schema instanceof ZodArray) {
    const recursionResult = getUnparsedStringNodeNames(
      schema.element,
      path,
      newAcc
    );
    newAcc.push(...recursionResult);
  }
  return newAcc;
}

export class ZodXml {
  zSchema: ZodSchema;
  parser: XMLParser;
  unparsedStringNodeNames: string[];

  constructor(zSchema: ZodSchema) {
    this.zSchema = zSchema;
    this.unparsedStringNodeNames = getUnparsedStringNodeNames(zSchema);
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      parseAttributeValue: true,
      stopNodes: this.unparsedStringNodeNames,
    });
  }

  fromXmlToZod(
    xml: UnknownXML,
    schema: ZodSchema,
    path: string[]
  ): z.infer<ZodSchema> {
    const isArrayRequested = schema instanceof ZodArray;
    const isTextRequested =
      schema instanceof ZodString ||
      (schema instanceof ZodOptional &&
        schema._def.innerType instanceof ZodString);

    // console.log(path);
    // console.log(xml);
    // console.log(schema);
    // console.log(isTextRequested);
    // console.log(isXMLTextNode(xml));

    if (isTextRequested) {
      if (isPrimitive(xml)) {
        return throwWithPathIfParseFailsOrReturn(path, schema.safeParse(xml));
      } else if (isXMLTextNode(xml)) {
        // It may have had other properties, so we need to return the #text path
        const text = xml["#text"];
        return throwWithPathIfParseFailsOrReturn(path, schema.safeParse(text));
      } else {
        return throwWithPathIfParseFailsOrReturn(path, schema.safeParse(null));
      }
    }

    if (isPrimitive(xml)) {
      if (isArrayRequested) {
        return throwWithPathIfParseFailsOrReturn(path, schema.safeParse([xml]));
      }
      return throwWithPathIfParseFailsOrReturn(path, schema.safeParse(xml));
    }

    if (isXMLArray(xml)) {
      if (isArrayRequested) {
        return throwWithPathIfParseFailsOrReturn(path, schema.safeParse(xml));
      }
      throw new Error("Array requested but primitive provided");
    }

    if (isXMLRecord(xml)) {
      if (isArrayRequested) {
        // Check if there's only one property which is an array
        const keys = Object.keys(xml);
        const firstKey = keys[0];
        const firstKeyValues = xml[firstKey];
        if (keys.length === 1 && Array.isArray(firstKeyValues)) {
          // Transform it to push down the key
          const transformed = firstKeyValues.map((item: unknown) => ({
            [firstKey]: item,
          }));

          return throwWithPathIfParseFailsOrReturn(
            path,
            schema.safeParse(transformed)
          );
        }
        return throwWithPathIfParseFailsOrReturn(path, schema.safeParse([xml]));
      }

      if (schema instanceof ZodObject) {
        // Iterate through properties and recurse
        const entries = getPropertyEntries(schema);
        const result: Record<string, unknown> = {};
        for (const [key, value] of entries) {
          const xmlValue = xml[key];
          result[key] = this.fromXmlToZod(xmlValue, value, [...path, key]);
        }
        return result;
      }
    }

    return throwWithPathIfParseFailsOrReturn(path, schema.safeParse(xml));
  }

  parse(xml: string, streaming = false): z.infer<ZodSchema> {
    if (!streaming) {
      const asJs = this.parser.parse(xml);
      return this.fromXmlToZod(asJs, this.zSchema, []);
    }
    return this.parseAllowingInProgress(xml);
  }

  parseAllowingInProgress(xml: string): z.infer<ZodSchema> {
    try {
      const asJs = this.parser.parse(xml);
      return this.fromXmlToZod(asJs, this.zSchema, []);
    } catch (ex) {
      if (ex instanceof Error && ex.message.includes("Unexpected end of ")) {
        const missingEndingTag = ex.message.replace("Unexpected end of ", "");
        const updatedString = `${xml}</${missingEndingTag}>`;
        return this.parseAllowingInProgress(updatedString);
      }
      throw ex;
    }
  }

  /**
   * Returns a string that provides
   */
  describe(
    key: string = "",
    subSchema: ZodSchema = this.zSchema,
    nestingLevel = -1
  ): string {
    if (
      subSchema instanceof ZodString ||
      subSchema instanceof ZodNumber ||
      subSchema instanceof ZodBoolean
    ) {
      const descriptionString = subSchema.description
        ? ` (${subSchema.description})`
        : "";

      return `${getTypeLabel(subSchema)}${descriptionString}`;
    }

    if (subSchema instanceof ZodArray) {
      return this.describe(key, subSchema.element, nestingLevel + 1);
    }

    // Return the top-level properties
    if (subSchema instanceof ZodObject) {
      const entries = getPropertyEntries(subSchema);
      const entriesToRecurseWith = entries.filter(
        ([_, value]) => !value.description?.includes("as_attribute")
      );

      const fullRecursionResult = entriesToRecurseWith
        .map(([key, value]) => {
          const recursionResult = this.describe(key, value, nestingLevel + 1);
          return recursionResult;
        })
        .join("\n");

      const attributeLines = entries
        .filter(([_, value]) => value.description?.includes("as_attribute"))
        .map(([key, value]) => {
          const description = value.description?.replace("as_attribute", "");
          return `${key}="${description ? `${description} ` : ""}${getTypeLabel(
            value
          )}"`;
        })
        .join("\n");

      const useSelfClosingTag = entriesToRecurseWith.length === 0;
      if (useSelfClosingTag) {
        return `<${key} ${attributeLines} />`;
      }

      const keyOpener = key === "" ? "" : `<${key}>`;
      const keyCloser = key === "" ? "" : `</${key}>`;

      const container = `${keyOpener} ${attributeLines} ${fullRecursionResult} ${keyCloser}`;
      return container;
    }

    throw new Error("Unknown schema type in describe");
  }
}

export default ZodXml;

function getTypeLabel(schema: ZodSchema): string {
  if (schema instanceof ZodString) {
    return "string";
  }
  if (schema instanceof ZodNumber) {
    return "number";
  }
  if (schema instanceof ZodBoolean) {
    return "boolean";
  }
  throw new Error("Unknown schema type in getTypeLabel");
}

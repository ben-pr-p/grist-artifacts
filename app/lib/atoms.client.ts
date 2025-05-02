import { atom } from "jotai";
import { atomWithGristBacking } from "./grist.client";

export const recordsAtom = atom<Record<string, unknown>[]>([]);
export const columnDefinitionsAtom = atom<GristColumnDefinition[]>([]);
export const userCodeAtom = atomWithGristBacking<string>("userCode", "");
export const transformedCodeAtom = atomWithGristBacking<string>(
  "transformedCode",
  ""
);
export const transformedCodeIsLoadingAtom = atom(false);
export const artifactPurposeAtom = atomWithGristBacking<string>(
  "artifactPurpose",
  ""
);

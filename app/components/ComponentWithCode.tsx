import { useMemo } from "react";
import * as React from "react";
import * as recharts from "recharts";
import * as uiComponents from "@/components/ui";
import * as lucide from "lucide-react";
import {
  useInsertRecord,
  useUpdateRecord,
  useDeleteRecord,
  useOtherTableRecords,
  atomWithGristBacking,
  useSQLQuery,
  useSelectedRows,
  useCursorRowId,
} from "@/lib/grist.client";
import { useAtom } from "jotai";
import { useSessionStorage } from "@/lib/hooks.client";
import { useLocalStorage } from "@/lib/hooks.client";

const gristHooks = {
  useInsertRecord,
  useUpdateRecord,
  useDeleteRecord,
  useOtherTableRecords,
  atomWithGristBacking,
  useSQLQuery,
  useSelectedRows,
  useCursorRowId,
};

const utilHooks = {
  useLocalStorage,
  useSessionStorage,
};

const jotai = {
  useAtom,
};

const getReactComponentFromCode = (transformedCode: string) => {
  const factoryFunction = new Function(transformedCode)();
  const component = factoryFunction(
    React,
    recharts,
    uiComponents,
    lucide,
    gristHooks,
    jotai,
    utilHooks
  );

  return component;
};

type ComponentWithCodeProps = {
  transformedCode: string;
  componentProps?: {
    [key: string]: any;
  };
};

export const ComponentWithCode = ({
  transformedCode,
  componentProps = {},
}: ComponentWithCodeProps) => {
  const Component = useMemo(() => {
    return getReactComponentFromCode(transformedCode);
  }, [transformedCode]);

  return <Component {...componentProps} />;
};

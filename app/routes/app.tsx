import type { Route } from "./+types/app";
import { useAtomValue } from "jotai";
import { recordsAtom, transformedCodeAtom } from "@/lib/atoms.client";
import { ComponentWithCode } from "@/components/ComponentWithCode";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorView } from "@/components/ErrorView";
import { useState, useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Grist Artifacts" },
    { name: "description", content: "Grist Artifacts" },
  ];
}

export default function Home() {
  const transformedCode = useAtomValue(transformedCodeAtom);
  const records = useAtomValue(recordsAtom);
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (lastErrorCode && transformedCode !== lastErrorCode) {
      setErrorBoundaryKey(prev => prev + 1);
      setLastErrorCode(null);
    }
  }, [transformedCode, lastErrorCode]);

  if (
    transformedCode === null ||
    transformedCode === undefined ||
    transformedCode === ""
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="text-2xl font-bold">No code to display</div>
        <Link to="/editor">
          <Button>Edit This Widget</Button>
        </Link>
      </div>
    );
  }

  return (
    <ErrorBoundary 
      key={errorBoundaryKey}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorView 
          error={error} 
          onCodeUpdate={() => {
            setLastErrorCode(transformedCode);
          }}
          resetErrorBoundary={resetErrorBoundary}
        />
      )}
    >
      <ComponentWithCode
        transformedCode={transformedCode}
        componentProps={{ data: records }}
      />
    </ErrorBoundary>
  );
}

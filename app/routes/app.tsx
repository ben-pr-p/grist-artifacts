import type { Route } from "./+types/editor";
import { useAtomValue } from "jotai";
import { recordsAtom, transformedCodeAtom } from "@/lib/atoms.client";
import { ComponentWithCode } from "@/components/ComponentWithCode";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Grist Artifacts" },
    { name: "description", content: "Grist Artifacts" },
  ];
}

export default function Home() {
  const transformedCode = useAtomValue(transformedCodeAtom);
  const records = useAtomValue(recordsAtom);

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
    <ComponentWithCode
      transformedCode={transformedCode}
      componentProps={{ data: records }}
    />
  );
}

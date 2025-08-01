import type { Route } from "./+types/editor";
import { Button } from "@/components/ui/button";
import { X, Copy, Check } from "lucide-react";
import { Link } from "react-router";
import { transformedCodeIsLoadingAtom, userCodeAtom } from "@/lib/atoms.client";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ErrorBoundary } from "react-error-boundary";
import { ComponentWithCode } from "@/components/ComponentWithCode";
import { recordsAtom, transformedCodeAtom } from "@/lib/atoms.client";
import { useMutation } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { AIChat } from "@/components/AIChat";
import { transformCode } from "@/lib/compiler.client";
import CodeEditor from "@/components/CodeEditor";
import { ErrorView } from "@/components/ErrorView";
import { useState } from "react";

export default function Editor(_props: Route.ComponentProps) {
  const [userCode, setUserCode] = useAtom(userCodeAtom);
  const records = useAtomValue(recordsAtom);
  const [transformedCode, setTransformedCode] = useAtom(transformedCodeAtom);
  const setTransformedCodeIsLoading = useSetAtom(transformedCodeIsLoadingAtom);
  const [copied, setCopied] = useState(false);

  const transformCodeMutation = useMutation({
    mutationKey: ["transformCode"],
    mutationFn: async (code: string) => {
      return transformCode(code);
    },
    onSuccess: (transformedCode) => {
      setTransformedCodeIsLoading(false);
      setTransformedCode(transformedCode);
    },
  });

  const handleUserCodeChange = useDebouncedCallback((value: string) => {
    setUserCode(value);
    setTransformedCodeIsLoading(true);
    transformCodeMutation.mutate(value);
  }, 1000);

  const handleCopy = () => {
    // Create a temporary textarea element
    const textArea = document.createElement("textarea");
    textArea.value = userCode;
    
    // Make it invisible and append it to the body
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      // Attempt to copy the text
      const successful = document.execCommand("copy");
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy code:", err);
    }

    // Clean up: remove the temporary textarea
    document.body.removeChild(textArea);
  };

  return (
    <div className="flex flex-col h-full border rounded-lg shadow-sm bg-background">
      {/* Main Editor Section */}
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center p-2 border-b bg-muted/30">
          <h2 className="text-sm font-medium">Code Editor</h2>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
            <Link to="/">
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <X className="h-3.5 w-3.5" />
                <span>{"Close"}</span>
              </Button>
            </Link>
          </div>
        </div>

        <CodeEditor
          initialCode={userCode}
          onCodeUpdated={handleUserCodeChange}
          propCode={userCode}
        >
          <div className="flex-1 h-full overflow-hidden">
            <div className="h-full p-4 bg-muted/20 overflow-auto">
              <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg border-muted p-8">
                {userCode ? (
                  <ErrorBoundary
                    fallbackRender={({ error }) => <ErrorView error={error} />}
                  >
                    <ComponentWithCode
                      transformedCode={transformedCode}
                      componentProps={{ data: records }}
                    />
                  </ErrorBoundary>
                ) : (
                  <div className="text-muted-foreground text-center">
                    <p className="text-sm">Write some code to see a preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CodeEditor>
      </div>

      <AIChat data={records} onUserCodeChange={handleUserCodeChange} />
    </div>
  );
}

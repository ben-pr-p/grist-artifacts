import React, { useEffect, useRef, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  useActiveCode,
} from "@codesandbox/sandpack-react";

type Props = {
  children: React.ReactNode;
  onCodeUpdated: (code: string) => void;
  propCode: string;
};

const SandpackEditorWithCallback = (props: Props) => {
  const { onCodeUpdated, children, propCode } = props;
  const { code, updateCode } = useActiveCode();
  const [priorPropCode, setPriorPropCode] = useState(propCode);

  useEffect(() => {
    onCodeUpdated(code);
  }, [code, onCodeUpdated]);

  useEffect(() => {
    if (priorPropCode !== propCode) {
      console.log("Resetting code");
      updateCode(propCode);
      setPriorPropCode(propCode);
    }
  }, [propCode, updateCode, priorPropCode]);

  return (
    <div className="h-full flex flex-col">
      {children}
      <SandpackCodeEditor
        showTabs
        style={{ height: "100%" }}
        showLineNumbers={true}
        showInlineErrors={false}
        wrapContent={true}
        closableTabs={false}
      />
    </div>
  );
};

export default function CodeEditor({
  children,
  onCodeUpdated,
  initialCode,
}: Props & { initialCode: string }) {
  return (
    <SandpackProvider
      template="react"
      files={{
        "App.tsx": { code: initialCode, active: true, readOnly: false },
      }}
    >
      <SandpackEditorWithCallback
        onCodeUpdated={onCodeUpdated}
        propCode={initialCode}
      >
        {children}
      </SandpackEditorWithCallback>
    </SandpackProvider>
  );
}

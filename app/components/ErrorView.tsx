import React from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface ErrorViewProps {
  error: Error;
}

const ErrorView: React.FC<ErrorViewProps> = ({ error }) => {
  const errorDetails = `Error: ${error.message}\n\nStack Trace:\n${
    error.stack || "Not available"
  }`;

  const handleCopy = () => {
    // Create a temporary textarea element
    const textArea = document.createElement("textarea");
    textArea.value = errorDetails;

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
        alert("Error details copied to clipboard!");
      } else {
        alert("Failed to copy error details (execCommand returned false).");
      }
    } catch (err) {
      console.error("Failed to copy error details: ", err);
      alert("Failed to copy error details (exception caught).");
    }

    // Clean up: remove the temporary textarea
    document.body.removeChild(textArea);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
      <h2 className="text-lg font-semibold mb-2">An Error Occurred</h2>
      <pre className="text-sm bg-destructive/20 p-3 rounded-md w-full overflow-auto max-h-60 mb-4">
        {error.message}
      </pre>
      <Button variant="destructive" onClick={handleCopy} size="sm">
        <Copy className="mr-2 h-4 w-4" /> Copy Error Details
      </Button>
      {/* Optional: Add a button to reset the boundary if needed */}
      {/* <Button variant="outline" onClick={resetErrorBoundary} size="sm" className="mt-2">
        Try Again
      </Button> */}
    </div>
  );
};

ErrorView.displayName = "ErrorView";

export { ErrorView };

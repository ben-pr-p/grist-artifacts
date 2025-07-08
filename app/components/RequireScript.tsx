import React, { useState, useEffect, type ReactNode } from "react";

interface RequireScriptProps {
  /** URL of the script to load */
  src: string;
  /** Content to render after script loads */
  children: ReactNode;
  /** Optional content to show while loading (defaults to null) */
  fallback?: ReactNode;
  /** Optional callback when script loads successfully */
  onLoad?: () => void;
  /** Optional callback when script fails to load */
  onError?: () => void;
  /** Whether to remove the script when component unmounts (defaults to false) */
  removeOnUnmount?: boolean;
  /** Optional function to check if script is already loaded */
  checkLoaded?: () => boolean;
}

/**
 * RequireScript - A component that loads an external script and renders children only when loaded
 */
const RequireScript: React.FC<RequireScriptProps> = ({
  src,
  children,
  fallback = null,
  onLoad,
  onError,
  removeOnUnmount = false,
  checkLoaded,
}) => {
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [scriptError, setScriptError] = useState<boolean>(false);

  useEffect(() => {
    // Check if the script already exists in the document
    let scriptElement = document.querySelector(
      `script[src="${src}"]`
    ) as HTMLScriptElement | null;
    let needsToBeCreated = false;

    // If script exists and checkLoaded returns true, consider it loaded
    if (scriptElement && checkLoaded && checkLoaded()) {
      setScriptLoaded(true);
      return;
    }

    // If script doesn't exist, create it
    if (!scriptElement) {
      needsToBeCreated = true;
      scriptElement = document.createElement("script");
      scriptElement.src = src;
      scriptElement.async = true;
      scriptElement.setAttribute("data-require-script", "true");
    }
    // If script exists but is already loaded (using data-loaded attribute)
    else if (scriptElement.hasAttribute("data-loaded")) {
      setScriptLoaded(true);
      return;
    }

    // Set up successful load handler
    const handleLoad = (): void => {
      scriptElement?.setAttribute("data-loaded", "true");
      setScriptLoaded(true);
      if (onLoad) onLoad();
    };

    // Set up error handler
    const handleError = (): void => {
      console.error(`Failed to load script: ${src}`);
      setScriptError(true);
      if (onError) onError();
    };

    // Attach event handlers
    scriptElement.addEventListener("load", handleLoad);
    scriptElement.addEventListener("error", handleError);

    // Add to document if we created it
    if (needsToBeCreated) {
      document.body.appendChild(scriptElement);
    }

    // Clean up function
    return () => {
      // Always remove event listeners
      scriptElement?.removeEventListener("load", handleLoad);
      scriptElement?.removeEventListener("error", handleError);

      // Only remove the script element if removeOnUnmount is true
      if (removeOnUnmount && needsToBeCreated && scriptElement) {
        document.body.removeChild(scriptElement);
      }
    };
  }, [src, onLoad, onError, removeOnUnmount, checkLoaded]);

  if (scriptError) {
    return (
      <div className="script-load-error">
        Failed to load required script: {src}
      </div>
    );
  }

  return scriptLoaded ? <>{children}</> : <>{fallback}</>;
};

export default RequireScript;

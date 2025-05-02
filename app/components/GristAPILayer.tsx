import { recordsAtom, columnDefinitionsAtom } from "@/lib/atoms.client";
import { useSetAllGristOptions } from "@/lib/grist.client";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

export const GristAPILayer = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) => {
  const setRecords = useSetAtom(recordsAtom);
  const setColumnDefinitions = useSetAtom(columnDefinitionsAtom);
  const setAllGristOptions = useSetAllGristOptions();
  const navigate = useNavigate();

  const [gristReady, setGristReady] = useState(false);

  const updateGristReady = useCallback(() => {
    window.grist.ready({
      requiredAccess: "full",
      allowSelectBy: true,
      onEditOptions: () => navigate("/editor"),
    });

    setGristReady(true);
  }, [navigate]);

  useEffect(() => {
    updateGristReady();

    window.grist.onRecords(
      (newRecords) => {
        setRecords(newRecords);
        if (newRecords.length > 0) {
          const sampleRecord = newRecords[0] as Record<string, unknown>;
          const newColumnDefinitions = Object.keys(sampleRecord).map((key) => ({
            name: key,
            title: key.charAt(0).toUpperCase() + key.slice(1),
            type: typeof sampleRecord[key],
          }));
          setColumnDefinitions(newColumnDefinitions);
        }
      },
      { format: "rows", includeColumns: "all", keepEncoded: false }
    );

    window.grist.onOptions((options) => {
      if (typeof options !== "object" || options === null) {
        console.error("Options are not an object", options);
        return;
      }
      setAllGristOptions(options);
    });
  }, [updateGristReady, setRecords, setAllGristOptions, setColumnDefinitions]);

  return gristReady ? children : fallback;
};

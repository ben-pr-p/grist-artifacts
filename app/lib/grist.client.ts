import {
  QueryClient,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { atom, useSetAtom } from "jotai";
import { useState, useEffect } from "react";

// Add interfaces at the top of the file
interface GristTable {
  id: number[];
  tableId: string[];
  primaryViewId: number[];
  summarySourceTable: number[];
  onDemand: boolean[];
  rawViewSectionRef: number[];
  recordCardViewSectionRef: number[];
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

/**
 * column format maps keys of each column to array of values for that column
 * this translates them into standard objects
 */
function gristColumnFormatToRows(columnFormat: Record<string, any[]>) {
  const columns = Object.keys(columnFormat);
  const rowCount = columnFormat[columns[0]].length;

  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, any> = {};
    for (const column of columns) {
      row[column] = columnFormat[column][i];
    }
    rows.push(row);
  }

  return rows;
}

export function useTableList() {
  const { data } = useSuspenseQuery({
    queryKey: ["tableList"],
    queryFn: async () => {
      const table = await window.grist.docApi.fetchTable("_grist_Tables");

      const records = await Promise.all(
        table.tableId.map((id) =>
          window.grist.docApi
            .fetchTable(id as string)
            .then((columnFormat) => gristColumnFormatToRows(columnFormat))
        )
      );

      const firstThreeRecords = records.map((records) =>
        recursiveTrimToThreeArrayMembers(records as any)
      );

      return table.tableId.map((id, index) => ({
        tableId: id,
        sampleRecords: firstThreeRecords[index],
      }));
    },
  });

  return data;
  // return [];
}

export function useSelectedTable() {
  const { data } = useSuspenseQuery({
    queryKey: ["selectedTable"],
    queryFn: async () => {
      const table = await window.grist.fetchSelectedTable();
      return table;
    },
  });

  return data;
}

export function useSelectRecord() {
  const [selectedRecord, _setSelectedRecord] = useState<number | null>(null);

  const setSelectedRecord = (record: number | null) => {
    _setSelectedRecord(record);
    window.grist.setSelectedRows(record ? [record] : null);
  };

  return { selectedRecord, setSelectedRecord };
}

export function useInsertRecord(tableId?: string) {
  const mutation = useMutation({
    mutationFn: async (record: any) => {
      const table = await window.grist.getTable(tableId);
      return await table.create({ fields: record });
    },
  });

  return mutation;
}

export function useUpdateRecord(tableId?: string) {
  const mutation = useMutation({
    mutationFn: async (record: { id: number; fields: any }) => {
      const table = await window.grist.getTable(tableId);
      return await table.update(record);
    },
  });

  return mutation;
}

export function useDeleteRecord(tableId?: string) {
  const mutation = useMutation({
    mutationFn: async (record: number) => {
      const table = await window.grist.getTable(tableId);
      return await table.destroy(record);
    },
  });

  return mutation;
}

export function useOtherTableRecords(tableId: string) {
  const { data } = useQuery({
    queryKey: ["otherTableRecords", tableId],
    queryFn: async () => {
      const columnFormat = await window.grist.docApi.fetchTable(tableId);
      return gristColumnFormatToRows(columnFormat as Record<string, any[]>);
    },
  });

  return data;
}

export function describeGristStructure(
  firstThreeRecords: Record<string, any>[],
  recordCount: number,
  otherGristTables: { tableId: string; sampleRecords: Record<string, any>[] }[]
) {
  return `
  <grist_table_structure>
    These records are avalable via the \`data\` props.
    <first_three_sample_records>
      ${firstThreeRecords
        .map((record) => JSON.stringify(record, null, 2))
        .join("\n\n")}
    </first_three_sample_records>
    <sample_record_count>
      There are ${recordCount} records in the table.
    </sample_record_count>
  </grist_table_structure>
  <other_grist_tables>
    ${otherGristTables
      .map(
        (table) => `
      <other_grist_table>
        <table_id>${table.tableId}</table_id>
        <sample_records>
          ${table.sampleRecords
            .map((record) => JSON.stringify(record, null, 2))
            .join("\n\n")}
        </sample_records>
      </other_grist_table>
      `
      )
      .join("\n\n")}
  </other_grist_tables>
  `;
}

/**
 * Recursively trims an object to only include the first three members of any arrays.
 * Also recursively processes nested objects and arrays.
 */
export const recursiveTrimToThreeArrayMembers = <T>(object: T): T => {
  if (Array.isArray(object)) {
    return object
      .slice(0, 3)
      .map((item) => recursiveTrimToThreeArrayMembers(item)) as T;
  } else if (typeof object === "object" && object !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(object)) {
      result[key] = recursiveTrimToThreeArrayMembers(value);
    }
    return result as T;
  }
  return object;
};

const allGristOptionsAtom = atom<Record<string, unknown>>({});
export const useSetAllGristOptions = () => {
  return useSetAtom(allGristOptionsAtom);
};

export function atomWithGristBacking<T>(key: string, defaultValue: T) {
  const hiddenAtom = atom<{
    updatedInMountSession: boolean;
    value: T;
  }>({
    updatedInMountSession: false,
    value: defaultValue,
  });

  return atom<T, [T], void>(
    (get) => {
      const atomValue = get(hiddenAtom);
      const allGristOptions = get(allGristOptionsAtom);

      if (atomValue.updatedInMountSession === false) {
        const optionValue = allGristOptions[key];
        if (optionValue === null || optionValue === undefined) {
          return defaultValue;
        }
        return optionValue as T;
      }

      // Atom has been updated in the mount session
      return atomValue.value;
    },
    (_get, set, update) => {
      window.grist.setOption(key, update).then(() => {
        console.log("Updated Grist Options", key, update);
      });
      set(hiddenAtom, {
        updatedInMountSession: true,
        value: update,
      });
    }
  );
}

export function useSQLQuery(sql: string, args: string[]) {
  const {
    data: accessToken,
    isLoading: accessTokenLoading,
    error: accessTokenError,
  } = useQuery({
    queryKey: ["accessToken"],
    queryFn: async () => {
      const result = await window.grist.docApi.getAccessToken({});
      return result;
    },
  });

  const {
    data: sqlResult,
    isLoading: sqlResultLoading,
    error: sqlResultError,
  } = useQuery({
    queryKey: ["sqlQuery", sql],
    enabled: !!accessToken,
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("No access token found");
      }
      const result = await fetch(
        `${accessToken.baseUrl}/sql?auth=${accessToken.token}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql, args }),
        }
      );

      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(
          `SQL query failed: ${
            (errorData as { error: string }).error || result.statusText
          }`
        );
      }

      const response = (await result.json()) as {
        records: {
          fields: Record<string, any>[];
        }[];
      };
      return response.records;
    },
  });
  return {
    data: sqlResult,
    isLoading: accessTokenLoading || sqlResultLoading,
    error: accessTokenError || sqlResultError,
  };
}

/**
 * Compares two arrays using Sets to check if they contain the same elements
 * @param arr1 First array to compare
 * @param arr2 Second array to compare
 * @returns True if arrays contain exactly the same elements, false otherwise
 */
function areSetsEqual(arr1: number[], arr2: number[]): boolean {
  // Quick length check
  if (arr1.length !== arr2.length) return false;

  // Use Set for O(1) lookups
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);

  // If sizes don't match, there are duplicates that make the arrays different
  if (set1.size !== set2.size) return false;

  // Check that every element in set1 exists in set2
  for (const item of set1) {
    if (!set2.has(item)) return false;
  }

  return true;
}

export function useSelectedRows() {
  const [previouslySelectedRows, setPreviouslySelectedRows] = useState<
    number[]
  >([]);

  const setSelectedRows = (rows: number[]) => {
    // Only update if the arrays have different elements
    if (!areSetsEqual(previouslySelectedRows, rows)) {
      setPreviouslySelectedRows([...rows]); // Create a new array to ensure state updates
      window.grist.setSelectedRows(rows);
    }
  };

  return [previouslySelectedRows, setSelectedRows];
}

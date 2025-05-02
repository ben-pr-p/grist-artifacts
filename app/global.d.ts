// /* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    grist: {
      getTable: (tableId?: string) => Promise<GristTable>;
      ready: (options?: {
        requiredAccess?: grist.AccessLevel;
        columns?: Array<GristColumnDefinition>;
        allowSelectBy?: boolean;
        onEditOptions?: () => void;
      }) => Promise<void>;
      onRecord: (
        callback: (
          record: Record<string, any>,
          mappings: Record<string, string>
        ) => void
      ) => void;
      onRecords: (
        callback: (
          records: Record<string, any>[],
          mappings: Record<string, string>
        ) => void,
        options?: {
          format?: "rows" | "columns";
          includeColumns?: "shown" | "normal" | "all";
          keepEncoded?: boolean;
        }
      ) => void;
      setSelectedRows(rowIds: number[] | null): void;
      onOptions: (
        callback: (
          options: Record<string, any>,
          interaction: {
            access_level: grist.AccessLevel;
          }
        ) => void
      ) => void;
      setOption: (key: string, value: any) => Promise<void>;
      getOption: (key: string) => Promise<any>;
      clearOptions: () => Promise<void>;
      getOptions: () => Promise<Record<string, any>>;
      setOptions: (options: Record<string, any>) => Promise<void>;
      mapColumnNames: (
        record: Record<string, any>
      ) => Record<string, any> | null;
      setCursorPos: (options: { rowId: grist.UIRowId }) => void;
      widgetApi: {
        getOption: (key: string) => Promise<any>;
      };
      docApi: grist.GristDocAPI;
      getSelectedTableIdSync(): string;
      fetchSelectedTable(options?: FetchSelectedOptions): Promise<GristTable>;
      decode_cell_value: (value: any) => any;
    };
  }

  interface GristColumnDefinition {
    name: string;
    title?: string;
    optional?: boolean;
    type?: string | string[];
    description?: string;
    allowMultiple?: boolean;
  }
}

declare namespace grist {
  interface GristAPI {
    render(path: string, target: RenderTarget, options?: RenderOptions): number;
    dispose(procId: number): void;
    subscribe(tableId: string): void;
    unsubscribe(tableId: string): void;
  }

  interface GristDocAPI {
    getDocName(): Promise<string>;
    listTables(): Promise<string[]>;
    fetchTable(tableId: string): Promise<Record<string, unknown[]>>;
    applyUserActions(
      actions: UserAction[][],
      options?: ApplyUAOptions
    ): Promise<ApplyUAResult>;
    getAccessToken(options: AccessTokenOptions): Promise<AccessTokenResult>;
    fetchSelectedRecord(
      rowId: number,
      options?: FetchSelectedOptions
    ): Promise<Record<string, any>>;
  }

  interface GristView {
    fetchSelectedRecord(
      rowId: number,
      options?: FetchSelectedOptions
    ): Promise<Record<string, any>>;
    allowSelectBy(): void;
    setCursorPos(pos: CursorPos): void;
  }

  interface RenderOptions {
    height?: number | string;
    width?: number | string;
  }

  type RenderTarget = HTMLElement | string;

  interface AccessTokenOptions {
    readOnly?: boolean;
  }

  interface AccessTokenResult {
    token: string;
    baseUrl: string;
    ttlMsecs: number;
  }

  interface FetchSelectedOptions {
    keepEncoded?: boolean;
    format?: "rows" | "columns";
    includeColumns?: "shown" | "normal" | "all";
  }

  interface CursorPos {
    rowId?: UIRowId;
    rowIndex?: number;
    fieldIndex?: number;
    sectionId?: number;
    linkingRowIds?: UIRowId[];
  }

  type UIRowId = number | "new";

  type AccessLevel = "full" | "read table" | "read table & link" | "none";

  interface InteractionOptions {
    accessLevel: AccessLevel;
  }

  enum GristObjCode {
    List = "L",
    LookUp = "l",
    Dict = "O",
    DateTime = "D",
    Date = "d",
    Skip = "S",
    Censored = "C",
    Reference = "R",
    ReferenceList = "r",
    Exception = "E",
    Pending = "P",
    Unmarshallable = "U",
    Versions = "V",
  }

  // File Parser API
  interface FileParserAPI {
    parseFile(
      file: FileSource,
      parseOptions?: ParseOptions
    ): Promise<ParseFileResult>;
  }

  interface FileSource {
    path: string;
    origName: string;
  }

  interface ParseOptions {
    NUM_ROWS?: number;
    SCHEMA?: ParseOptionSchema[];
    WARNING?: string;
  }

  interface ParseOptionSchema {
    name: string;
    label: string;
    type: string;
    visible: boolean;
  }

  interface ParseFileResult extends GristTables {
    parseOptions: ParseOptions;
  }

  // Import Source API
  interface ImportSourceAPI {
    getImportSource(): Promise<ImportSource | undefined>;
  }

  interface ImportSource {
    item: FileListItem | URL;
    options?: string | Buffer;
    description?: string;
  }

  interface FileListItem {
    kind: "fileList";
    files: FileContent[];
  }

  interface FileContent {
    content: any;
    name: string;
  }

  interface URL {
    kind: "url";
    url: string;
  }

  interface GristTable {
    table_name: string | null;
    column_metadata: GristColumn[];
    table_data: any[][];
  }

  interface GristColumn {
    id: string;
    type: string;
  }

  interface GristTables {
    tables: GristTable[];
  }

  type UserAction =
    | AddRecord
    | UpdateRecord
    | RemoveRecord
    | BulkAddRecord
    | BulkUpdateRecord
    | BulkRemoveRecord;

  interface AddRecord {
    tableId: string;
    rowId: number;
    values: Record<string, any>;
  }

  interface UpdateRecord {
    tableId: string;
    rowId: number;
    columns: string[];
    values: any[];
  }

  interface RemoveRecord {
    tableId: string;
    rowId: number;
  }

  interface BulkAddRecord {
    tableId: string;
    rowIds: number[];
    columns: string[];
    values: any[][];
  }

  interface BulkUpdateRecord {
    tableId: string;
    rowIds: number[];
    columns: string[];
    values: any[][];
  }

  interface BulkRemoveRecord {
    tableId: string;
    rowIds: number[];
  }

  interface ApplyUAOptions {
    desc?: string;
  }

  interface ApplyUAResult {
    retValues: any[][];
    isModification: boolean;
  }
}

export {};

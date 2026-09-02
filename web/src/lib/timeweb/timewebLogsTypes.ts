export type TimewebLogKind = "runtime" | "deploy";

export type TimewebLogSource = {
  id: string;
  label: string;
  appId: string;
};

export type TimewebLogEntry = {
  id: string;
  raw: string;
  message: string;
  service: string;
  level: string;
  severity: "info" | "warn" | "error" | "debug";
  timestamp: string | null;
  timestamp_ms: number | null;
};

export type TimewebLogsStatus = {
  configured: boolean;
  sources: TimewebLogSource[];
};

export type TimewebDeploySummary = {
  id: number | string;
  status: string | null;
  created_at: string | null;
};

export type TimewebLogsResponse = {
  entries: TimewebLogEntry[];
  total: number;
  source: string;
  kind: TimewebLogKind;
  deploy_id: number | string | null;
};

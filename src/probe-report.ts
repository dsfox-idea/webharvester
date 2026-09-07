/** Shape of the report produced by extension/probes/runner.js. */
export interface ProbeExercise {
  status: 'passed' | 'failed' | 'skipped';
  detail: string;
}

export interface ProbeResult {
  permission: string;
  granted: boolean;
  namespace: { name: string; present: boolean } | null;
  conditional: string | null;
  exercise: ProbeExercise;
}

export interface ProbeReport {
  extensionId: string;
  manifestVersion: number;
  userAgent: string;
  ranAt: string;
  declared: string[];
  granted: string[];
  grantedOrigins: string[];
  results: ProbeResult[];
}

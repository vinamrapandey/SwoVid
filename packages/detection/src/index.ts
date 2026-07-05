/// <reference types="chrome" />
/// <reference path="./globals.d.ts" />

// Public API of the detection package
export { detectContent, clearCache, getCacheSize } from './orchestrator';
export type {
  DetectionInput,
  DetectionResult,
  DetectionSignal,
  DetectionProvider,
  VerdictState,
  ContentType,
  SwoVidSettings,
  PageScanSummary,
} from './types';
export { DEFAULT_SETTINGS } from './constants';

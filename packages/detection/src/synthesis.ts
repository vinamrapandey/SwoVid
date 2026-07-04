import type { DetectionSignal, DetectionResult, VerdictState } from './types';

export function synthesiseVerdict(
  signals: DetectionSignal[],
  totalDurationMs: number,
  fromCache = false,
): DetectionResult {

  const available = signals.filter(s => s.available && s.verdict !== null);

  // ── Priority 1: Any certain signal (C2PA cryptographic proof) wins immediately
  const certainAI = available.find(s => s.certain && s.verdict === 'verified_ai');
  if (certainAI) {
    return { verdict: 'verified_ai', confidence: 100, signals, totalDurationMs, fromCache };
  }

  const certainHuman = available.find(s => s.certain && s.verdict === 'verified_human');
  if (certainHuman) {
    return { verdict: 'verified_human', confidence: 100, signals, totalDurationMs, fromCache };
  }

  // ── Priority 2: Probabilistic signals
  const aiSignals = available.filter(
    s => s.verdict === 'verified_ai' || s.verdict === 'likely_ai' || s.verdict === 'possibly_ai'
  );
  const humanSignals = available.filter(s => s.verdict === 'verified_human');

  // Strong AI signals — 2+ agree
  if (aiSignals.length >= 2) {
    const avgConfidence = Math.round(
      aiSignals.reduce((sum, s) => sum + s.confidence, 0) / aiSignals.length
    );
    return { verdict: 'likely_ai', confidence: avgConfidence, signals, totalDurationMs, fromCache };
  }

  // Single AI signal
  if (aiSignals.length === 1) {
    const sig = aiSignals[0];
    const verdict: VerdictState = sig.confidence >= 80 ? 'likely_ai' : 'possibly_ai';
    return { verdict, confidence: sig.confidence, signals, totalDurationMs, fromCache };
  }

  // Human signals
  if (humanSignals.length >= 1) {
    const avgConfidence = Math.round(
      humanSignals.reduce((sum, s) => sum + s.confidence, 0) / humanSignals.length
    );
    return { verdict: 'verified_human', confidence: avgConfidence, signals, totalDurationMs, fromCache };
  }

  // No conclusive signals
  return { verdict: 'unverifiable', confidence: 0, signals, totalDurationMs, fromCache };
}

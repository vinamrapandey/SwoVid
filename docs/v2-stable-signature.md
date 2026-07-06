# V2 Scoping — Stable Signature (Layer 3) watermark detection

Status: **scoping / not yet built**
Owner: Vinny
Plugs into: `packages/detection/src/providers/stubs.ts` → real
`StableSignatureProvider` implementing the existing `DetectionProvider`
interface. No changes to the orchestrator, synthesis, or UI are required.

---

## 1. TL;DR / recommendation

Stable Signature is a **high-precision, low-coverage** signal. It can prove an
image was produced by a *specific watermarked* diffusion decoder, but it does
**not** detect Stable Diffusion / FLUX images in general, and Meta's released
weights are **non-commercial**.

**Recommendation:** build Layer 3 as a **watermark-detection layer**, but:
- Do **not** ship Meta's Stable Signature extractor weights in a commercial
  product (licensing — see §3). Use an open, commercially-usable watermark
  model or a self-trained extractor instead.
- Frame it honestly in the UI: "watermark detected" is strong evidence of AI;
  "no watermark" means *nothing* (absence is not evidence — same principle we
  just applied to the EXIF layer).
- Treat broad "is this AI?" detection as a **separate** problem for the V3
  forensic classifier, not for this watermark layer.

If the goal is "catch metadata-stripped AI images in the wild," a watermark
layer alone will rarely fire. Set expectations accordingly, or prioritise the
V3 classifier.

---

## 2. What Stable Signature actually is

Stable Signature (Fernandez et al., Meta AI, 2023) embeds an **invisible,
fixed bit-string watermark** into a latent-diffusion model by fine-tuning the
**VAE decoder** so that every image it outputs carries the same key. Detection
is a small **extractor CNN** (HiDDeN-style) that recovers the bits from an
image; you compare recovered bits to the known key and score the match.

Detection pipeline:
1. Decode image → RGB pixels.
2. Resize/normalise to the extractor's fixed input (e.g. 256×256).
3. Run the extractor → `k` logits → threshold to `k` bits.
4. Compare to the expected key → count matching bits `m` of `k`.
5. Under the null hypothesis (random image), matches ~ Binomial(k, 0.5).
   Compute a p-value; if `m/k` clears a threshold (very low p-value), declare
   "watermark present."

Key facts that shape scope:
- It is **statistical**, not cryptographic. High bit-accuracy = very strong
  evidence, but not a signed certificate like C2PA.
- It only detects images from a decoder watermarked with **that key**. A random
  Midjourney/DALL·E/plain-SD image is **not** detected. Coverage in the wild is
  currently small.
- Robust to mild JPEG/resize/crop, but heavy edits can destroy the watermark.

---

## 3. Licensing & model sourcing — the real blocker

| Option | License | Commercial? | Notes |
|---|---|---|---|
| Meta **Stable Signature** weights | CC-BY-NC 4.0 (non-commercial) | ❌ | Cannot ship in a paid/commercial extension. Fine for research/demo only. |
| Meta **Watermark Anything (WAM)** | Non-commercial research license | ❌ | Newer, localized watermarking; same commercial restriction. |
| **TrustMark** (Adobe/DataTrust) | MIT / permissive | ✅ | Open watermarking + detection; commercially usable. Strong candidate. |
| **Self-trained extractor** | Yours | ✅ | Full control; requires training + a watermarking pipeline. Most effort. |

**Action item before any code:** pick the model. If SwoVid is commercial, the
default should be **TrustMark** (or another permissively-licensed detector), not
Meta's Stable Signature weights. The provider name/UI copy should then reflect
the actual model. (Keep the layer's user-facing name generic — e.g. "Invisible
Watermark" — so the model can change without a UI rename.)

---

## 4. Proposed architecture in SwoVid

Runs inside the **offscreen document** (already added for C2PA) — it has DOM,
WebGL/WebGPU, Web Workers, and WASM, none of which the service worker has. The
detection stays fully local; no network, no cost.

```
offscreen document
 └─ WatermarkProvider.detect(input)
     ├─ decode: createImageBitmap(blob) → OffscreenCanvas → ImageData
     ├─ preprocess: resize to model input, normalise → Float32 NCHW tensor
     ├─ inference: onnxruntime-web session.run(tensor) → logits
     ├─ score: logits → bits → bit-accuracy vs key → p-value
     └─ return DetectionSignal { verdict, confidence, detail, certain:false }
```

### New dependencies
- `onnxruntime-web` (ORT) — runs ONNX models via WASM (baseline) or WebGPU
  (faster where available). Add to `packages/detection`.
- The **model file** (`.onnx`, quantised) — converted from the chosen
  watermark extractor.

### Build / packaging
- Extend `apps/extension/scripts/copy-wasm.mjs` to also copy:
  - the ORT `.wasm` runtime files → `public/wasm/ort/`
  - the model `watermark.onnx` → `public/models/`
- Add both to `web_accessible_resources` in `manifest.json`.
- Load model + ORT via `chrome.runtime.getURL(...)`, lazily (like C2PA), and
  cache the ORT `InferenceSession` in-module for the offscreen doc's lifetime.
- CSP already allows `'wasm-unsafe-eval'` (added for C2PA), which ORT needs.

### Provider shape (illustrative)

```ts
// packages/detection/src/providers/watermark.ts
import * as ort from 'onnxruntime-web';
import type { DetectionInput, DetectionProvider, DetectionSignal } from '../types';

let session: ort.InferenceSession | null = null;

async function getSession() {
  if (session) return session;
  ort.env.wasm.wasmPaths = chrome.runtime.getURL('wasm/ort/');
  session = await ort.InferenceSession.create(
    chrome.runtime.getURL('models/watermark.onnx'),
    { executionProviders: ['webgpu', 'wasm'] },
  );
  return session;
}

export class WatermarkProvider implements DetectionProvider {
  layer = 3;
  name = 'Invisible Watermark';
  description = 'Detects invisible AI watermarks embedded at generation time';
  supportedTypes = ['image'] as const;
  certain = false;          // statistical, not cryptographic
  runsLocal = true;
  available = true;

  async detect(input: DetectionInput): Promise<DetectionSignal> {
    const start = performance.now();
    try {
      const tensor = await preprocess(input.blob);        // decode+resize+normalise
      const sess = await getSession();
      const out = await sess.run({ [sess.inputNames[0]]: tensor });
      const { bitAccuracy, pValue } = scoreWatermark(out); // vs known key
      return this.build(bitAccuracy, pValue, performance.now() - start);
    } catch (err) {
      // no watermark / decode failure → honest "no signal", never throw
      return this.build(null, null, performance.now() - start);
    }
  }
  // build(): maps score → verdict/confidence (see §5)
}
```

Then in `orchestrator.ts`, swap the stub for the real provider:
```ts
// - StableSignatureProvider,        // stub
+ new WatermarkProvider(),
```
Everything downstream (synthesis, badge, detail panel) is unchanged — this is
exactly the extension point the `DetectionProvider` interface was designed for.

---

## 5. Decision thresholds & verdict mapping

- Pick a bit-accuracy / p-value threshold from the ROC on a labelled test set,
  targeting a **very low false-positive rate** (a watermark layer should almost
  never fire on real photos).
- Suggested mapping:
  - `p < 1e-6` (unmistakable watermark) → `verified_ai`, confidence ~97,
    `certain:false`.
  - marginal band just over threshold → `likely_ai`, confidence 80–90.
  - below threshold → `verdict:null` ("no watermark detected"), which
    contributes nothing to the verdict (absence ≠ evidence).
- Because `certain:false`, a C2PA cryptographic verdict still outranks it in
  `synthesiseVerdict`, which is correct.

---

## 6. Performance & size budget

- Model: target a **quantised ONNX < ~10 MB** so the packed extension stays
  reasonable (C2PA WASM is already ~6 MB).
- Inference: aim **< ~150 ms/image** on WASM; faster on WebGPU. Runs in the
  offscreen doc, off the page's main thread, so it never blocks scrolling.
- The orchestrator already runs providers in parallel and caches by content
  hash, so repeat images cost nothing.
- Guardrails: keep the existing `minImageSize` filter; consider skipping
  very large images (downscale before inference — the model input is fixed
  anyway).

---

## 7. Verification plan

- **Test vectors:** a fixture set of (a) known-watermarked images from the
  chosen model, (b) clean real photos, (c) non-watermarked AI images, (d)
  watermarked-then-JPEG/resized images (robustness).
- **Metrics:** bit-accuracy distribution, ROC/AUC, chosen operating point's
  FPR/TPR, and per-image latency.
- **Regression:** extend the pure-logic smoke test (as done for `synthesis`)
  to cover `scoreWatermark()` given canned extractor outputs.
- **Manual:** verify a watermarked sample badges "AI (watermark)" and a normal
  photo stays "Unknown"/"Human".

---

## 8. Effort & milestones

1. **Model decision** (licensing + pick model) — blocking, ~0.5 day of research.
2. **Convert model → quantised ONNX**, assemble test vectors — ~1–2 days.
3. **Preprocess + scoring + provider**, wire ORT into the offscreen doc,
   build/packaging (copy scripts, WAR, manifest) — ~2–3 days.
4. **Threshold tuning + verification** on the test set — ~1–2 days.
5. **UI polish** (detail-panel copy for the watermark layer) — ~0.5 day.

Rough total: **~1–1.5 weeks** for one engineer, assuming a usable
commercially-licensed model exists. Self-training an extractor adds
significantly more.

---

## 9. Risks & open questions

- **Licensing (highest):** must not ship Meta SS/WAM weights commercially.
  Resolve model choice first.
- **Coverage:** watermark detection only fires on watermarked images; it will
  not make SwoVid a general AI detector. Manage expectations / prioritise V3.
- **Bundle size:** ORT WASM + model adds several MB; watch the packed size.
- **WebGPU variance:** availability differs across machines; WASM must be a
  reliable fallback (it is, by ORT default).
- **Robustness:** aggressive re-encoding/cropping by platforms can strip the
  watermark → more "Unknown" (acceptable, honest).

---

## 10. Relationship to V3

Layer 3 (watermark) answers *"does this carry a known AI watermark?"* — precise
but narrow. Layer 5 (the SwoVid forensic model) answers *"do the pixels look
AI-generated?"* — broad but probabilistic, with its own generalisation and
false-positive challenges. They are complementary; if broad wild-image coverage
is the priority, V3 is the higher-leverage build.
```

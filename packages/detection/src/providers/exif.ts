import exifr from 'exifr';
import type { DetectionInput, DetectionProvider, DetectionSignal } from '../types';
import { AI_SOFTWARE_TAGS, AI_IPTC_SOURCE_TYPES, HUMAN_IPTC_SOURCE_TYPES } from '../constants';

// True if `tag` appears in `haystack` bounded by non-alphanumeric characters
// (i.e. as a whole token), so "luma" does not match "lumafusion".
function matchesAsToken(haystack: string, tag: string): boolean {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

export class EXIFProvider implements DetectionProvider {
  layer = 2;
  name = 'EXIF / IPTC Metadata';
  description = 'Reads file metadata — AI tools leave fingerprints in software tags and IPTC fields';
  supportedTypes = ['image'] as const;
  certain = false;
  runsLocal = true;
  available = true;

  async detect(input: DetectionInput): Promise<DetectionSignal> {
    const start = performance.now();

    try {
      const exif = await exifr.parse(input.blob, {
        tiff: true,
        xmp: true,
        iptc: true,
        icc: false,
        jfif: true,
        ihdr: false,
        multiSegment: true,
        mergeOutput: true,
      });

      if (!exif) {
        return this.buildSignal('unverifiable', 0,
          'No metadata in this file — cannot determine origin from metadata',
          false, performance.now() - start);
      }

      // ── Check 1: IPTC DigitalSourceType (most authoritative metadata signal)
      const digitalSourceType: string | undefined =
        exif.DigitalSourceType ?? exif.digitalSourceType ?? exif['Iptc4xmpExt:DigitalSourceType'];

      if (digitalSourceType) {
        if (AI_IPTC_SOURCE_TYPES.some(v => digitalSourceType.includes(v))) {
          return this.buildSignal('verified_ai', 95,
            `IPTC DigitalSourceType: trainedAlgorithmicMedia — standard AI content label`,
            true, performance.now() - start);
        }
        if (HUMAN_IPTC_SOURCE_TYPES.some(v => digitalSourceType.includes(v))) {
          return this.buildSignal('verified_human', 90,
            `IPTC DigitalSourceType: ${digitalSourceType.split('/').pop()} — standard camera/human label`,
            false, performance.now() - start);
        }
      }

      // ── Check 2: Software tag
      const software: string | undefined = exif.Software ?? exif.software ?? exif.ProcessingSoftware;
      if (software) {
        const softwareLower = software.toLowerCase().trim();
        // Match whole tokens, not raw substrings, so "luma" doesn't match
        // "LumaFusion" and "dream" doesn't match "Dreamweaver".
        const matchedTool = AI_SOFTWARE_TAGS.find(tag => matchesAsToken(softwareLower, tag));
        if (matchedTool) {
          return this.buildSignal('likely_ai', 88,
            `Software tag: "${software}" — known AI generation tool`,
            false, performance.now() - start);
        }
      }

      // ── Check 3: Camera metadata presence (indicates a real photo)
      const hasCameraData = !!(exif.Make || exif.Model || exif.LensModel);
      const hasGPS = !!(exif.latitude || exif.longitude || exif.GPSLatitude);

      if (hasCameraData) {
        const cameraInfo = [exif.Make, exif.Model].filter(Boolean).join(' ');
        return this.buildSignal('verified_human', 75,
          `Camera metadata found: ${cameraInfo}${hasGPS ? ' · GPS data present' : ''}`,
          false, performance.now() - start);
      }

      // ── No positive signal either way.
      // IMPORTANT: the ABSENCE of metadata is NOT evidence of AI. The vast
      // majority of web images have metadata stripped (logos, icons,
      // screenshots, CDN-optimised photos, anything re-saved by a social
      // platform). Guessing "AI" here produces false positives on almost
      // every image. Metadata-only detection can confirm AI/human only from a
      // POSITIVE signal; otherwise we honestly report "unverifiable".
      return this.buildSignal('unverifiable', 0,
        'No AI or camera signals in metadata — cannot determine from metadata alone',
        false, performance.now() - start);

    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SwoVid] EXIF parsing error:', err);
      }
      return this.buildSignal(null, 0,
        'Could not parse metadata for this file', false, performance.now() - start);
    }
  }

  private buildSignal(
    verdict: DetectionSignal['verdict'],
    confidence: number,
    detail: string,
    certain: boolean,
    durationMs: number,
  ): DetectionSignal {
    return {
      layer: this.layer,
      name: this.name,
      description: this.description,
      verdict,
      confidence,
      detail,
      certain,
      available: true,
      durationMs: Math.round(durationMs),
    };
  }
}

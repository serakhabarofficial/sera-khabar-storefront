function safe(read: () => unknown): unknown {
  try { return read() ?? null; } catch { return null; }
}

export function collectFingerprintTraits(): Record<string, unknown> {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const scr = typeof screen === "undefined" ? undefined : screen;
  const canvas = safe(() => document.createElement("canvas")) as HTMLCanvasElement | null;
  const canvasText = safe(() => {
    if (!canvas) return null;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.font = "14px sans-serif";
    context.fillText("Sera Khabar 123", 2, 16);
    return canvas.toDataURL();
  });
  const webgl = safe(() => {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return null;
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    return extension ? {
      vendor: gl.getParameter(extension.UNMASKED_VENDOR_WEBGL),
      renderer: gl.getParameter(extension.UNMASKED_RENDERER_WEBGL),
    } : null;
  });
  return {
    screen: safe(() => ({ width: scr?.width, height: scr?.height, colorDepth: scr?.colorDepth })),
    devicePixelRatio: safe(() => window.devicePixelRatio),
    timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    languages: safe(() => [...(nav?.languages ?? [])]),
    platform: safe(() => nav?.platform),
    hardwareConcurrency: safe(() => nav?.hardwareConcurrency),
    deviceMemory: safe(() => (nav as Navigator & { deviceMemory?: number } | undefined)?.deviceMemory),
    maxTouchPoints: safe(() => nav?.maxTouchPoints),
    canvasText,
    webgl,
  };
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, stable(entry)]));
  return value;
}

export async function hashTraits(traits: Record<string, unknown>): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(stable(traits)));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function computeDeviceFingerprint(): Promise<string | null> {
  try { return await hashTraits(collectFingerprintTraits()); } catch { return null; }
}

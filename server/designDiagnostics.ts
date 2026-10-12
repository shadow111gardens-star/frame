import { GeminiError } from "./geminiResponse";
import type {ResolvedNavigationEdge} from '../shared/navigation';
import type {ScreenRequirement} from './screenRequirements';

export interface DesignFailureDetails {
  reason: string;
  issues?: { path: string; code: string }[];
  plannedScreenCount?: number;
  outputScreenCount?: number;
  screenIndex?: number;
  componentIndex?: number;
  changedFields?: string[];
  missingEdgeIndexes?: number[];
  missingNavigation?: ResolvedNavigationEdge[];
  missingScreens?: ScreenRequirement[];
}
export class DesignValidationError extends GeminiError {
  constructor(
    message: string,
    code: string,
    public details: DesignFailureDetails,
    stage?: string,
  ) {
    super(message, code, false, 502, undefined, stage);
  }
}
const fields = new Set(
  "app message name productType designSystem colors typography font display mono textStyles heading subheading body caption button label fontSize fontWeight lineHeight spacing radii background surface card border text textMuted accent primary secondary success warning error screens id width height components type styles position x y children values value source icon targetScreenId targetComponentId".split(
    " ",
  ),
);
export function safeIssuePath(path: readonly PropertyKey[]) {
  return (
    path
      .map((key) =>
        typeof key === "number"
          ? key
          : fields.has(String(key))
            ? String(key)
            : "[field]",
      )
      .join(".") || "response"
  );
}
export function systemDifferences(
  a: unknown,
  b: unknown,
  path = "designSystem",
): string[] {
  if (
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const left = a as Record<string, unknown>,
      right = b as Record<string, unknown>;
    return [...new Set([...Object.keys(left), ...Object.keys(right)])]
      .flatMap((key) =>
        systemDifferences(
          left[key],
          right[key],
          path + "." + (fields.has(key) ? key : "[field]"),
        ),
      )
      .slice(0, 24);
  }
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [path];
}
export function validationDiagnostic(error: unknown): DesignFailureDetails {
  if (error instanceof DesignValidationError) {
    // Screen names and action labels are user-authored data. Keep detailed evidence
    // in the owner response/repair request, never in shared server logs.
    const {missingNavigation: _navigation,missingScreens: _screens,...safe}=error.details;return safe;
  }
  // Never log arbitrary exception messages or Zod received/input values.
  return {
    reason: error instanceof GeminiError ? error.code : "INTERNAL_VALIDATION",
  };
}
export function validationForRepair(error:unknown):DesignFailureDetails {
  return error instanceof DesignValidationError?error.details:validationDiagnostic(error);
}

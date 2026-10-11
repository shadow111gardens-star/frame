import {z} from 'zod';
import configuration from './frame-design-system.json';

const nonempty=z.array(z.string().min(1)).min(1);
// A broken deployment configuration must fail visibly, never silently become guidance only.
export const designPolicy=z.object({
  version:z.string().regex(/^\d+\.\d+\.\d+$/),
  understanding:z.object({deriveFromIndividualRequest:z.literal(true),explicitProductSelectionWins:z.literal(true),exactScreenCounts:z.literal(true),conflicts:z.literal('clarify'),predefinedJourneys:z.literal(false)}),
  direction:z.object({selection:z.literal('product-audience-task-fit'),requireRationale:z.literal(true),industryPalettes:z.literal(false),promptHashSelection:z.literal(false)}),
  capabilities:z.object({components:nonempty,layouts:nonempty,fonts:nonempty,icons:nonempty,responsiveOverrides:nonempty,shadows:nonempty}),
  tokens:z.object({semanticColors:nonempty,textRoles:nonempty}),
  validation:z.object({maxScreens:z.number().int().min(1).max(20),navigationTargetsMustExist:z.literal(true),validatePlannedJourney:z.literal(true),unsupportedCapabilities:z.literal('reject')}),
  redesign:z.object({defaultScope:z.literal('screen'),preserveUnrelatedScreens:z.literal(true),sharedSettings:z.literal('projectScopeOnly')}),
  quality:z.object({maxCorrectionPasses:z.literal(1),maxCaptures:z.number().int().min(1).max(2),reviewModifications:z.literal(true),reviewRenderedComposition:z.literal(true),whitespace:z.literal('contextualAdvisory'),atomicPublication:z.literal(true)}),
}).parse(configuration);
export function policyInstructions(){return `AUTHORITATIVE FRAME POLICY ${designPolicy.version}\n${JSON.stringify(designPolicy)}\nInfer every product, journey and composition from this individual request. Never select an industry template, fixed flow or preset screen list. Explain a specific art-direction rationale in the plan. Respect explicit requirements before recommendations. The capabilities above are implemented; do not invent others.`;}

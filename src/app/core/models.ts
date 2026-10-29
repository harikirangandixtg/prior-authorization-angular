/** Types mirror the sample responses of the Authorization API. */

export interface CaseRequest {
  patient_id: string;
  payer_id: string;
  plan_id: string;
  service_code: string;
  order_date: string; // YYYY-MM-DD
  service_description?: string;
  diagnosis_code?: string;
  diagnosis_text?: string;
  ordering_provider?: string;
  encounter_id?: string;
}

export interface Criterion {
  criterion_id: string;
  text: string;
  /** Final status: Met | NotMet | Unknown | Conflicting ... (kept as string so new values still render). */
  status: string;
  rationale: string | null;
  /** What the AI model said vs what the deterministic rules check said. */
  model_status?: string | null;
  reference_status?: string | null;
  evidence_refs: string[];
  missing_information: string | null;
}

export interface Verifier {
  ok: boolean;
  problems: string[];
  corrections?: unknown[];
}

export interface HumanReview {
  required: boolean;
  review_status: string; // PENDING | ACCEPTED | CORRECTED ...
  reviewer_id?: string;
  reviewed_at?: string;
  comment?: string;
}

export interface Submission {
  status: string; // NOT_SUBMITTED ...
}

export interface PaCase {
  case_id: string;
  status: string; // DRAFT_REQUIRES_REVIEW | REVIEWED_ACCEPTED | REVIEWED_CORRECTED | FAILED ...
  patient_id: string;
  request: CaseRequest;
  created_by: string;
  created_at: string;
  updated_at: string;
  analyzed: boolean;
  overall: string | null; // ReadyForReview | NeedsInformation ...
  policy_id: string | null;
  criteria: Criterion[];
  open_items: string[];
  notes: string[];
  verifier: Verifier | null;
  human_review: HumanReview;
  submission: Submission;
}

export interface EvidenceItem {
  reference: string; // e.g. Condition/C-P-1002-1
  kind: string; // condition | medication | procedure | imaging
  summary: string;
  start: string | null;
  end: string | null;
  status: string | null;
  criterion_id?: string | null;
  cited_by_criteria: string[];
  region_hint?: string;
  modality_hint?: string;
}

export interface EvidenceResponse {
  case_id: string;
  policy_id: string | null;
  evidence: EvidenceItem[];
}

export interface DraftSourceRef {
  evidenceId: string;
  reference: string;
  kind: string;
  summary: string;
  date: string | null;
  endDate: string | null;
}

export interface DraftResponse {
  draft_id: string;
  case_id: string;
  version: number;
  narrative: string;
  created_by: string;
  created_at: string;
  submission: Submission;
  packet: {
    draft: {
      clinicalSummary: string;
      sourceReferences: DraftSourceRef[];
      supportingEvidence: DraftSourceRef[];
      missingDocumentation: string[];
    };
    order: { procedure: string; encounterId: string | null; serviceCode: string; serviceDate: string };
    policy: { title: string; source: string; status: string; policyId: string; effective: string };
    status: string;
  };
}

export interface AuditEvent {
  event_id: string;
  case_id: string;
  actor: string;
  action: string;
  correlation_id: string;
  detail: Record<string, unknown>;
  ts: string;
}

export interface AuditResponse {
  case_id: string;
  events: AuditEvent[];
}

/** What the reviewer decides in the UI. */
export interface ReviewDecision {
  decision: 'ACCEPTED' | 'CORRECTED';
  comment: string;
  corrections: { criterion_id: string; status: string; rationale: string }[];
}

export interface PolicySummary {
  policy_id: string; title: string; payer: string; effective: string;
  effective_to: string | null; criteria_count: number; criteria_ids: string[];
}
export interface PolicyItem {
  rule_reference: string; payer_id: string; plan_id: string; service_code: string;
  pa_required: string; policy_id: string | null; policy_summary?: PolicySummary | null;
}
export interface PolicySearchResponse { status: string; count: number; items: PolicyItem[]; message: string | null; }
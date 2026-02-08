export type TrustZone = "trusted" | "untrusted";
export type InputKind = "file" | "text";
export type Verdict = "ALLOW" | "SANITIZE" | "BLOCK";
export type SuiNetwork = "devnet" | "testnet";

export interface TrustZoneInfo {
  description: string;
}

export interface PolicyEnforcement {
  wallet_actions: string;
  system_commands: string;
  self_modification: string;
  skill_installation: string;
}

export interface PolicyRiskScoring {
  block_threshold: number;
  sanitize_threshold: number;
}

export interface PolicyRule {
  id: string;
  title: string;
  severity: number;
  patterns: string[];
  regex_patterns?: string[];
}

export interface PolicyFile {
  tool: string;
  policy_version: number;
  default_trust_zone: TrustZone;
  trust_zones: Record<TrustZone, TrustZoneInfo>;
  enforcement: PolicyEnforcement;
  risk_scoring: PolicyRiskScoring;
  rules: PolicyRule[];
}

export interface MatchedRule {
  id: string;
  title: string;
  severity: number;
  matches: string[];
}

export interface InputDescriptor {
  kind: InputKind;
  source: string;
  trust_zone: TrustZone;
}

export interface SuiReceiptStatus {
  posted: boolean;
  network: SuiNetwork;
  package_id: string;
  tx_digest: string;
}

export interface WalrusReceiptStatus {
  stored: boolean;
  blob_id: string;
}

export interface ScanReceipt {
  tool: "clawshield_lite";
  version: "0.1.0";
  policy_version: number;
  policy_hash: string;
  input: InputDescriptor;
  content_hash: string;
  timestamp_ms: number;
  risk_score: number;
  verdict: Verdict;
  matched_rules: MatchedRule[];
  sanitized_text: string;
  sui: SuiReceiptStatus;
  walrus: WalrusReceiptStatus;
}

export interface RuleMatchSummary {
  matched_rules: MatchedRule[];
  risk_score: number;
  verdict: Verdict;
  sanitized_text: string;
  normalized_content: string;
}

export interface ResolvedInput {
  input: InputDescriptor;
  raw_content: string;
}

export interface WalrusStoreResult {
  stored: boolean;
  blob_id: string;
  message: string;
}

export interface SuiRecordResult {
  tx_digest: string;
  raw_output: string;
}

export interface SuiPublishResult {
  package_id: string;
  tx_digest: string;
  raw_output: string;
}

export interface ScanExecution {
  receipt: ScanReceipt;
  notes: string[];
}

export type Gender = '男' | '女';

export interface Patient {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  medicalRecordNo: string;
  phone: string;
}

export interface TreatmentItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  description: string;
  defaultFee: string;
}

export type ConsentStatus = 'pending' | 'signed' | 'resign';

export interface TemplateOverride {
  riskNotice?: string[];
  alternatives?: string[];
  anesthesiaNote?: string[];
  postOperative?: string[];
}

export interface SignSnapshot {
  patient: Patient;
  item: TreatmentItem;
  toothPosition: string;
  feeDescription: string;
  templateOverride?: TemplateOverride;
}

export interface SignHistory {
  id: string;
  type: 'first' | 'resign';
  signedAt: string;
  signatureData: string;
  operator?: string;
  reason?: string;
  snapshot?: SignSnapshot;
}

export interface RecordNote {
  id: string;
  content: string;
  operator: string;
  createdAt: string;
}

export type FollowUpStatus = 'pending' | 'called' | 'onsite' | 'completed';

export interface FollowUp {
  id: string;
  status: FollowUpStatus;
  operator: string;
  remark?: string;
  updatedAt: string;
}

export interface ConsentRecord {
  id: string;
  patient: Patient;
  item: TreatmentItem;
  toothPosition: string;
  feeDescription: string;
  feeEditedByUser: boolean;
  status: ConsentStatus;
  signatureData: string | null;
  createdAt: string;
  signedAt: string | null;
  readings: {
    risk: boolean;
    alternatives: boolean;
    anesthesia: boolean;
    postOperative: boolean;
  };
  templateOverride?: TemplateOverride;
  signHistory?: SignHistory[];
  resignReason?: string;
  notes?: RecordNote[];
  followUp?: FollowUp;
  operator?: string;
}

export interface ConsentTemplateContent {
  title: string;
  riskNotice: string[];
  alternatives: string[];
  anesthesiaNote: string[];
  postOperative: string[];
}

export type SignStepKey = 'risk' | 'alternatives' | 'anesthesia' | 'postOperative' | 'signature';

export interface SignStep {
  key: SignStepKey;
  title: string;
  icon: string;
}

export type TemplateSectionKey = 'riskNotice' | 'alternatives' | 'anesthesiaNote' | 'postOperative';

export const TEMPLATE_SECTION_LABELS: Record<TemplateSectionKey, string> = {
  riskNotice: '风险告知',
  alternatives: '替代方案',
  anesthesiaNote: '麻醉说明',
  postOperative: '术后注意事项',
};

export type QCIssueType =
  | 'missing_signature'
  | 'signed_but_unread'
  | 'empty_resign_reason'
  | 'today_pending_no_followup'
  | 'missing_snapshot';

export interface QCIssue {
  id: string;
  type: QCIssueType;
  recordId: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolvedRemark?: string;
  createdAt: string;
}

export interface ArchivePackage {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  recordIds: string[];
  filters: {
    month?: string;
    itemCode?: string;
    operator?: string;
  };
}

export const QC_ISSUE_LABELS: Record<QCIssueType, { label: string; severity: 'high' | 'medium' | 'low' }> = {
  missing_signature: { label: '已签署但缺少签名数据', severity: 'high' },
  signed_but_unread: { label: '已签署但步骤未全部读完', severity: 'medium' },
  empty_resign_reason: { label: '补签记录缺少补签原因', severity: 'medium' },
  today_pending_no_followup: { label: '今日漏签未安排跟进', severity: 'high' },
  missing_snapshot: { label: '签署记录缺少内容快照', severity: 'low' },
};

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

export interface SignHistory {
  id: string;
  type: 'first' | 'resign';
  signedAt: string;
  signatureData: string;
  operator?: string;
  reason?: string;
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

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

export interface ConsentRecord {
  id: string;
  patient: Patient;
  item: TreatmentItem;
  toothPosition: string;
  feeDescription: string;
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

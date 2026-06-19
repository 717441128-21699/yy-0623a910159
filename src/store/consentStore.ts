import { create } from 'zustand';
import type { ConsentRecord, ConsentStatus, Patient, TemplateOverride, TreatmentItem } from '@/types';
import { generateId } from '@/utils/id';
import { nowISO } from '@/utils/date';

const STORAGE_KEY = 'dental-consent-records-v2';

function loadFromStorage(): ConsentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ConsentRecord[];
  } catch {
    return [];
  }
}

function saveToStorage(records: ConsentRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

interface ConsentState {
  records: ConsentRecord[];

  addRecord: (data: {
    patient: Patient;
    item: TreatmentItem;
    toothPosition: string;
    feeDescription: string;
    feeEditedByUser?: boolean;
    templateOverride?: TemplateOverride;
  }) => ConsentRecord;

  getRecord: (id: string) => ConsentRecord | undefined;

  updateRecord: (id: string, patch: Partial<ConsentRecord>) => void;

  markSigned: (id: string, signatureData: string, operator?: string) => void;

  requestResign: (id: string, reason: string, operator?: string) => void;

  completeResign: (id: string, signatureData: string, operator?: string) => void;

  setStatus: (id: string, status: ConsentStatus) => void;

  markReading: (id: string, key: 'risk' | 'alternatives' | 'anesthesia' | 'postOperative', value: boolean) => void;

  setTemplateOverride: (id: string, override: TemplateOverride) => void;

  resetReadings: (id: string) => void;

  seedDemoData: () => void;
}

export const useConsentStore = create<ConsentState>((set, get) => ({
  records: loadFromStorage(),

  addRecord: (data) => {
    const record: ConsentRecord = {
      id: generateId('rec'),
      patient: data.patient,
      item: data.item,
      toothPosition: data.toothPosition,
      feeDescription: data.feeDescription,
      feeEditedByUser: data.feeEditedByUser ?? false,
      status: 'pending',
      signatureData: null,
      createdAt: nowISO(),
      signedAt: null,
      readings: { risk: false, alternatives: false, anesthesia: false, postOperative: false },
      templateOverride: data.templateOverride,
      signHistory: [],
    };
    const records = [record, ...get().records];
    saveToStorage(records);
    set({ records });
    return record;
  },

  getRecord: (id) => get().records.find((r) => r.id === id),

  updateRecord: (id, patch) => {
    const records = get().records.map((r) => (r.id === id ? { ...r, ...patch } : r));
    saveToStorage(records);
    set({ records });
  },

  markSigned: (id, signatureData, operator) => {
    const records = get().records.map((r) => {
      if (r.id !== id) return r;
      const history = [...(r.signHistory ?? [])];
      if (history.length === 0) {
        history.push({
          id: generateId('h'),
          type: 'first',
          signedAt: nowISO(),
          signatureData,
          operator,
        });
      }
      return {
        ...r,
        status: 'signed' as ConsentStatus,
        signatureData,
        signedAt: nowISO(),
        signHistory: history,
      };
    });
    saveToStorage(records);
    set({ records });
  },

  requestResign: (id, reason, operator) => {
    const records = get().records.map((r) =>
      r.id === id
        ? {
            ...r,
            status: 'resign' as ConsentStatus,
            resignReason: reason,
            readings: { risk: false, alternatives: false, anesthesia: false, postOperative: false },
          }
        : r,
    );
    saveToStorage(records);
    set({ records });
  },

  completeResign: (id, signatureData, operator) => {
    const records = get().records.map((r) => {
      if (r.id !== id) return r;
      const history = [...(r.signHistory ?? [])];
      history.push({
        id: generateId('h'),
        type: 'resign',
        signedAt: nowISO(),
        signatureData,
        operator,
        reason: r.resignReason,
      });
      return {
        ...r,
        status: 'signed' as ConsentStatus,
        signatureData,
        signedAt: nowISO(),
        signHistory: history,
        resignReason: undefined,
      };
    });
    saveToStorage(records);
    set({ records });
  },

  setStatus: (id, status) => {
    const records = get().records.map((r) => (r.id === id ? { ...r, status } : r));
    saveToStorage(records);
    set({ records });
  },

  markReading: (id, key, value) => {
    const records = get().records.map((r) =>
      r.id === id ? { ...r, readings: { ...r.readings, [key]: value } } : r,
    );
    saveToStorage(records);
    set({ records });
  },

  setTemplateOverride: (id, override) => {
    const records = get().records.map((r) => (r.id === id ? { ...r, templateOverride: override } : r));
    saveToStorage(records);
    set({ records });
  },

  resetReadings: (id) => {
    const records = get().records.map((r) =>
      r.id === id
        ? { ...r, readings: { risk: false, alternatives: false, anesthesia: false, postOperative: false } }
        : r,
    );
    saveToStorage(records);
    set({ records });
  },

  seedDemoData: () => {
    if (get().records.length > 0) return;
    const now = Date.now();
    const demoPatients: Patient[] = [
      { id: 'p1', name: '张三', gender: '男', age: 48, medicalRecordNo: 'M2025102345', phone: '138****1234' },
      { id: 'p2', name: '李四', gender: '女', age: 35, medicalRecordNo: 'M2025108765', phone: '139****5678' },
      { id: 'p3', name: '王五', gender: '男', age: 62, medicalRecordNo: 'M2025101111', phone: '136****2222' },
      { id: 'p4', name: '赵六', gender: '女', age: 28, medicalRecordNo: 'M2025102222', phone: '137****3333' },
      { id: 'p5', name: '孙七', gender: '男', age: 55, medicalRecordNo: 'M2025103333', phone: '135****4444' },
      { id: 'p6', name: '周八', gender: '女', age: 42, medicalRecordNo: 'M2025104444', phone: '134****5555' },
    ];
    const items = [
      { id: 'implant', name: '种植牙', code: 'IMPLANT', icon: 'Flower2', description: '', defaultFee: '12,800 元/颗（含种植体、基台、牙冠）' },
      { id: 'extraction', name: '拔牙', code: 'EXTRACTION', icon: 'Scissors', description: '', defaultFee: '800 元（下颌阻生智齿）' },
      { id: 'root-canal', name: '根管治疗', code: 'ROOT_CANAL', icon: 'CircleDot', description: '', defaultFee: '1,500 元/颗（后牙）' },
      { id: 'orthodontics', name: '正畸矫正', code: 'ORTHODONTICS', icon: 'Grid3x3', description: '', defaultFee: '28,000 元（金属托槽全口）' },
      { id: 'filling', name: '补牙', code: 'FILLING', icon: 'ShieldCheck', description: '', defaultFee: '500 元/颗（树脂充填）' },
      { id: 'cleaning', name: '洗牙洁治', code: 'CLEANING', icon: 'Sparkles', description: '', defaultFee: '300 元/次（超声洁治+抛光）' },
    ] as TreatmentItem[];
    const positions = ['#16（右上第一磨牙）', '#38（右下智齿）', '#21（左上中切牙）', '全口', '#45（左下第二前磨牙）', '#11-22 前牙区'];
    const statuses: ConsentStatus[] = ['signed', 'pending', 'signed', 'resign', 'pending', 'signed'];
    const reasons: Record<number, string> = { 3: '患者姓名填写有误，需重新签署确认' };

    const demo: ConsentRecord[] = demoPatients.map((p, i) => {
      const s = statuses[i];
      const signedAt = s === 'signed' ? new Date(now - i * 86400000 * 2).toISOString() : null;
      const history =
        s === 'signed'
          ? [
              {
                id: generateId('h_demo'),
                type: 'first' as const,
                signedAt: signedAt!,
                signatureData: '',
                operator: '王助理',
              },
            ]
          : s === 'resign'
          ? [
              {
                id: generateId('h_demo'),
                type: 'first' as const,
                signedAt: new Date(now - 5 * 86400000).toISOString(),
                signatureData: '',
                operator: '王助理',
              },
            ]
          : [];

      return {
        id: generateId('rec_demo'),
        patient: p,
        item: items[i],
        toothPosition: positions[i],
        feeDescription: items[i].defaultFee,
        feeEditedByUser: false,
        status: s,
        signatureData: s === 'signed' ? '' : null,
        createdAt: new Date(now - (i + 1) * 86400000).toISOString(),
        signedAt,
        readings: {
          risk: s !== 'pending',
          alternatives: s !== 'pending',
          anesthesia: s !== 'pending',
          postOperative: s !== 'pending',
        },
        signHistory: history,
        resignReason: reasons[i],
      };
    });
    saveToStorage(demo);
    set({ records: demo });
  },
}));

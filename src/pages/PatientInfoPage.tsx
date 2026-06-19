import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Hash, Phone, MapPin, DollarSign, RefreshCw, Save, ArrowRight, Sparkles } from 'lucide-react';
import { TREATMENT_ITEMS } from '@/data/treatmentItems';
import { generateId, generateMedicalRecordNo } from '@/utils/id';
import TreatmentCard from '@/components/TreatmentCard';
import ConsentPreview from '@/components/ConsentPreview';
import { useConsentStore } from '@/store/consentStore';
import type { Gender, Patient, TreatmentItem } from '@/types';

const emptyPatient: Patient = {
  id: '',
  name: '',
  gender: '男',
  age: 0,
  medicalRecordNo: '',
  phone: '',
};

export default function PatientInfoPage() {
  const navigate = useNavigate();
  const addRecord = useConsentStore((s) => s.addRecord);
  const seedDemoData = useConsentStore((s) => s.seedDemoData);
  const records = useConsentStore((s) => s.records);

  const [patient, setPatient] = useState<Patient>({ ...emptyPatient, medicalRecordNo: generateMedicalRecordNo() });
  const [selectedItem, setSelectedItem] = useState<TreatmentItem | null>(null);
  const [toothPosition, setToothPosition] = useState('');
  const [feeDescription, setFeeDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    seedDemoData();
  }, [seedDemoData]);

  useEffect(() => {
    if (selectedItem) {
      setFeeDescription((prev) => prev || selectedItem.defaultFee);
    }
  }, [selectedItem]);

  function setPatientField<K extends keyof Patient>(key: K, value: Patient[K]) {
    setPatient((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setPatient({ ...emptyPatient, medicalRecordNo: generateMedicalRecordNo() });
    setSelectedItem(null);
    setToothPosition('');
    setFeeDescription('');
    setMessage({ text: '表单已重置', type: 'info' } as any);
    setTimeout(() => setMessage(null), 2000);
  }

  function validate(): string | null {
    if (!patient.name.trim()) return '请填写患者姓名';
    if (!patient.age || patient.age <= 0 || patient.age > 120) return '请填写有效年龄';
    if (!patient.phone.trim() || !/^1\d{10}$/.test(patient.phone.replace(/\*/g, '0'))) return '请填写正确的联系电话（11位手机号）';
    if (!patient.medicalRecordNo.trim()) return '请填写病历号';
    if (!selectedItem) return '请选择就诊项目';
    if (!toothPosition.trim()) return '请填写治疗牙位';
    if (!feeDescription.trim()) return '请填写费用说明';
    return null;
  }

  function saveDraft() {
    const err = patient.name && selectedItem ? null : '请至少填写姓名和选择就诊项目';
    if (err) {
      setMessage({ text: err, type: 'error' } as any);
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    const rec = createRecord();
    setMessage({ text: `草稿已保存，共 ${records.length + 1} 条记录`, type: 'success' } as any);
    setTimeout(() => setMessage(null), 2000);
    void rec;
  }

  function createRecord() {
    const p: Patient = patient.id ? patient : { ...patient, id: generateId('p') };
    return addRecord({
      patient: p,
      item: selectedItem!,
      toothPosition,
      feeDescription,
    });
  }

  function goSign() {
    const err = validate();
    if (err) {
      setMessage({ text: err, type: 'error' } as any);
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    const rec = createRecord();
    navigate(`/sign/${rec.id}`);
  }

  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const signedCount = records.filter((r) => r.status === 'signed').length;
  const resignCount = records.filter((r) => r.status === 'resign').length;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="text-primary-500" size={24} />
            新建知情同意书
          </h2>
          <p className="text-sm text-gray-500 mt-1">录入患者信息 → 选择就诊项目 → 生成同意书并引导患者签署</p>
        </div>
        <div className="flex items-center gap-4">
          <StatCard label="待签署" value={pendingCount} color="text-status-pending" bg="bg-orange-50" />
          <StatCard label="已签署" value={signedCount} color="text-status-signed" bg="bg-green-50" />
          <StatCard label="需补签" value={resignCount} color="text-status-resign" bg="bg-red-50" />
        </div>
      </div>

      {message && (
        <div className={`mb-5 p-3 rounded-lg text-sm animate-slide-in border ${
          (message as any).type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : (message as any).type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {(message as any).text}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 space-y-5 animate-fade-in">
          <section className="card p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <span className="w-1 h-5 rounded bg-primary-500" />
              患者基本信息
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <FormField label="患者姓名" icon={<User size={14} />}>
                <input
                  className="input-field"
                  placeholder="请输入姓名"
                  value={patient.name}
                  onChange={(e) => setPatientField('name', e.target.value)}
                />
              </FormField>
              <FormField label="性别" icon={<Sparkles size={14} />}>
                <div className="flex gap-3 pt-1">
                  {(['男', '女'] as Gender[]).map((g) => (
                    <label key={g} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        className="accent-primary-500"
                        checked={patient.gender === g}
                        onChange={() => setPatientField('gender', g)}
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </FormField>
              <FormField label="年龄">
                <input
                  type="number"
                  min="0"
                  max="120"
                  className="input-field"
                  placeholder="如 35"
                  value={patient.age || ''}
                  onChange={(e) => setPatientField('age', Number(e.target.value) || 0)}
                />
              </FormField>
              <FormField label="病历号" icon={<Hash size={14} />}>
                <input
                  className="input-field font-mono bg-gray-50"
                  value={patient.medicalRecordNo}
                  onChange={(e) => setPatientField('medicalRecordNo', e.target.value)}
                />
              </FormField>
              <FormField label="联系电话" icon={<Phone size={14} />}>
                <input
                  className="input-field"
                  placeholder="11 位手机号"
                  maxLength={11}
                  value={patient.phone}
                  onChange={(e) => setPatientField('phone', e.target.value.replace(/\D/g, ''))}
                />
              </FormField>
              <FormField label="治疗牙位" icon={<MapPin size={14} />}>
                <input
                  className="input-field"
                  placeholder="如 #36 右下第一磨牙"
                  value={toothPosition}
                  onChange={(e) => setToothPosition(e.target.value)}
                />
              </FormField>
              <div className="col-span-2">
                <FormField label="费用说明" icon={<DollarSign size={14} />}>
                  <textarea
                    rows={2}
                    className="input-field resize-none"
                    placeholder="填写治疗费用明细，将显示在同意书中"
                    value={feeDescription}
                    onChange={(e) => setFeeDescription(e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <span className="w-1 h-5 rounded bg-primary-500" />
              就诊项目（点击选择）
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {TREATMENT_ITEMS.map((item) => (
                <TreatmentCard
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>

          <section className="flex items-center justify-end gap-3 pb-4">
            <button type="button" onClick={resetForm} className="btn-secondary">
              <RefreshCw size={15} />
              重置表单
            </button>
            <button type="button" onClick={saveDraft} className="btn-outline">
              <Save size={15} />
              保存草稿
            </button>
            <button type="button" onClick={goSign} className="btn-primary px-5">
              <ArrowRight size={15} />
              生成同意书，进入签署
            </button>
          </section>
        </div>

        <div className="col-span-7 animate-fade-in" style={{ animationDelay: '80ms' }}>
          <div className="card p-4 h-full">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-signed animate-pulse" />
                实时预览（A4 纸效果）
              </h3>
              <p className="text-xs text-gray-400">字段将自动填充高亮</p>
            </div>
            <div className="overflow-auto max-h-[calc(100vh-260px)] p-6 bg-gray-100 rounded-xl flex justify-center">
              <ConsentPreview
                patient={patient}
                item={selectedItem}
                toothPosition={toothPosition}
                feeDescription={feeDescription}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`px-4 py-2 rounded-xl ${bg} border border-white shadow-sm`}>
      <div className="text-[11px] text-gray-500 mb-0.5">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function FormField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label flex items-center gap-1">
        <span className="text-gray-400">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

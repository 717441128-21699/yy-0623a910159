import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Hash, Phone, MapPin, DollarSign, RefreshCw, Save, ArrowRight, Sparkles,
  FileText, Edit3, Check, X, AlertCircle, ChevronDown,
} from 'lucide-react';
import { TREATMENT_ITEMS } from '@/data/treatmentItems';
import { getTemplateByCode, hasOverride, resolveTemplate } from '@/data/consentTemplates';
import { generateId, generateMedicalRecordNo } from '@/utils/id';
import TreatmentCard from '@/components/TreatmentCard';
import ConsentPreview from '@/components/ConsentPreview';
import { useConsentStore } from '@/store/consentStore';
import type { Gender, Patient, TemplateOverride, TreatmentItem } from '@/types';

const emptyPatient: Patient = {
  id: '',
  name: '',
  gender: '男',
  age: 0,
  medicalRecordNo: '',
  phone: '',
};

type Toast = { type: 'info' | 'success' | 'error' | 'warning'; text: string } | null;

export default function PatientInfoPage() {
  const navigate = useNavigate();
  const addRecord = useConsentStore((s) => s.addRecord);
  const seedDemoData = useConsentStore((s) => s.seedDemoData);
  const records = useConsentStore((s) => s.records);

  const [patient, setPatient] = useState<Patient>({ ...emptyPatient, medicalRecordNo: generateMedicalRecordNo() });
  const [selectedItem, setSelectedItem] = useState<TreatmentItem | null>(null);
  const [toothPosition, setToothPosition] = useState('');
  const [feeDescription, setFeeDescription] = useState('');
  const [feeEditedByUser, setFeeEditedByUser] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const [feeConfirm, setFeeConfirm] = useState<{ newItem: TreatmentItem } | null>(null);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateOverride, setTemplateOverride] = useState<TemplateOverride>({});

  useEffect(() => {
    seedDemoData();
  }, [seedDemoData]);

  const resolvedTemplate = useMemo(
    () => (selectedItem ? resolveTemplate(selectedItem.code, templateOverride) : null),
    [selectedItem, templateOverride],
  );

  const isTemplateEdited = useMemo(() => hasOverride(templateOverride), [templateOverride]);

  function showToast(type: NonNullable<Toast>['type'], text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
  }

  function setPatientField<K extends keyof Patient>(key: K, value: Patient[K]) {
    setPatient((prev) => ({ ...prev, [key]: value }));
  }

  function handleSelectItem(item: TreatmentItem) {
    if (!selectedItem) {
      setSelectedItem(item);
      setFeeDescription(item.defaultFee);
      setFeeEditedByUser(false);
      return;
    }
    if (item.id === selectedItem.id) return;

    if (!feeEditedByUser || feeDescription === selectedItem.defaultFee || !feeDescription) {
      setSelectedItem(item);
      setFeeDescription(item.defaultFee);
      setFeeEditedByUser(false);
      setTemplateOverride({});
      return;
    }

    setFeeConfirm({ newItem: item });
  }

  function confirmFeeSwitch(keepCurrent: boolean) {
    if (!feeConfirm) return;
    const { newItem } = feeConfirm;
    setSelectedItem(newItem);
    if (!keepCurrent) {
      setFeeDescription(newItem.defaultFee);
      setFeeEditedByUser(false);
    }
    setTemplateOverride({});
    setFeeConfirm(null);
    if (keepCurrent) {
      showToast('info', '已保留当前费用，请注意核对');
    }
  }

  function handleFeeChange(value: string) {
    setFeeDescription(value);
    if (!feeEditedByUser) setFeeEditedByUser(true);
  }

  function resetForm() {
    setPatient({ ...emptyPatient, medicalRecordNo: generateMedicalRecordNo() });
    setSelectedItem(null);
    setToothPosition('');
    setFeeDescription('');
    setFeeEditedByUser(false);
    setTemplateOverride({});
    showToast('info', '表单已重置');
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
    if (!patient.name || !selectedItem) {
      showToast('error', '请至少填写姓名和选择就诊项目');
      return;
    }
    const rec = createRecord();
    showToast('success', `草稿已保存（ID: ${rec.id.slice(-6).toUpperCase()}）`);
  }

  function createRecord() {
    const p: Patient = patient.id ? patient : { ...patient, id: generateId('p') };
    return addRecord({
      patient: p,
      item: selectedItem!,
      toothPosition,
      feeDescription,
      feeEditedByUser,
      templateOverride: isTemplateEdited ? templateOverride : undefined,
    });
  }

  function goSign() {
    const err = validate();
    if (err) {
      showToast('error', err);
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

      {toast && (
        <div className={`mb-5 p-3 rounded-lg text-sm animate-slide-in border flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
          toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
          'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {toast.type === 'error' && <AlertCircle size={16} />}
          {toast.text}
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
                <input className="input-field" placeholder="请输入姓名" value={patient.name}
                  onChange={(e) => setPatientField('name', e.target.value)} />
              </FormField>
              <FormField label="性别" icon={<Sparkles size={14} />}>
                <div className="flex gap-3 pt-1">
                  {(['男', '女'] as Gender[]).map((g) => (
                    <label key={g} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" className="accent-primary-500"
                        checked={patient.gender === g}
                        onChange={() => setPatientField('gender', g)} />
                      {g}
                    </label>
                  ))}
                </div>
              </FormField>
              <FormField label="年龄">
                <input type="number" min="0" max="120" className="input-field" placeholder="如 35"
                  value={patient.age || ''}
                  onChange={(e) => setPatientField('age', Number(e.target.value) || 0)} />
              </FormField>
              <FormField label="病历号" icon={<Hash size={14} />}>
                <input className="input-field font-mono bg-gray-50" value={patient.medicalRecordNo}
                  onChange={(e) => setPatientField('medicalRecordNo', e.target.value)} />
              </FormField>
              <FormField label="联系电话" icon={<Phone size={14} />}>
                <input className="input-field" placeholder="11 位手机号" maxLength={11}
                  value={patient.phone}
                  onChange={(e) => setPatientField('phone', e.target.value.replace(/\D/g, ''))} />
              </FormField>
              <FormField label="治疗牙位" icon={<MapPin size={14} />}>
                <input className="input-field" placeholder="如 #36 右下第一磨牙"
                  value={toothPosition}
                  onChange={(e) => setToothPosition(e.target.value)} />
              </FormField>
              <div className="col-span-2">
                <FormField label="费用说明" icon={<DollarSign size={14} />}>
                  <div className="relative">
                    <textarea rows={2} className="input-field resize-none pr-20"
                      placeholder="填写治疗费用明细，将显示在同意书中"
                      value={feeDescription}
                      onChange={(e) => handleFeeChange(e.target.value)} />
                    {feeEditedByUser && selectedItem && (
                      <span className="absolute top-2 right-2 text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                        已手动编辑
                      </span>
                    )}
                  </div>
                </FormField>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-5 rounded bg-primary-500" />
                就诊项目（点击选择）
              </h3>
              <button
                type="button"
                disabled={!selectedItem}
                onClick={() => setTemplateEditorOpen(true)}
                className={`text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors ${
                  selectedItem
                    ? 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                    : 'text-gray-300 bg-gray-50 cursor-not-allowed'
                }`}
              >
                <Edit3 size={13} />
                编辑此份模板
                {isTemplateEdited && <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {TREATMENT_ITEMS.map((item) => (
                <TreatmentCard
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onClick={() => handleSelectItem(item)}
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
              <div className="flex items-center gap-3">
                {isTemplateEdited && (
                  <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <FileText size={11} />
                    已自定义模板内容
                  </span>
                )}
                <p className="text-xs text-gray-400">字段将自动填充高亮</p>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(100vh-260px)] p-6 bg-gray-100 rounded-xl flex justify-center">
              <ConsentPreview
                patient={patient}
                item={selectedItem}
                toothPosition={toothPosition}
                feeDescription={feeDescription}
                template={resolvedTemplate}
              />
            </div>
          </div>
        </div>
      </div>

      {feeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in" onClick={() => setFeeConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">检测到费用已手动修改</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  您当前填写的费用为 <b className="text-primary-600">{feeDescription}</b>，
                  切换到<span className="font-medium text-gray-700">「{feeConfirm.newItem.name}」</span>后，
                  参考费用为 <b className="text-gray-700">{feeConfirm.newItem.defaultFee}</b>。
                  请选择处理方式：
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => confirmFeeSwitch(false)}
                className="w-full p-3.5 rounded-xl border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 text-left flex items-center justify-between transition-colors group"
              >
                <div>
                  <div className="font-semibold text-primary-700 text-sm">使用新项目参考费用</div>
                  <div className="text-xs text-primary-500 mt-0.5">替换为 {feeConfirm.newItem.defaultFee}</div>
                </div>
                <ChevronDown size={18} className="text-primary-400 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                type="button"
                onClick={() => confirmFeeSwitch(true)}
                className="w-full p-3.5 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-left flex items-center justify-between transition-colors group"
              >
                <div>
                  <div className="font-semibold text-gray-700 text-sm">保留当前填写的费用</div>
                  <div className="text-xs text-gray-500 mt-0.5">继续使用：{feeDescription.slice(0, 24)}{feeDescription.length > 24 ? '...' : ''}</div>
                </div>
                <ChevronDown size={18} className="text-gray-300 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <p className="mt-4 text-[11px] text-gray-400 text-center">
              ⚠️ 请确认费用无误后再生成同意书，避免带错项目费用
            </p>
          </div>
        </div>
      )}

      {templateEditorOpen && selectedItem && (
        <TemplateEditorModal
          item={selectedItem}
          override={templateOverride}
          onClose={() => setTemplateEditorOpen(false)}
          onSave={(ov) => {
            setTemplateOverride(ov);
            setTemplateEditorOpen(false);
            showToast('success', '模板内容已更新（仅作用于本份同意书）');
          }}
          onReset={() => {
            setTemplateOverride({});
          }}
        />
      )}
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

function TemplateEditorModal({
  item, override, onClose, onSave, onReset,
}: {
  item: TreatmentItem;
  override: TemplateOverride;
  onClose: () => void;
  onSave: (ov: TemplateOverride) => void;
  onReset: () => void;
}) {
  const base = getTemplateByCode(item.code);
  const sections: { key: keyof TemplateOverride; label: string; base: string[] }[] = [
    { key: 'riskNotice', label: '风险告知', base: base.riskNotice },
    { key: 'alternatives', label: '替代方案', base: base.alternatives },
    { key: 'anesthesiaNote', label: '麻醉说明', base: base.anesthesiaNote },
    { key: 'postOperative', label: '术后注意事项', base: base.postOperative },
  ];

  const [local, setLocal] = useState<TemplateOverride>(() => ({
    riskNotice: override.riskNotice ? [...override.riskNotice] : undefined,
    alternatives: override.alternatives ? [...override.alternatives] : undefined,
    anesthesiaNote: override.anesthesiaNote ? [...override.anesthesiaNote] : undefined,
    postOperative: override.postOperative ? [...override.postOperative] : undefined,
  }));
  const [activeKey, setActiveKey] = useState<keyof TemplateOverride>('riskNotice');

  function getList(key: keyof TemplateOverride): string[] {
    return local[key] ?? base[key as keyof typeof base] as string[];
  }

  function isEdited(key: keyof TemplateOverride): boolean {
    return !!local[key];
  }

  function updateItem(key: keyof TemplateOverride, idx: number, val: string) {
    const arr = [...getList(key)];
    arr[idx] = val;
    setLocal({ ...local, [key]: arr });
  }

  function addItem(key: keyof TemplateOverride) {
    const arr = [...getList(key), ''];
    setLocal({ ...local, [key]: arr });
  }

  function removeItem(key: keyof TemplateOverride, idx: number) {
    const arr = getList(key).filter((_, i) => i !== idx);
    setLocal({ ...local, [key]: arr });
  }

  function resetSection(key: keyof TemplateOverride) {
    const copy = { ...local };
    delete copy[key];
    setLocal(copy);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[920px] max-h-[88vh] overflow-hidden animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 via-white to-accent-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-primary-500" />
              编辑「{item.name}」知情同意书
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              临时编辑仅作用于当前正在创建的这份同意书，不会影响模板库及其他患者记录
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-52 border-r border-gray-100 bg-gray-50/50 py-3">
            {sections.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveKey(s.key)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                  activeKey === s.key
                    ? 'bg-white text-primary-700 font-medium border-r-2 border-primary-500 shadow-sm'
                    : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                <span>{s.label}</span>
                {isEdited(s.key) && <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-800">
                {sections.find((s) => s.key === activeKey)?.label}
              </h4>
              <div className="flex items-center gap-2">
                {isEdited(activeKey) && (
                  <button type="button" onClick={() => resetSection(activeKey)} className="text-xs text-gray-500 hover:text-status-resign flex items-center gap-1">
                    <RefreshCw size={11} />
                    恢复默认
                  </button>
                )}
                <button type="button" onClick={() => addItem(activeKey)} className="text-xs text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md">
                  + 添加一条
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-1.5">
              共 {getList(activeKey).length} 条，可拖动调整顺序（当前为上下排列编辑）
            </p>

            <div className="space-y-2.5">
              {getList(activeKey).map((text, idx) => (
                <div key={idx} className="flex gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 group hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-500 flex items-center justify-center mt-1">
                    {idx + 1}
                  </div>
                  <textarea
                    rows={2}
                    className="flex-1 text-sm p-2 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none resize-none"
                    value={text}
                    onChange={(e) => updateItem(activeKey, idx, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(activeKey, idx)}
                    className="shrink-0 w-7 h-7 rounded-lg text-gray-300 hover:text-status-resign hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center mt-1"
                    title="删除此项"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <button type="button" onClick={onReset} className="btn-outline text-sm">
            <RefreshCw size={13} />
            全部恢复默认
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="button" onClick={() => onSave(local)} className="btn-primary">
              <Check size={14} />
              应用到本份同意书
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

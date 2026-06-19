import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Eye, Printer, RotateCcw, FileCheck, FileX, FileClock,
  Hash, ChevronDown, X, Download, Filter, AlertCircle, History, User, Clock,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { useConsentStore } from '@/store/consentStore';
import { formatDate } from '@/utils/date';
import { resolveTemplate } from '@/data/consentTemplates';
import { TREATMENT_ITEMS } from '@/data/treatmentItems';
import PrintLayout from '@/components/PrintLayout';
import type { ConsentRecord, ConsentStatus } from '@/types';

type FilterKey = 'all' | ConsentStatus;

const TABS: { key: FilterKey; label: string; icon: typeof FileClock }[] = [
  { key: 'all', label: '全部', icon: FileCheck },
  { key: 'pending', label: '未签', icon: FileClock },
  { key: 'signed', label: '已签', icon: FileCheck },
  { key: 'resign', label: '需补签', icon: FileX },
];

const RESIGN_REASON_PRESETS = [
  '患者信息填写有误',
  '治疗项目有变更',
  '费用调整需要重新确认',
  '原签名不清晰',
  '模板内容更新需重签',
  '其他原因',
];

export default function RecordsPage() {
  const navigate = useNavigate();
  const records = useConsentStore((s) => s.records);
  const setStatus = useConsentStore((s) => s.setStatus);
  const requestResign = useConsentStore((s) => s.requestResign);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [keyword, setKeyword] = useState('');
  const [itemCode, setItemCode] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [detail, setDetail] = useState<ConsentRecord | null>(null);
  const [printing, setPrinting] = useState<ConsentRecord | null>(null);
  const [resignModal, setResignModal] = useState<{ record: ConsentRecord } | null>(null);
  const [resignReason, setResignReason] = useState('');
  const [resignPreset, setResignPreset] = useState('');

  const counts = useMemo(() => ({
    all: records.length,
    pending: records.filter((r) => r.status === 'pending').length,
    signed: records.filter((r) => r.status === 'signed').length,
    resign: records.filter((r) => r.status === 'resign').length,
  }), [records]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const now = Date.now();
    const dayMs = 86400000;
    const cutoff =
      dateRange === 'today' ? (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })() :
      dateRange === '7d' ? now - 7 * dayMs :
      dateRange === '30d' ? now - 30 * dayMs : 0;

    return records
      .filter((r) => filter === 'all' ? true : r.status === filter)
      .filter((r) => itemCode === 'all' ? true : r.item.code === itemCode)
      .filter((r) => new Date(r.createdAt).getTime() >= cutoff)
      .filter((r) => {
        if (!kw) return true;
        return (
          r.patient.name.toLowerCase().includes(kw) ||
          r.patient.medicalRecordNo.toLowerCase().includes(kw) ||
          r.item.name.toLowerCase().includes(kw) ||
          r.toothPosition.toLowerCase().includes(kw)
        );
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [records, filter, keyword, itemCode, dateRange]);

  const todayStats = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const t = d.getTime();
    const todays = records.filter((r) => new Date(r.createdAt).getTime() >= t);
    return {
      total: todays.length,
      pending: todays.filter((r) => r.status === 'pending').length,
      signed: todays.filter((r) => r.status === 'signed').length,
      resign: todays.filter((r) => r.status === 'resign').length,
    };
  }, [records]);

  function exportTodayList() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const t = d.getTime();
    const todays = records.filter((r) => new Date(r.createdAt).getTime() >= t);

    const header = '编号,患者姓名,性别,年龄,病历号,联系电话,就诊项目,治疗牙位,费用说明,状态,创建时间,签署时间,补签次数';
    const rows = todays.map((r) => [
      r.id.slice(-8).toUpperCase(),
      r.patient.name,
      r.patient.gender,
      r.patient.age,
      r.patient.medicalRecordNo,
      r.patient.phone,
      r.item.name,
      r.toothPosition,
      r.feeDescription,
      r.status === 'pending' ? '未签署' : r.status === 'signed' ? '已签署' : '需补签',
      formatDate(r.createdAt, 'full'),
      r.signedAt ? formatDate(r.signedAt, 'full') : '',
      (r.signHistory?.filter((h) => h.type === 'resign').length ?? 0),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = '\ufeff' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = formatDate(new Date(), 'date').replace(/-/g, '');
    a.download = `知情同意书签署清单_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openResign(r: ConsentRecord) {
    setResignModal({ record: r });
    setResignReason('');
    setResignPreset('');
  }

  function confirmResign() {
    if (!resignModal) return;
    const reason = resignReason || resignPreset;
    if (!reason.trim()) return;
    requestResign(resignModal.record.id, reason.trim(), '王助理');
    setResignModal(null);
    setDetail(null);
    navigate(`/sign/${resignModal.record.id}`);
  }

  function handlePrint(r: ConsentRecord) {
    setPrinting(r);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrinting(null), 300);
    }, 200);
  }

  if (printing) {
    return <PrintLayout record={printing} />;
  }

  return (
    <div className="max-w-[1500px] mx-auto px-6 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileCheck className="text-primary-500" size={24} />
            签署记录管理
          </h2>
          <p className="text-sm text-gray-500 mt-1">查看、搜索、补签、打印所有知情同意书记录</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="text-gray-500">今日新增</div>
            <div className="text-lg font-bold text-primary-600">{todayStats.total} 份</div>
          </div>
          <button type="button" onClick={exportTodayList} className="btn-outline text-sm">
            <Download size={14} />
            导出今日清单
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5 animate-fade-in">
        <StatTile label="今日总数" value={todayStats.total} color="text-primary-600" bg="from-primary-50 to-white" icon="📋" />
        <StatTile label="今日未签" value={todayStats.pending} color="text-status-pending" bg="from-orange-50 to-white" icon="⏳" />
        <StatTile label="今日已签" value={todayStats.signed} color="text-status-signed" bg="from-green-50 to-white" icon="✅" />
        <StatTile label="今日需补签" value={todayStats.resign} color="text-status-resign" bg="from-red-50 to-white" icon="🔄" />
      </div>

      <div className="card mb-5 animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-1">
          <div className="flex items-center">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`tab-item flex items-center gap-2 px-5 relative ${filter === key ? 'tab-item-active' : ''}`}
              >
                <Icon size={15} />
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  filter === key
                    ? 'bg-primary-100 text-primary-700'
                    : key === 'pending' ? 'bg-orange-100 text-orange-600'
                    : key === 'signed' ? 'bg-green-100 text-green-600'
                    : key === 'resign' ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-gray-400" />
            <span className="text-xs text-gray-500">筛选条件：</span>
          </div>
          <div className="relative">
            <select
              className="input-field w-36 text-xs appearance-none pr-7 cursor-pointer bg-white"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
            >
              <option value="all">全部日期</option>
              <option value="today">今日</option>
              <option value="7d">近 7 天</option>
              <option value="30d">近 30 天</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              className="input-field w-40 text-xs appearance-none pr-7 cursor-pointer bg-white"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
            >
              <option value="all">全部项目</option>
              {TREATMENT_ITEMS.map((it) => (
                <option key={it.id} value={it.code}>{it.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-8 w-64 text-xs"
              placeholder="搜索姓名/病历号/项目/牙位"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-gray-600">
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap"><Hash size={13} className="inline mr-1.5" />编号</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">患者信息</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">就诊项目</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">治疗牙位</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">创建时间</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">签署时间</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">状态</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-20 text-center text-gray-400">
                    <div className="text-5xl mb-3 opacity-40">📋</div>
                    <p>暂无符合条件的记录</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const resignCount = r.signHistory?.filter((h) => h.type === 'resign').length ?? 0;
                  return (
                    <tr key={r.id} className={`border-t border-gray-50 hover:bg-primary-50/40 transition-colors ${
                      i % 2 === 1 ? 'bg-gray-50/30' : ''
                    }`}>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {r.id.slice(-10).toUpperCase()}
                        {resignCount > 0 && (
                          <span className="ml-2 text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                            补签 {resignCount} 次
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 text-primary-700 flex items-center justify-center font-semibold text-sm border border-white shadow-sm">
                            {r.patient.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{r.patient.name}
                              <span className="text-xs font-normal text-gray-400 ml-1.5">{r.patient.gender} · {r.patient.age}岁</span>
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">{r.patient.medicalRecordNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-50 text-primary-700 text-xs font-medium">
                          {r.item.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 text-xs max-w-[160px] truncate" title={r.toothPosition}>
                        {r.toothPosition}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {r.signedAt ? formatDate(r.signedAt) : '—'}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn title="查看详情" onClick={() => setDetail(r)}><Eye size={15} /></IconBtn>
                          <IconBtn
                            title={r.status === 'pending' ? '去签署' : r.status === 'resign' ? '去补签' : '申请补签'}
                            onClick={() => {
                              if (r.status === 'signed') {
                                openResign(r);
                              } else {
                                navigate(`/sign/${r.id}`);
                              }
                            }}
                          >
                            <RotateCcw size={15} />
                          </IconBtn>
                          <IconBtn
                            title="打印确认单"
                            onClick={() => handlePrint(r)}
                            disabled={r.status !== 'signed'}
                          >
                            <Printer size={15} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/40">
          <span>共 {filtered.length} 条记录</span>
          <span>
            已签署 {counts.signed} · 待签署 {counts.pending} · 需补签 {counts.resign}
          </span>
        </div>
      </div>

      {detail && (
        <DetailModal
          record={detail}
          onClose={() => setDetail(null)}
          onSign={(r) => {
            if (r.status === 'signed') {
              openResign(r);
            } else {
              setDetail(null);
              navigate(`/sign/${r.id}`);
            }
          }}
          onPrint={handlePrint}
        />
      )}

      {resignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4" onClick={() => setResignModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] animate-scale-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-status-resign" />
                申请补签
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                为「{resignModal.record.patient.name}」的 {resignModal.record.item.name} 同意书申请补签
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">补签原因</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {RESIGN_REASON_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setResignPreset(p);
                        setResignReason('');
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        resignPreset === p
                          ? 'bg-primary-100 border-primary-300 text-primary-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="或手动输入补签原因（将留存到补签记录中）"
                  value={resignReason}
                  onChange={(e) => {
                    setResignReason(e.target.value);
                    if (e.target.value) setResignPreset('');
                  }}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div>
                  申请补签后，原签署记录将转入「需补签」状态，患者需重新阅读并签署全部内容。
                  补签记录会保留历史版本，可在详情中查看。
                </div>
              </div>
            </div>
            <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
              <button className="btn-secondary" onClick={() => setResignModal(null)}>取消</button>
              <button
                className="btn-danger"
                onClick={confirmResign}
                disabled={!resignReason.trim() && !resignPreset}
              >
                确认申请补签
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50 hover:shadow-sm'
      }`}
    >
      {children}
    </button>
  );
}

function StatTile({ label, value, color, bg, icon }: { label: string; value: number; color: string; bg: string; icon: string }) {
  return (
    <div className={`card p-4 bg-gradient-to-br ${bg} border-white`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
        </div>
        <div className="text-3xl opacity-60">{icon}</div>
      </div>
    </div>
  );
}

function DetailModal({
  record, onClose, onSign, onPrint,
}: {
  record: ConsentRecord;
  onClose: () => void;
  onSign: (r: ConsentRecord) => void;
  onPrint: (r: ConsentRecord) => void;
}) {
  const template = resolveTemplate(record.item.code, record.templateOverride);
  const allRead = record.readings.risk && record.readings.alternatives && record.readings.anesthesia && record.readings.postOperative;
  const resignCount = record.signHistory?.filter((h) => h.type === 'resign').length ?? 0;
  const firstSign = record.signHistory?.find((h) => h.type === 'first');
  const resignRecords = record.signHistory?.filter((h) => h.type === 'resign') ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4 no-print" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[1100px] max-h-[90vh] overflow-hidden animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 via-white to-accent-50">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-2xl">
              🦷
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                知情同意书详情
                {resignCount > 0 && (
                  <span className="text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-medium">
                    已补签 {resignCount} 次
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {record.patient.name} · {record.item.name} · 创建于 {formatDate(record.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={record.status} size="md" />
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-4">
            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User size={14} className="text-primary-500" />
                患者信息
              </h4>
              <dl className="text-sm space-y-1.5">
                <InfoRow label="姓名" value={record.patient.name} />
                <InfoRow label="性别/年龄" value={`${record.patient.gender} / ${record.patient.age} 岁`} />
                <InfoRow label="病历号" value={record.patient.medicalRecordNo} mono />
                <InfoRow label="联系电话" value={record.patient.phone} mono />
              </dl>
            </div>

            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileCheck size={14} className="text-primary-500" />
                签署进度
              </h4>
              <ProgressRow label="风险告知" done={record.readings.risk} />
              <ProgressRow label="替代方案" done={record.readings.alternatives} />
              <ProgressRow label="麻醉说明" done={record.readings.anesthesia} />
              <ProgressRow label="术后注意" done={record.readings.postOperative} />
              <ProgressRow label="手写签名" done={!!record.signatureData} last />
              <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                allRead && record.signatureData ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
              }`}>
                {allRead && record.signatureData ? '全部已完成 ✓' : `还剩 ${
                  [!record.readings.risk, !record.readings.alternatives, !record.readings.anesthesia, !record.readings.postOperative, !record.signatureData].filter(Boolean).length
                } 项`}
              </div>
            </div>

            {record.signatureData && (
              <div className="card p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">当前签名</h4>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <img src={record.signatureData} alt="签名" className="max-h-24 w-full object-contain" />
                  <div className="mt-2 text-[11px] text-gray-500 text-right">
                    签署时间：{formatDate(record.signedAt)}
                  </div>
                </div>
              </div>
            )}

            {record.resignReason && (
              <div className="card p-4 border-status-resign/30">
                <h4 className="text-sm font-semibold text-status-resign mb-2 flex items-center gap-2">
                  <AlertCircle size={14} />
                  补签原因
                </h4>
                <p className="text-xs text-gray-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  {record.resignReason}
                </p>
              </div>
            )}

            {resignRecords.length > 0 && (
              <div className="card p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <History size={14} className="text-primary-500" />
                  签署历史
                </h4>
                <div className="space-y-3">
                  {firstSign && (
                    <HistoryItem
                      type="首次签署"
                      typeColor="text-gray-600 bg-gray-100"
                      time={firstSign.signedAt}
                      operator={firstSign.operator}
                      signature={firstSign.signatureData}
                    />
                  )}
                  {resignRecords.map((h, i) => (
                    <HistoryItem
                      key={h.id}
                      type={`第 ${i + 1} 次补签`}
                      typeColor="text-orange-700 bg-orange-100"
                      time={h.signedAt}
                      operator={h.operator}
                      reason={h.reason}
                      signature={h.signatureData}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-8">
            <div className="card p-4 h-full">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  📄 同意书内容
                  {record.templateOverride && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-normal">
                      已自定义
                    </span>
                  )}
                </h4>
                <span className="text-xs text-gray-400">{record.item.code}</span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 max-h-[62vh] overflow-auto">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-sm space-y-4">
                  <h5 className="text-center font-bold text-base text-primary-700 border-b border-gray-200 pb-3 mb-3">
                    {template.title}
                  </h5>
                  <MiniSection title="一、风险告知" items={template.riskNotice} />
                  <MiniSection title="二、替代方案" items={template.alternatives} />
                  <MiniSection title="三、麻醉说明" items={template.anesthesiaNote} />
                  <MiniSection title="四、术后注意事项" items={template.postOperative} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">关闭</button>
          <button onClick={() => onSign(record)} className="btn-outline">
            <RotateCcw size={14} />
            {record.status === 'signed' ? '申请补签' : record.status === 'resign' ? '去补签' : '继续签署'}
          </button>
          <button onClick={() => onPrint(record)} disabled={record.status !== 'signed'} className="btn-primary">
            <Printer size={14} />
            打印确认单
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-gray-100 pb-1.5 last:border-0">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`text-gray-800 font-medium text-right truncate max-w-[60%] ${mono ? 'font-mono text-[11px]' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ProgressRow({ label, done, last }: { label: string; done: boolean; last?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
        done ? 'bg-status-signed text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'
      }`}>
        {done ? '✓' : '…'}
      </div>
      <div className="flex-1 flex items-center justify-between text-sm">
        <span className={done ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
        <span className={`text-xs ${done ? 'text-status-signed' : 'text-gray-400'}`}>
          {done ? '已完成' : '未完成'}
        </span>
      </div>
      {!last && <div className="w-px h-3 ml-[10px]" />}
    </div>
  );
}

function HistoryItem({
  type, typeColor, time, operator, reason, signature,
}: {
  type: string;
  typeColor: string;
  time: string;
  operator?: string;
  reason?: string;
  signature?: string;
}) {
  return (
    <div className="relative pl-4 pb-3 border-l-2 border-gray-100 last:pb-0 last:border-transparent">
      <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-white border-2 border-primary-300" />
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColor}`}>{type}</span>
        <span className="text-[11px] text-gray-400 flex items-center gap-1">
          <Clock size={10} />
          {formatDate(time, 'datetime')}
        </span>
      </div>
      {operator && <div className="text-[11px] text-gray-500 mb-1">操作人：{operator}</div>}
      {reason && <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded mb-1.5">原因：{reason}</div>}
      {signature && (
        <div className="bg-white border border-gray-100 rounded p-1.5">
          <img src={signature} alt="历史签名" className="max-h-10 w-full object-contain opacity-80" />
        </div>
      )}
    </div>
  );
}

function MiniSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h6 className="font-semibold text-gray-800 mb-1.5 text-[13px]">{title}</h6>
      <ul className="list-disc pl-5 space-y-0.5 text-gray-600 text-xs leading-relaxed">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

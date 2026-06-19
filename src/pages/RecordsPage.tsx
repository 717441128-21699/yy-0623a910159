import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Eye, Printer, RotateCcw, FileCheck, FileX, FileClock,
  Hash, ChevronDown, X, Download, Filter, AlertCircle, History, User, Clock,
  MessageSquare, Send, Phone, Users, CheckCircle2, ClipboardList, Layers,
  Archive, ShieldAlert, FileSearch, Package, ChevronRight,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { useConsentStore } from '@/store/consentStore';
import { formatDate } from '@/utils/date';
import { resolveTemplate, getTemplateByCode } from '@/data/consentTemplates';
import { TREATMENT_ITEMS } from '@/data/treatmentItems';
import PrintLayout from '@/components/PrintLayout';
import type { ConsentRecord, ConsentStatus, SignHistory, QCIssue, QCIssueType, ArchivePackage } from '@/types';
import { QC_ISSUE_LABELS } from '@/types';

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

const OPERATORS = ['王助理', '李咨询师', '张医生', '刘主任', '陈护士'];

const generateId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const nowISO = () => new Date().toISOString();

export default function RecordsPage() {
  const navigate = useNavigate();
  const records = useConsentStore((s) => s.records);
  const setStatus = useConsentStore((s) => s.setStatus);
  const requestResign = useConsentStore((s) => s.requestResign);
  const setFollowUp = useConsentStore((s) => s.setFollowUp);
  const addNote = useConsentStore((s) => s.addNote);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [keyword, setKeyword] = useState('');
  const [itemCode, setItemCode] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [detail, setDetail] = useState<ConsentRecord | null>(null);
  const [printing, setPrinting] = useState<ConsentRecord | null>(null);
  const [resignModal, setResignModal] = useState<{ record: ConsentRecord } | null>(null);
  const [resignReason, setResignReason] = useState('');
  const [resignPreset, setResignPreset] = useState('');
  const [showCheckPanel, setShowCheckPanel] = useState(false);
  const [checkRemark, setCheckRemark] = useState('');
  const [showArchivePanel, setShowArchivePanel] = useState(false);
  const [showQCPanel, setShowQCPanel] = useState(false);

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

    const hasOverride = (r: ConsentRecord) => {
      if (!r.templateOverride) return '否';
      const o = r.templateOverride;
      return (o.riskNotice || o.alternatives || o.anesthesiaNote || o.postOperative) ? '是' : '否';
    };

    const formatSection = (items?: string[]) => (items && items.length > 0 ? items.join('；') : '');
    const diffSection = (record: ConsentRecord, key: 'riskNotice' | 'alternatives' | 'anesthesiaNote' | 'postOperative') => {
      const standard = getTemplateByCode(record.item.code);
      const override = record.templateOverride?.[key];
      const standardContent = standard?.[key] ?? [];
      const actual = override ?? standardContent;
      const marker = override ? '[已自定义] ' : '';
      return marker + formatSection(actual);
    };

    const header = '编号,患者姓名,性别,年龄,病历号,联系电话,就诊项目,治疗牙位,费用说明,状态,是否自定义模板,咨询师,创建时间,签署时间,补签次数,跟进状态,风险告知,替代方案,麻醉说明,术后注意事项';
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
      hasOverride(r),
      r.operator ?? '',
      formatDate(r.createdAt, 'full'),
      r.signedAt ? formatDate(r.signedAt, 'full') : '',
      (r.signHistory?.filter((h) => h.type === 'resign').length ?? 0),
      r.followUp ? (
        r.followUp.status === 'called' ? '已电话提醒' :
        r.followUp.status === 'onsite' ? '已现场处理' : '已完成'
      ) : '',
      diffSection(r, 'riskNotice'),
      diffSection(r, 'alternatives'),
      diffSection(r, 'anesthesiaNote'),
      diffSection(r, 'postOperative'),
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

      <div className="grid grid-cols-4 gap-4 mb-4 animate-fade-in">
        <StatTile label="今日总数" value={todayStats.total} color="text-primary-600" bg="from-primary-50 to-white" icon="📋" />
        <StatTile label="今日未签" value={todayStats.pending} color="text-status-pending" bg="from-orange-50 to-white" icon="⏳" />
        <StatTile label="今日已签" value={todayStats.signed} color="text-status-signed" bg="from-green-50 to-white" icon="✅" />
        <StatTile label="今日需补签" value={todayStats.resign} color="text-status-resign" bg="from-red-50 to-white" icon="🔄" />
      </div>

      <div className="flex justify-end mb-4 animate-fade-in gap-2">
        <button
          type="button"
          onClick={() => setShowCheckPanel(true)}
          className="btn-outline text-sm"
        >
          <ClipboardList size={14} />
          今日漏签核对面板
        </button>
        <button
          type="button"
          onClick={() => setShowQCPanel(true)}
          className="btn-outline text-sm"
        >
          <ShieldAlert size={14} />
          签后质控视图
        </button>
        <button
          type="button"
          onClick={() => setShowArchivePanel(true)}
          className="btn-outline text-sm"
        >
          <Archive size={14} />
          归档中心
        </button>
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
          recordId={detail.id}
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
          onAddNote={(id, content) => addNote(id, content, '王助理')}
        />
      )}

      {showCheckPanel && (
        <CheckPanel
          records={records}
          onClose={() => setShowCheckPanel(false)}
          onMarkFollowUp={(id, status, remark) => {
            setFollowUp(id, status, '王助理', remark);
          }}
          onOpenDetail={(r) => {
            setShowCheckPanel(false);
            setDetail(r);
          }}
        />
      )}

      {showQCPanel && (
        <QCPanel
          records={records}
          onClose={() => setShowQCPanel(false)}
          onOpenDetail={(r) => {
            setShowQCPanel(false);
            setDetail(r);
          }}
          onAddNote={(id, content) => addNote(id, content, '王助理')}
          onMarkFollowUp={(id, status, remark) => {
            setFollowUp(id, status, '王助理', remark);
          }}
        />
      )}

      {showArchivePanel && (
        <ArchivePanel
          records={records}
          onClose={() => setShowArchivePanel(false)}
          onOpenDetail={(r) => {
            setShowArchivePanel(false);
            setDetail(r);
          }}
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
  recordId, onClose, onSign, onPrint, onAddNote,
}: {
  recordId: string;
  onClose: () => void;
  onSign: (r: ConsentRecord) => void;
  onPrint: (r: ConsentRecord) => void;
  onAddNote: (id: string, content: string) => void;
}) {
  const record = useConsentStore((s) => s.records.find((r) => r.id === recordId));
  const [activeVersion, setActiveVersion] = useState<'current' | number>('current');
  const [noteContent, setNoteContent] = useState('');

  if (!record) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 text-gray-500">记录不存在</div>
      </div>
    );
  }

  const signHistory = record.signHistory ?? [];
  const resignCount = signHistory.filter((h) => h.type === 'resign').length;

  const versionData = useMemo(() => {
    if (activeVersion === 'current') {
      return {
        label: '当前最新',
        patient: record.patient,
        item: record.item,
        toothPosition: record.toothPosition,
        feeDescription: record.feeDescription,
        templateOverride: record.templateOverride,
        signatureData: record.signatureData,
        signedAt: record.signedAt,
        isResign: false,
        reason: undefined,
      };
    }
    const h = signHistory[activeVersion];
    if (!h) return null;
    const snapshot = h.snapshot;
    return {
      label: h.type === 'first' ? '首次签署' : `第 ${signHistory.slice(0, activeVersion + 1).filter(x => x.type === 'resign').length} 次补签`,
      patient: snapshot?.patient ?? record.patient,
      item: snapshot?.item ?? record.item,
      toothPosition: snapshot?.toothPosition ?? record.toothPosition,
      feeDescription: snapshot?.feeDescription ?? record.feeDescription,
      templateOverride: snapshot?.templateOverride,
      signatureData: h.signatureData,
      signedAt: h.signedAt,
      isResign: h.type === 'resign',
      reason: h.reason,
    };
  }, [activeVersion, signHistory, record]);

  const template = versionData
    ? resolveTemplate(versionData.item.code, versionData.templateOverride)
    : resolveTemplate(record.item.code, record.templateOverride);

  const allRead = record.readings.risk && record.readings.alternatives && record.readings.anesthesia && record.readings.postOperative;
  const notes = record.notes ?? [];

  function handleAddNote() {
    if (!noteContent.trim()) return;
    onAddNote(record.id, noteContent.trim());
    setNoteContent('');
  }

  const versionTabs = [
    { key: 'current' as const, label: '当前最新', hasSnapshot: false },
    ...signHistory.map((h, i) => ({
      key: i as number,
      label: h.type === 'first' ? '首次签署' : `补签 ${signHistory.slice(0, i + 1).filter(x => x.type === 'resign').length}`,
      hasSnapshot: !!h.snapshot,
      time: h.signedAt,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4 no-print" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[1200px] max-h-[90vh] overflow-hidden animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
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

        {signHistory.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-1.5">
              <Layers size={13} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-600">签署版本视图</span>
              <span className="text-[10px] text-gray-400">（点击切换查看不同版本的内容）</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {versionTabs.map((tab) => {
                const isActive = activeVersion === tab.key;
                return (
                  <button
                    key={String(tab.key)}
                    type="button"
                    onClick={() => setActiveVersion(tab.key as any)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {tab.label}
                    {tab.hasSnapshot && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/70' : 'bg-status-signed'}`} />
                    )}
                    {'time' in tab && tab.time && (
                      <span className={`ml-0.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatDate(tab.time, 'time')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6 grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-4">
            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User size={14} className="text-primary-500" />
                患者信息
                {versionData?.isResign && (
                  <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">补签版本</span>
                )}
              </h4>
              <dl className="text-sm space-y-1.5">
                <InfoRow label="姓名" value={versionData?.patient.name ?? record.patient.name} />
                <InfoRow label="性别/年龄" value={`${versionData?.patient.gender ?? record.patient.gender} / ${versionData?.patient.age ?? record.patient.age} 岁`} />
                <InfoRow label="病历号" value={versionData?.patient.medicalRecordNo ?? record.patient.medicalRecordNo} mono />
                <InfoRow label="联系电话" value={versionData?.patient.phone ?? record.patient.phone} mono />
                <InfoRow label="就诊项目" value={versionData?.item.name ?? record.item.name} />
                <InfoRow label="治疗牙位" value={versionData?.toothPosition ?? record.toothPosition} />
                <InfoRow label="费用说明" value={versionData?.feeDescription ?? record.feeDescription} />
              </dl>
              {versionData?.reason && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-[11px] text-gray-500 mb-1">补签原因：</div>
                  <p className="text-xs text-gray-600 bg-orange-50 p-2 rounded border border-orange-100">{versionData.reason}</p>
                </div>
              )}
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

            {versionData?.signatureData && (
              <div className="card p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {activeVersion === 'current' ? '当前签名' : '版本签名'}
                </h4>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <img src={versionData.signatureData} alt="签名" className="max-h-24 w-full object-contain" />
                  <div className="mt-2 text-[11px] text-gray-500 text-right">
                    签署时间：{formatDate(versionData.signedAt)}
                  </div>
                </div>
              </div>
            )}

            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MessageSquare size={14} className="text-primary-500" />
                交接备注
                <span className="text-[10px] text-gray-400 font-normal">（共 {notes.length} 条）</span>
              </h4>
              {notes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">暂无交接备注</p>
              ) : (
                <div className="space-y-2.5 max-h-[200px] overflow-auto pr-1 mb-3">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <div className="text-[11px] text-gray-500 flex items-center justify-between mb-1">
                        <span className="font-medium text-primary-600">{n.operator}</span>
                        <span className="text-[10px]">{formatDate(n.createdAt, 'datetime')}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  className="input-field resize-none text-xs flex-1"
                  placeholder="输入交接备注内容..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!noteContent.trim()}
                  className="btn-primary px-3 self-end"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-8">
            <div className="card p-4 h-full">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  📄 同意书内容
                  {versionData?.templateOverride && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-normal">
                      已自定义
                    </span>
                  )}
                  {activeVersion !== 'current' && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-normal">
                      历史版本
                    </span>
                  )}
                </h4>
                <span className="text-xs text-gray-400">{versionData?.item.code ?? record.item.code}</span>
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

function CheckPanel({
  records, onClose, onMarkFollowUp, onOpenDetail,
}: {
  records: ConsentRecord[];
  onClose: () => void;
  onMarkFollowUp: (id: string, status: 'called' | 'onsite' | 'completed', remark?: string) => void;
  onOpenDetail: (r: ConsentRecord) => void;
}) {
  const [groupBy, setGroupBy] = useState<'item' | 'status' | 'operator'>('status');
  const [remarkInput, setRemarkInput] = useState<Record<string, string>>({});

  const todayRecords = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const t = d.getTime();
    return records.filter((r) => new Date(r.createdAt).getTime() >= t);
  }, [records]);

  const pendingRecords = useMemo(() => {
    return todayRecords.filter((r) => r.status === 'pending' || r.status === 'resign');
  }, [todayRecords]);

  const grouped = useMemo(() => {
    const groups: Record<string, ConsentRecord[]> = {};
    pendingRecords.forEach((r) => {
      let key: string;
      if (groupBy === 'item') key = r.item.name;
      else if (groupBy === 'status') key = r.status === 'pending' ? '未签署' : '需补签';
      else key = r.operator || '未分配';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [pendingRecords, groupBy]);

  const stats = useMemo(() => ({
    today: todayRecords.length,
    pending: todayRecords.filter((r) => r.status === 'pending').length,
    resign: todayRecords.filter((r) => r.status === 'resign').length,
    signed: todayRecords.filter((r) => r.status === 'signed').length,
    followUpCalled: todayRecords.filter((r) => r.followUp?.status === 'called').length,
    followUpOnsite: todayRecords.filter((r) => r.followUp?.status === 'onsite').length,
  }), [todayRecords]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4 no-print" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[1200px] max-h-[90vh] overflow-hidden animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-white to-amber-50">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-2xl">
              📋
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                今日漏签核对面板
                <span className="text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 font-medium">
                  {pendingRecords.length} 份待处理
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                今日共 {stats.today} 份 · 已签 {stats.signed} · 未签 {stats.pending} · 需补签 {stats.resign}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <CheckStatCard label="今日总数" value={stats.today} color="text-primary-600" bg="bg-primary-50" />
          <CheckStatCard label="未签署" value={stats.pending} color="text-status-pending" bg="bg-orange-50" />
          <CheckStatCard label="需补签" value={stats.resign} color="text-status-resign" bg="bg-red-50" />
          <CheckStatCard label="已电话提醒" value={stats.followUpCalled} color="text-blue-600" bg="bg-blue-50" />
          <CheckStatCard label="已现场处理" value={stats.followUpOnsite} color="text-status-signed" bg="bg-green-50" />
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">分组方式：</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[
                { key: 'status' as const, label: '按状态' },
                { key: 'item' as const, label: '按项目' },
                { key: 'operator' as const, label: '按咨询师' },
              ].map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setGroupBy(g.key)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    groupBy === g.key
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            共 {Object.keys(grouped).length} 组 · {pendingRecords.length} 条记录
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName} className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {groupBy === 'status' ? (
                    <StatusBadge status={groupName === '未签署' ? 'pending' : 'resign'} size="sm" />
                  ) : groupBy === 'item' ? (
                    <span className="text-[11px] px-2 py-0.5 bg-primary-50 text-primary-600 rounded font-medium">{groupName}</span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 bg-accent-50 text-accent-600 rounded font-medium flex items-center gap-1">
                      <Users size={11} />
                      {groupName}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-gray-700">{groupName}</span>
                  <span className="text-[10px] text-gray-400">共 {items.length} 条</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((r) => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 text-primary-700 flex items-center justify-center font-semibold text-sm border border-white shadow-sm shrink-0">
                      {r.patient.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm">{r.patient.name}</span>
                        <span className="text-[11px] text-gray-400">{r.patient.gender}·{r.patient.age}岁</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded font-mono">{r.item.name}</span>
                        <span className="text-[10px] text-gray-400">{r.toothPosition}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                        {r.patient.medicalRecordNo} · 创建于 {formatDate(r.createdAt, 'time')}
                        {r.operator && <span className="ml-2">· 咨询师：{r.operator}</span>}
                      </div>
                      {r.followUp && (
                        <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <Clock size={10} />
                          上次跟进：{r.followUp.status === 'called' ? '电话提醒' : r.followUp.status === 'onsite' ? '现场处理' : '已完成'}
                          {' · '}
                          {formatDate(r.followUp.updatedAt, 'time')}
                          {r.followUp.remark && <span className="text-primary-600">· {r.followUp.remark}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        className="input-field w-32 text-xs py-1"
                        placeholder="备注（可选）"
                        value={remarkInput[r.id] ?? ''}
                        onChange={(e) => setRemarkInput({ ...remarkInput, [r.id]: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onMarkFollowUp(r.id, 'called', remarkInput[r.id]);
                          setRemarkInput({ ...remarkInput, [r.id]: '' });
                        }}
                        className="btn-outline text-xs py-1 px-2.5"
                        title="标记已电话提醒"
                      >
                        <Phone size={12} />
                        电话
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onMarkFollowUp(r.id, 'onsite', remarkInput[r.id]);
                          setRemarkInput({ ...remarkInput, [r.id]: '' });
                        }}
                        className="btn-outline text-xs py-1 px-2.5"
                        title="标记已现场处理"
                      >
                        <Users size={12} />
                        现场
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onMarkFollowUp(r.id, 'completed', remarkInput[r.id]);
                          setRemarkInput({ ...remarkInput, [r.id]: '' });
                        }}
                        className="btn-primary text-xs py-1 px-2.5"
                        title="标记已完成"
                      >
                        <CheckCircle2 size={12} />
                        完成
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(r)}
                        className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500"
                        title="查看详情"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {pendingRecords.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3 opacity-40">🎉</div>
              <p className="text-gray-400 text-sm">太棒了！今日暂无漏签记录</p>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            💡 下班前请核对所有漏签记录，标记跟进状态，确保无遗漏
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              未处理：{pendingRecords.filter(r => !r.followUp || r.followUp.status === 'pending').length}
            </span>
            <button onClick={onClose} className="btn-primary text-sm">
              <CheckCircle2 size={14} />
              完成核对
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckStatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`px-3 py-2.5 rounded-xl ${bg} border border-white shadow-sm`}>
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function QCPanel({
  records, onClose, onOpenDetail, onAddNote, onMarkFollowUp,
}: {
  records: ConsentRecord[];
  onClose: () => void;
  onOpenDetail: (r: ConsentRecord) => void;
  onAddNote: (id: string, content: string) => void;
  onMarkFollowUp: (id: string, status: 'called' | 'onsite' | 'completed', remark?: string) => void;
}) {
  const [resolvedMap, setResolvedMap] = useState<Record<string, { by: string; at: string; remark?: string }>>({});
  const [remarkInput, setRemarkInput] = useState<Record<string, string>>({});
  const [filterType, setFilterType] = useState<'all' | QCIssueType>('all');

  const issues = useMemo<QCIssue[]>(() => {
    const result: QCIssue[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const t = today.getTime();

    records.forEach((r) => {
      if (r.status === 'signed' && !r.signatureData) {
        result.push({
          id: `q-missig-${r.id}`,
          type: 'missing_signature',
          recordId: r.id,
          title: QC_ISSUE_LABELS.missing_signature.label,
          description: '已标记为已签署但缺少签名图片数据，请检查签署流程或申请补签',
          severity: 'high',
          resolved: !!resolvedMap[`q-missig-${r.id}`],
          createdAt: r.signedAt || r.createdAt,
        });
      }
      if (r.status === 'signed') {
        const allRead = r.readings?.risk && r.readings?.alternatives && r.readings?.anesthesia && r.readings?.postOperative;
        if (!allRead) {
          result.push({
            id: `q-unread-${r.id}`,
            type: 'signed_but_unread',
            recordId: r.id,
            title: QC_ISSUE_LABELS.signed_but_unread.label,
            description: (() => {
              const missing: string[] = [];
              if (!r.readings?.risk) missing.push('风险告知');
              if (!r.readings?.alternatives) missing.push('替代方案');
              if (!r.readings?.anesthesia) missing.push('麻醉说明');
              if (!r.readings?.postOperative) missing.push('术后注意事项');
              return `未完成阅读的步骤：${missing.join('、')}`;
            })(),
            severity: 'medium',
            resolved: !!resolvedMap[`q-unread-${r.id}`],
            createdAt: r.signedAt || r.createdAt,
          });
        }
      }
      if ((r.status === 'resign' || (r.signHistory?.filter((h) => h.type === 'resign').length ?? 0) > 0) && !r.resignReason) {
        result.push({
          id: `q-resign-${r.id}`,
          type: 'empty_resign_reason',
          recordId: r.id,
          title: QC_ISSUE_LABELS.empty_resign_reason.label,
          description: '补签记录缺少补签原因说明，请补充记录便于追溯',
          severity: 'medium',
          resolved: !!resolvedMap[`q-resign-${r.id}`],
          createdAt: r.createdAt,
        });
      }
      if ((r.status === 'pending' || r.status === 'resign') && new Date(r.createdAt).getTime() >= t && (!r.followUp || r.followUp.status === 'pending')) {
        result.push({
          id: `q-follow-${r.id}`,
          type: 'today_pending_no_followup',
          recordId: r.id,
          title: QC_ISSUE_LABELS.today_pending_no_followup.label,
          description: '今日待签署/需补签记录尚未安排跟进',
          severity: 'high',
          resolved: !!resolvedMap[`q-follow-${r.id}`],
          createdAt: r.createdAt,
        });
      }
      if (r.status === 'signed' && (!r.signHistory || r.signHistory.length === 0 || !r.signHistory[0].snapshot)) {
        result.push({
          id: `q-snap-${r.id}`,
          type: 'missing_snapshot',
          recordId: r.id,
          title: QC_ISSUE_LABELS.missing_snapshot.label,
          description: '签署记录缺少签署时的内容快照，历史版本追溯将不可用',
          severity: 'low',
          resolved: !!resolvedMap[`q-snap-${r.id}`],
          createdAt: r.signedAt || r.createdAt,
        });
      }
    });

    return result.sort((a, b) => {
      const sevOrder = { high: 0, medium: 1, low: 2 };
      if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
      return a.createdAt < b.createdAt ? -1 : 1;
    });
  }, [records, resolvedMap]);

  const filteredIssues = useMemo(() => (
    filterType === 'all' ? issues : issues.filter((i) => i.type === filterType)
  ), [issues, filterType]);

  const stats = useMemo(() => ({
    total: issues.length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
    resolved: issues.filter((i) => i.resolved).length,
  }), [issues]);

  function markResolved(issue: QCIssue) {
    setResolvedMap({
      ...resolvedMap,
      [issue.id]: { by: '王助理', at: nowISO(), remark: remarkInput[issue.id] || undefined },
    });
    if (issue.type === 'today_pending_no_followup') {
      onMarkFollowUp(issue.recordId, 'called', remarkInput[issue.id] || '质控已核查');
    } else if (remarkInput[issue.id]) {
      onAddNote(issue.recordId, `【质控处理】${remarkInput[issue.id]}`);
    }
    setRemarkInput({ ...remarkInput, [issue.id]: '' });
  }

  const severityBadge = (s: 'high' | 'medium' | 'low') => (
    s === 'high' ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">高风险</span> :
    s === 'medium' ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">中风险</span> :
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200 font-medium">低风险</span>
  );

  const uniqueTypes = Array.from(new Set(issues.map((i) => i.type)));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4 no-print" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[1200px] max-h-[90vh] overflow-hidden animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 via-white to-purple-50">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-purple-100 flex items-center justify-center text-2xl">
              <ShieldAlert size={22} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                签后质控视图
                <span className="text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-medium">
                  {issues.length - stats.resolved} / {issues.length} 待处理
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                自动检测异常：高风险 {stats.high} · 中风险 {stats.medium} · 低风险 {stats.low} · 已处理 {stats.resolved}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">类型筛选：</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterType === 'all' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                全部
              </button>
              {uniqueTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterType === t ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {QC_ISSUE_LABELS[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            共 {filteredIssues.length} 条异常记录
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-3">
          {filteredIssues.map((issue) => {
            const record = records.find((r) => r.id === issue.recordId);
            if (!record) return null;
            return (
              <div key={issue.id} className={`card overflow-hidden ${issue.resolved ? 'opacity-60' : ''}`}>
                <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-3">
                  {severityBadge(issue.severity)}
                  <span className="font-semibold text-gray-800 text-sm">{issue.title}</span>
                  <span className="text-[10px] text-gray-400 flex-1">{issue.description}</span>
                  {issue.resolved && resolvedMap[issue.id] && (
                    <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 font-medium">
                      ✓ 已处理 · {resolvedMap[issue.id].by} · {formatDate(resolvedMap[issue.id].at, 'time')}
                    </span>
                  )}
                </div>
                <div className="px-4 py-3 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-100 to-purple-100 text-red-700 flex items-center justify-center font-semibold text-sm border border-white shadow-sm shrink-0">
                    {record.patient.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{record.patient.name}</span>
                      <span className="text-[11px] text-gray-400">{record.patient.gender}·{record.patient.age}岁</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded font-mono">{record.item.name}</span>
                      <span className="text-[10px] text-gray-400">{record.toothPosition}</span>
                      <StatusBadge status={record.status} size="sm" />
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                      {record.patient.medicalRecordNo} · 签署时间 {record.signedAt ? formatDate(record.signedAt, 'datetime') : '未签署'}
                      {record.operator && <span className="ml-2">· 咨询师：{record.operator}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!issue.resolved && (
                      <input
                        type="text"
                        className="input-field w-32 text-xs py-1"
                        placeholder="处理说明..."
                        value={remarkInput[issue.id] ?? ''}
                        onChange={(e) => setRemarkInput({ ...remarkInput, [issue.id]: e.target.value })}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenDetail(record)}
                      className="btn-outline text-xs py-1 px-2.5"
                    >
                      <Eye size={12} />
                      详情
                    </button>
                    {!issue.resolved && (
                      <button
                        type="button"
                        onClick={() => markResolved(issue)}
                        className="btn-primary text-xs py-1 px-2.5"
                      >
                        <CheckCircle2 size={12} />
                        标记处理
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredIssues.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3 opacity-40">✅</div>
              <p className="text-gray-400 text-sm">暂无{filterType === 'all' ? '' : QC_ISSUE_LABELS[filterType as QCIssueType].label}异常记录</p>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            💡 下班前请逐一处理质控异常，标记完成后可作为当日下班核对依据
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              待处理：{issues.filter(i => !i.resolved).length}
            </span>
            <button onClick={onClose} className="btn-primary text-sm">
              <CheckCircle2 size={14} />
              完成质控
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchivePanel({
  records, onClose, onOpenDetail,
}: {
  records: ConsentRecord[];
  onClose: () => void;
  onOpenDetail: (r: ConsentRecord) => void;
}) {
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [itemFilter, setItemFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archivedPackages, setArchivedPackages] = useState<ArchivePackage[]>([]);

  const signedRecords = useMemo(() => records.filter((r) => r.status === 'signed'), [records]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    signedRecords.forEach((r) => {
      const d = new Date(r.signedAt || r.createdAt);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [signedRecords]);

  const operators = useMemo(() => {
    const set = new Set<string>();
    signedRecords.forEach((r) => r.operator && set.add(r.operator));
    return Array.from(set);
  }, [signedRecords]);

  const filtered = useMemo(() => (
    signedRecords.filter((r) => {
      if (monthFilter !== 'all') {
        const d = new Date(r.signedAt || r.createdAt);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (m !== monthFilter) return false;
      }
      if (itemFilter !== 'all' && r.item.code !== itemFilter) return false;
      if (operatorFilter !== 'all' && r.operator !== operatorFilter) return false;
      return true;
    }).sort((a, b) => (b.signedAt || b.createdAt).localeCompare(a.signedAt || a.createdAt))
  ), [signedRecords, monthFilter, itemFilter, operatorFilter]);

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }
  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((r) => r.id)));
  }

  function generateArchive() {
    if (selectedIds.size === 0) return;
    const selectedRecords = filtered.filter((r) => selectedIds.has(r.id));
    const archiveMonth = monthFilter !== 'all' ? monthFilter : 'all';
    const archiveItem = itemFilter !== 'all' ? TREATMENT_ITEMS.find((t) => t.code === itemFilter)?.name ?? '全部项目' : '全部项目';
    const archiveOperator = operatorFilter !== 'all' ? operatorFilter : '全部咨询师';

    const lines: string[] = [];
    lines.push('═'.repeat(90));
    lines.push(`知情同意书归档包  ·  生成时间：${formatDate(new Date(), 'full')}  ·  操作人：王助理`);
    lines.push(`筛选条件：月份=${archiveMonth} / 项目=${archiveItem} / 咨询师=${archiveOperator}`);
    lines.push(`记录数量：${selectedRecords.length} 份`);
    lines.push('═'.repeat(90));
    lines.push('');

    selectedRecords.forEach((r, idx) => {
      const tmpl = resolveTemplate(r.item.code, r.templateOverride);
      const hasOverride = r.templateOverride && (r.templateOverride.riskNotice || r.templateOverride.alternatives || r.templateOverride.anesthesiaNote || r.templateOverride.postOperative);
      lines.push(`【第 ${idx + 1} 份】` + '─'.repeat(78));
      lines.push(`编号：${r.id.slice(-8).toUpperCase()}        状态：已签署`);
      lines.push(`患者：${r.patient.name}    性别：${r.patient.gender}    年龄：${r.patient.age}岁`);
      lines.push(`病历号：${r.patient.medicalRecordNo}    联系电话：${r.patient.phone}`);
      lines.push(`就诊项目：${r.item.name}    治疗牙位：${r.toothPosition}`);
      lines.push(`费用说明：${r.feeDescription}`);
      lines.push(`创建时间：${formatDate(r.createdAt, 'full')}`);
      lines.push(`签署时间：${r.signedAt ? formatDate(r.signedAt, 'full') : '—'}    咨询师：${r.operator ?? '—'}`);
      lines.push(`模板状态：${hasOverride ? '已自定义条款' : '使用标准模板'}`);
      if (r.signHistory && r.signHistory.length > 1) {
        lines.push(`签署历史：首次签署 + ${r.signHistory.filter((h) => h.type === 'resign').length} 次补签`);
      }
      lines.push('');
      lines.push('── 患者签名 ──');
      lines.push(`签名数据：${r.signatureData ? '✓ 已保存签名图片' : '✗ 无签名数据'}`);
      lines.push('');
      lines.push(`── ${tmpl.title} 完整条款内容 ──`);
      lines.push('');
      lines.push('【风险告知】');
      tmpl.riskNotice.forEach((it, i) => lines.push(`  ${i + 1}. ${it}`));
      lines.push('');
      lines.push('【替代方案】');
      tmpl.alternatives.forEach((it, i) => lines.push(`  ${i + 1}. ${it}`));
      lines.push('');
      lines.push('【麻醉说明】');
      tmpl.anesthesiaNote.forEach((it, i) => lines.push(`  ${i + 1}. ${it}`));
      lines.push('');
      lines.push('【术后注意事项】');
      tmpl.postOperative.forEach((it, i) => lines.push(`  ${i + 1}. ${it}`));
      lines.push('');
      if (r.notes && r.notes.length > 0) {
        lines.push('── 交接备注 ──');
        r.notes.forEach((n) => {
          lines.push(`  · [${formatDate(n.createdAt, 'datetime')}] ${n.operator}：${n.content}`);
        });
        lines.push('');
      }
      lines.push('');
    });

    lines.push('═'.repeat(90));
    lines.push(`归档包结束  ·  共 ${selectedRecords.length} 份记录`);
    lines.push('═'.repeat(90));

    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = formatDate(new Date(), 'date').replace(/-/g, '');
    a.download = `知情同意书归档包_${archiveMonth}_${dateStr}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    const pkg: ArchivePackage = {
      id: generateId('arc'),
      name: `${archiveMonth}_${archiveItem}_${archiveOperator}_${selectedRecords.length}份`,
      createdAt: nowISO(),
      createdBy: '王助理',
      recordIds: Array.from(selectedIds),
      filters: { month: monthFilter === 'all' ? undefined : monthFilter, itemCode: itemFilter === 'all' ? undefined : itemFilter, operator: operatorFilter === 'all' ? undefined : operatorFilter },
    };
    setArchivedPackages([pkg, ...archivedPackages]);
    setSelectedIds(new Set());
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4 no-print" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[1300px] max-h-[90vh] overflow-hidden animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 via-white to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <Archive size={22} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                归档中心
                <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-medium">
                  已签署 {signedRecords.length} 份
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                按月份、项目、咨询师筛选后批量生成归档包，含患者基本信息、签署时间、费用、签名及完整条款
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-gray-400" />
            <span className="text-xs text-gray-500">月份：</span>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="input-field w-36 py-1 text-xs">
              <option value="all">全部月份</option>
              {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <FileCheck size={13} className="text-gray-400" />
            <span className="text-xs text-gray-500">项目：</span>
            <select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} className="input-field w-36 py-1 text-xs">
              <option value="all">全部项目</option>
              {TREATMENT_ITEMS.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Users size={13} className="text-gray-400" />
            <span className="text-xs text-gray-500">咨询师：</span>
            <select value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)} className="input-field w-36 py-1 text-xs">
              <option value="all">全部咨询师</option>
              {operators.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-gray-400">筛选后共 {filtered.length} 条 · 已选 {selectedIds.size}</span>
          <button
            type="button"
            onClick={generateArchive}
            disabled={selectedIds.size === 0}
            className="btn-primary text-xs"
          >
            <Package size={13} />
            生成归档包（{selectedIds.size}）
          </button>
        </div>

        {archivedPackages.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 bg-blue-50/30">
            <div className="text-[11px] text-gray-500 mb-2 flex items-center gap-1">
              <Package size={11} />
              本次会话生成的归档包
            </div>
            <div className="flex flex-wrap gap-2">
              {archivedPackages.map((p) => (
                <div key={p.id} className="bg-white rounded-lg border border-blue-100 px-3 py-1.5 text-xs flex items-center gap-2">
                  <span className="text-blue-600 font-medium">📦</span>
                  <span className="text-gray-700">{p.name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{formatDate(p.createdAt, 'time')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50/80 sticky top-0 z-10">
              <tr className="text-gray-500 text-left">
                <th className="py-2.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="py-2.5 px-3">患者</th>
                <th className="py-2.5 px-3">项目/牙位</th>
                <th className="py-2.5 px-3">费用</th>
                <th className="py-2.5 px-3">咨询师</th>
                <th className="py-2.5 px-3">签署时间</th>
                <th className="py-2.5 px-3">模板状态</th>
                <th className="py-2.5 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 text-primary-700 flex items-center justify-center font-semibold text-[11px] shrink-0">
                        {r.patient.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{r.patient.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{r.patient.gender}·{r.patient.age}岁 · {r.patient.medicalRecordNo}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded font-mono mr-1">{r.item.name}</span>
                    <span className="text-[11px] text-gray-500">{r.toothPosition}</span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-700 font-mono text-[11px]">{r.feeDescription}</td>
                  <td className="py-2.5 px-3 text-gray-600 text-[11px]">{r.operator ?? '—'}</td>
                  <td className="py-2.5 px-3 text-gray-500 text-[11px] font-mono">{r.signedAt ? formatDate(r.signedAt, 'datetime') : '—'}</td>
                  <td className="py-2.5 px-3">
                    {r.templateOverride && (r.templateOverride.riskNotice || r.templateOverride.alternatives || r.templateOverride.anesthesiaNote || r.templateOverride.postOperative) ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 font-medium">已自定义</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200 font-medium">标准模板</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(r)}
                      className="text-[11px] text-primary-600 hover:text-primary-700 flex items-center gap-1 justify-end ml-auto"
                    >
                      <FileSearch size={12} />
                      查看详情 <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3 opacity-40">📦</div>
              <p className="text-gray-400 text-sm">当前筛选条件下暂无已签署记录</p>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            💡 生成的归档包（TXT 格式）包含患者基本信息、签署时间、费用说明、签名状态及完整条款内容，可直接打印或存档
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              已选择：{selectedIds.size} / {filtered.length}
            </span>
            <button
              onClick={generateArchive}
              disabled={selectedIds.size === 0}
              className="btn-primary text-sm"
            >
              <Package size={14} />
              生成归档包
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { NavLink, useLocation } from 'react-router-dom';
import { FileUser, PenLine, ClipboardList, Stethoscope } from 'lucide-react';

const NAV = [
  { to: '/', label: '患者信息', icon: FileUser },
  { to: '/records', label: '签署记录', icon: ClipboardList },
];

export default function Navbar() {
  const location = useLocation();
  const isSignPage = location.pathname.startsWith('/sign');

  return (
    <header className="no-print sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center text-white shadow-md">
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800 leading-tight">雅康口腔 · 知情同意书签署台</h1>
            <p className="text-[11px] text-gray-400 leading-tight">Dental Informed Consent Platform</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {!isSignPage && NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          {isSignPage && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-50 text-accent-500 text-sm font-medium">
              <PenLine size={17} />
              患者签署中
            </div>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">前台 · 王助理</p>
            <p className="text-[11px] text-gray-400">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-200 to-accent-200 flex items-center justify-center text-primary-700 font-semibold text-sm border-2 border-white shadow-sm">
            王
          </div>
        </div>
      </div>
    </header>
  );
}

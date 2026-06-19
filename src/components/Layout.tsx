import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fa]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="no-print py-5 text-center text-xs text-gray-400 border-t border-gray-100 bg-white/60">
        © {new Date().getFullYear()} 雅康口腔门诊 · 知情同意书数字化管理系统 &nbsp;|&nbsp;
        本系统签署的电子同意书与纸质版具有同等法律效力
      </footer>
    </div>
  );
}

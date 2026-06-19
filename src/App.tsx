import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import PatientInfoPage from '@/pages/PatientInfoPage';
import SignPage from '@/pages/SignPage';
import RecordsPage from '@/pages/RecordsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PatientInfoPage />} />
          <Route path="/records" element={<RecordsPage />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="/sign/:recordId" element={<SignPage />} />
        </Route>
        <Route path="*" element={<Layout />} />
      </Routes>
    </BrowserRouter>
  );
}

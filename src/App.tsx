import { useState } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { UploadPage } from './components/UploadPage';
import { ResultsPage } from './components/ResultsPage';
import { translations } from './translations';

export type Language = 'zh' | 'en' | 'nl';
export type Page = 'home' | 'upload' | 'results';

export default function App() {
  const [language, setLanguage] = useState<Language>('zh');
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [uploadedFileData, setUploadedFileData] = useState<any>(null);
  const t = translations[language];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation 
        t={t} 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        language={language}
        setLanguage={setLanguage}
      />
      
      {currentPage === 'home' && <HomePage t={t} setCurrentPage={setCurrentPage} />}
      {currentPage === 'upload' && <UploadPage t={t} setCurrentPage={setCurrentPage} setUploadedFileData={setUploadedFileData} />}
      {currentPage === 'results' && uploadedFileData && <ResultsPage t={t} fileData={uploadedFileData} />}
    </div>
  );
}
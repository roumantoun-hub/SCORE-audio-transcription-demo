import { Page } from '../App';
import { Language } from '../App';
import { motion } from 'motion/react';

interface NavigationProps {
  t: any;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export function Navigation({ t, currentPage, setCurrentPage, language, setLanguage }: NavigationProps) {
  const languages: { code: Language; label: string }[] = [
    { code: 'zh', label: 'ZH' },
    { code: 'en', label: 'EN' },
    { code: 'nl', label: 'NL' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 backdrop-blur-sm bg-black/50">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <motion.button 
          onClick={() => setCurrentPage('home')}
          className="text-xl tracking-wider hover:opacity-60 transition-opacity relative"
          whileHover={{ 
            textShadow: '0 0 20px rgba(0, 255, 65, 0.8)',
            color: '#00ff41',
          }}
        >
          SCORE
          {/* Pixel corners */}
          <motion.div
            className="absolute -top-1 -left-1 w-1 h-1 bg-[#00ff41]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ boxShadow: '0 0 5px rgba(0, 255, 65, 0.8)' }}
          />
          <motion.div
            className="absolute -bottom-1 -right-1 w-1 h-1 bg-[#ff00ff]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            style={{ boxShadow: '0 0 5px rgba(255, 0, 255, 0.8)' }}
          />
        </motion.button>
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-8">
            <NavButton
              active={currentPage === 'home'}
              onClick={() => setCurrentPage('home')}
              label={t.nav.home}
              color="#00ff41"
            />
            <NavButton
              active={currentPage === 'upload'}
              onClick={() => setCurrentPage('upload')}
              label={t.nav.upload}
              color="#ff00ff"
            />
            <NavButton
              active={false}
              onClick={() => {}}
              label={t.nav.features}
              color="#00d9ff"
            />
            <NavButton
              active={false}
              onClick={() => {}}
              label={t.nav.about}
              color="#ffff00"
            />
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-1 border-l border-white/10 pl-8">
            {languages.map((lang) => (
              <motion.button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-3 py-1 text-xs tracking-wider transition-all ${
                  language === lang.code 
                    ? 'opacity-100' 
                    : 'opacity-30 hover:opacity-60'
                }`}
                whileHover={{
                  color: language === lang.code ? '#ffffff' : '#00ff41',
                }}
              >
                {lang.label}
                {language === lang.code && (
                  <motion.div
                    layoutId="activeLang"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-[#00ff41]"
                    style={{ boxShadow: '0 0 5px rgba(0, 255, 65, 0.8)' }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavButton({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <motion.button
      onClick={onClick}
      className={`text-sm tracking-wide transition-all relative ${
        active ? 'opacity-100' : 'opacity-40 hover:opacity-70'
      }`}
      whileHover={{
        textShadow: `0 0 10px ${color}`,
        color: active ? '#ffffff' : color,
      }}
    >
      {label}
      {active && (
        <motion.div
          layoutId="activeNav"
          className="absolute -bottom-2 left-0 right-0 h-px"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      )}
    </motion.button>
  );
}
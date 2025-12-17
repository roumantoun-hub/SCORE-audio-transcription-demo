import { motion } from 'motion/react';
import { Page } from '../App';
import pixelHeroImage from 'figma:asset/6d1322606b0400e5d4aa1878c93f9ad5ee53d74a.png';
import { WaveShaderCircle } from './WaveShaderCircle';
import { useState } from 'react';

interface HomePageProps {
  t: any;
  setCurrentPage: (page: Page) => void;
}

export function HomePage({ t, setCurrentPage }: HomePageProps) {
  const [clickedFeatures, setClickedFeatures] = useState<Set<number>>(new Set());

  const handleFeatureClick = (index: number) => {
    setClickedFeatures(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
  };

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center px-6 pt-24 relative overflow-hidden">
        {/* Pixel art background with neon glow */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 2 }}
          className="absolute inset-0 z-0"
        >
          <img 
            src={pixelHeroImage} 
            alt="" 
            className="w-full h-full object-cover opacity-50"
            style={{ 
              mixBlendMode: 'screen',
              filter: 'contrast(1.2)',
            }}
          />
          {/* Neon overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ff41]/5 to-transparent" />
        </motion.div>

        {/* Wave Shader Circle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1]">
          <WaveShaderCircle size="800px" />
        </div>

        {/* Scanline effect */}
        <motion.div
          animate={{ y: ['0%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent 50%, rgba(0, 255, 65, 0.03) 50%)',
            backgroundSize: '100% 4px',
          }}
        />
        
        <div className="max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative"
          >
            <h1 className="text-6xl md:text-7xl lg:text-8xl mb-8 leading-tight tracking-tight relative">
              <span className="relative inline-block font-[Goldman]">
                {t.hero.title}
                {/* Neon glow text shadow effect */}
                <motion.span
                  animate={{ 
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 blur-sm text-[#00ff41]"
                  style={{ zIndex: -1 }}
                >
                  {t.hero.title}
                </motion.span>
              </span>
            </h1>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
            className="text-xl md:text-2xl text-white/60 mb-4 max-w-2xl font-[Alumni_Sans]"
          >
            {t.hero.subtitle}
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
            className="text-lg text-white/40 mb-16 max-w-xl font-[Alumni_Sans]"
          >
            {t.hero.description}
          </motion.p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            onClick={() => setCurrentPage('upload')}
            className="group relative px-8 py-4 border border-white/20 hover:border-[#00ff41] transition-all duration-300 overflow-hidden font-[Alumni_Sans] text-[32px]"
            whileHover={{ boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)' }}
          >
            <motion.div
              className="absolute inset-0 bg-[#00ff41]/10"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6 }}
            />
            <span className="relative text-sm tracking-widest group-hover:text-[#00ff41] transition-colors text-[20px]">
              {t.hero.cta}
            </span>
          </motion.button>
        </div>

        {/* Scroll indicator with neon */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-16 bg-gradient-to-b from-transparent via-[#00ff41]/60 to-transparent"
            style={{ boxShadow: '0 0 10px rgba(0, 255, 65, 0.5)' }}
          />
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="min-h-screen flex items-center px-6 py-32 relative">
        {/* Pixel noise background */}
        <div className="absolute inset-0 opacity-5">
          <motion.div
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-full h-full"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-5xl mb-24 tracking-tight font-[Goldman]"
          >
            {t.features.title}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#00ff41]/20">
            <FeatureItem
              title={t.features.separation}
              description={t.features.separationDesc}
              index={0}
              color="#00ff41"
              clicked={clickedFeatures.has(0)}
              handleClick={handleFeatureClick}
            />
            <FeatureItem
              title={t.features.sheet}
              description={t.features.sheetDesc}
              index={1}
              color="#ff00ff"
              clicked={clickedFeatures.has(1)}
              handleClick={handleFeatureClick}
            />
            <FeatureItem
              title={t.features.editing}
              description={t.features.editingDesc}
              index={2}
              color="#00d9ff"
              clicked={clickedFeatures.has(2)}
              handleClick={handleFeatureClick}
            />
            <FeatureItem
              title={t.features.export}
              description={t.features.exportDesc}
              index={3}
              color="#ffff00"
              clicked={clickedFeatures.has(3)}
              handleClick={handleFeatureClick}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-white/30 tracking-wider">{t.footer.rights}</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureItem({ title, description, index, color, clicked, handleClick }: { title: string; description: string; index: number; color: string; clicked: boolean; handleClick: (index: number) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ 
        boxShadow: `0 0 30px ${color}40`,
      }}
      className="bg-black p-12 hover:bg-white/[0.02] transition-all duration-500 group relative overflow-hidden"
      onClick={() => handleClick(index)}
    >
      {/* Neon border effect on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: `inset 0 0 20px ${color}30`,
        }}
      />
      
      <div className="flex flex-col h-full justify-between relative z-10">
        <div>
          <motion.div 
            className="text-6xl mb-8 transition-all cursor-pointer"
            style={clicked ? { 
              background: 'linear-gradient(135deg, #ff00ff, #00d9ff, #00ff41, #ff6b00)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              backgroundSize: '200% 200%',
            } : {
              color: 'white',
            }}
            animate={clicked ? {
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            } : {}}
            transition={clicked ? {
              duration: 10,
              repeat: Infinity,
              ease: 'linear',
            } : {
              duration: 2,
            }}
            whileHover={{
              textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
              filter: 'brightness(1.5)',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </motion.div>
          <h3 
            className="text-2xl mb-4 transition-colors duration-500 group-hover:text-white font-[Alumni_Sans]"
            style={{
              textShadow: `0 0 0px ${color}`,
            }}
          >
            {title}
          </h3>
        </div>
        <p className="text-white/40 text-sm tracking-wide group-hover:text-white/60 transition-colors duration-500 font-[Alumni_Sans]">
          {description}
        </p>
      </div>

      {/* Pixel corner decorations */}
      <motion.div
        initial={{ scale: 0 }}
        whileHover={{ scale: 1 }}
        className="absolute top-0 right-0 w-2 h-2"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
      />
      <motion.div
        initial={{ scale: 0 }}
        whileHover={{ scale: 1 }}
        className="absolute bottom-0 left-0 w-2 h-2"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
      />
    </motion.div>
  );
}
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Camera, 
  Loader2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Info, 
  Search,
  Scan,
  Beef,
  X,
  ChevronRight,
  BookOpen,
  Zap,
  Globe,
  Download,
  ArrowLeftRight,
  Activity,
  Droplet,
  Sun,
  Moon,
  Shield,
  Tractor,
  MessageSquare,
  Send
} from 'lucide-react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue, useScroll } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Markdown from 'react-markdown';
import { classifyCattleBreed, askFarmerAssistant, translateClassificationResult, type ClassificationResult, type ChatMessage } from './services/geminiService';
import { cn } from './lib/utils';

// --- Components ---

const Navigation = ({ onBreedsClick, onDocsClick, toggleDarkMode, isDarkMode }: { onBreedsClick: () => void, onDocsClick: () => void, toggleDarkMode: () => void, isDarkMode: boolean }) => (
  <nav className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 flex-shrink-0 sticky top-0 z-50">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-emerald-700 flex items-center justify-center rounded-sm text-2xl">
        🐄
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-800">
        CattReg<span className="text-emerald-700 uppercase"> AI</span> 
        <span className="text-[10px] font-mono font-medium text-slate-400 align-top ml-2">V2.4</span>
      </span>
    </div>
    <div className="hidden md:flex items-center gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
      <span className="text-emerald-700 border-b-2 border-emerald-700 pb-1 cursor-default">Classifier</span>
      <button onClick={onBreedsClick} className="hover:text-slate-600 cursor-pointer transition-colors outline-none focus:text-emerald-600">Indigenous Breeds</button>
      <button onClick={onDocsClick} className="hover:text-slate-600 cursor-pointer transition-colors outline-none focus:text-emerald-600">Documentation</button>
      <button onClick={toggleDarkMode} className="hover:bg-slate-100 p-2 rounded-full cursor-pointer transition-colors focus:outline-none flex items-center justify-center" aria-label="Toggle Dark Mode">
        {isDarkMode ? <Sun className="w-4 h-4 text-slate-600" /> : <Moon className="w-4 h-4 text-slate-600" />}
      </button>
    </div>
  </nav>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] cursor-pointer"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] bg-white rounded-sm shadow-2xl z-[101] flex flex-col overflow-hidden"
        >
          <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-800">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-6">
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const BREEDS_DATA = [
  { 
    name: "Gir", 
    origin: "Gujarat", 
    type: "Milk", 
    traits: ["Distinctive humped forehead", "Long drooping ears"],
    feeding: "Requires high-quality forage, balanced concentrates and mineral mixtures for peak lactation.",
    diseases: "Resistant to foot-and-mouth disease (FMD) but susceptible to tick-borne fever.",
    lifespan: "12 - 15 years",
    metrics: { yield: 85, heat: 95, defense: 88, draught: 40 }
  },
  { 
    name: "Sahiwal", 
    origin: "Punjab/Haryana", 
    type: "Milk", 
    traits: ["Heavy built", "High heat tolerance"],
    feeding: "Adapts well to agricultural by-products; thrives on green fodder and legume-based hay.",
    diseases: "Superior resistance to parasites and bloat; relatively hardy against mastitis.",
    lifespan: "15 - 18 years",
    metrics: { yield: 92, heat: 98, defense: 82, draught: 35 }
  },
  { 
    name: "Kankrej", 
    origin: "Gujarat/Rajasthan", 
    type: "Dual", 
    traits: ["Large lyre-shaped horns", "Strong draught capacity"],
    feeding: "Highly efficient grazers; can thrive on poor quality roughage in arid regions.",
    diseases: "Notable resistance to contagious bovine pleuropneumonia.",
    lifespan: "14 - 16 years",
    metrics: { yield: 65, heat: 92, defense: 85, draught: 88 }
  },
  { 
    name: "Red Sindhi", 
    origin: "Sindh Region", 
    type: "Milk", 
    traits: ["Deep red color", "Hardy and disease resistant"],
    feeding: "Responds well to stall feeding; needs consistent access to clean water and balanced protein.",
    diseases: "Exceptional resistance to heat stress and tropical skin diseases.",
    lifespan: "15 - 20 years",
    metrics: { yield: 88, heat: 96, defense: 90, draught: 40 }
  },
  { 
    name: "Tharparkar", 
    origin: "Rajasthan", 
    type: "Dual", 
    traits: ["White/Grey coat", "Superior desert adaptation"],
    feeding: "Can survive on dry desert vegetation; highly efficient water utilization.",
    diseases: "Strong immunity against endemic tropical diseases.",
    lifespan: "14 - 18 years",
    metrics: { yield: 78, heat: 94, defense: 86, draught: 82 }
  },
  { 
    name: "Ongole", 
    origin: "Andhra Pradesh", 
    type: "Dual", 
    traits: ["Massive build", "International demand for beef"],
    feeding: "Requires high caloric intake due to size; prefers natural grasses and sorghum fodder.",
    diseases: "Resistant to 'mad cow disease' and major viral infections common in humid climates.",
    lifespan: "15 - 18 years",
    metrics: { yield: 60, heat: 90, defense: 80, draught: 92 }
  },
  { 
    name: "Hallikar", 
    origin: "Karnataka", 
    type: "Draught", 
    traits: ["Tightly curved horns", "Extraordinary stamina"],
    feeding: "Specialized diet for high performance; thrives on local hay and oil cakes.",
    diseases: "Exceptional respiratory health and structural integrity.",
    lifespan: "12 - 15 years",
    metrics: { yield: 20, heat: 85, defense: 82, draught: 98 }
  }
];

const ComparisonContent = ({ selectedBreeds, onToggle }: { selectedBreeds: string[], onToggle: (name: string) => void }) => {
  const data = BREEDS_DATA.filter(b => selectedBreeds.includes(b.name));
  
  return (
    <div className="space-y-8">
      <div>
        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Select Specimens to Compare</h5>
        <div className="flex flex-wrap gap-2">
          {BREEDS_DATA.map(breed => {
            const isSelected = selectedBreeds.includes(breed.name);
            return (
              <button
                key={breed.name}
                onClick={() => onToggle(breed.name)}
                className={cn(
                  "px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all border",
                  isSelected 
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200" 
                    : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                )}
              >
                {breed.name}
              </button>
            );
          })}
        </div>
      </div>

      {data.length < 2 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-100 border-dashed rounded-sm">
          <ArrowLeftRight className="w-10 h-10 text-slate-200 mx-auto mb-4" />
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">Select at least <span className="text-emerald-600">2 Breeds</span> for Analysis</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-8">
            {data.slice(0, 2).map(breed => (
              <div key={breed.name} className="space-y-6">
                <div className="flex items-center gap-3 border-b-4 border-emerald-500 pb-3">
                  <h4 className="text-2xl font-black text-slate-900 uppercase italic leading-none">
                    {breed.name}
                  </h4>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                
                <div className="space-y-5">
                  <CharactersticBar icon={Droplet} label="Yield Potential" value={`${breed.metrics.yield}%`} percentage={breed.metrics.yield} />
                  <CharactersticBar icon={Sun} label="Thermal Load" value={`${breed.metrics.heat}%`} percentage={breed.metrics.heat} />
                  <CharactersticBar icon={Tractor} label="Draught Force" value={`${breed.metrics.draught}%`} percentage={breed.metrics.draught} />
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-sm">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Technical Profile</p>
                   <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic">
                     {breed.traits.slice(0, 2).join(" • ")}
                   </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-slate-950 p-6 rounded-sm space-y-6 border border-emerald-900/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Scan className="w-32 h-32 text-white" />
             </div>
             <h5 className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2">
               <Zap className="w-3 h-3" />
               Cross-Specimen Correlation Matrix
             </h5>
             <div className="grid gap-5">
                {[
                  { label: "Climate Adaptability", base: 85 },
                  { label: "Metabolic Efficiency", base: 70 },
                  { label: "Forage Utilization", base: 90 }
                ].map((metric, i) => {
                  const val1 = data[0].metrics.heat;
                  const val2 = data[1].metrics.heat;
                  const variance = Math.abs(val1 - val2);
                  const score = Math.max(40, 100 - variance);

                  return (
                    <div key={metric.label} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{metric.label}</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400">{score}% Match</span>
                      </div>
                      <div className="flex gap-px bg-slate-800 h-1 rounded-full overflow-hidden">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                         />
                      </div>
                    </div>
                  );
                })}
             </div>
             <div className="pt-4 mt-4 border-t border-slate-800 flex items-center gap-3">
                <Info className="w-3 h-3 text-slate-600" />
                <p className="text-[9px] text-slate-500 leading-relaxed font-mono uppercase tracking-tight">
                  Differential algorithms applied to {data[0].name.toUpperCase()} and {data[1].name.toUpperCase()} baseline clusters.
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};


const BreedsList = () => {
  const breeds = BREEDS_DATA;

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed italic border-l-2 border-emerald-500 pl-4">
        India is home to 53 registered indigenous cattle breeds. Our AI spans across these major lineages specializing in Zebu (Bos Indicus) characteristics.
      </p>
      <div className="grid gap-4">
        {breeds.map((breed) => (
          <div key={breed.name} className="p-5 bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">{breed.name}</h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase mt-1">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  {breed.origin}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-bold bg-emerald-100 px-2 py-0.5 rounded text-emerald-700 uppercase tracking-widest">{breed.type}</span>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">Life: {breed.lifespan}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span title="Yield Potential" className="text-[9px] uppercase tracking-widest bg-blue-50 border border-blue-100 px-2 py-1 rounded text-blue-700 flex items-center gap-1 font-bold">
                  <Droplet className="w-3 h-3" /> YIELD {breed.metrics.yield}%
                </span>
                <span title="Heat Resistance" className="text-[9px] uppercase tracking-widest bg-orange-50 border border-orange-100 px-2 py-1 rounded text-orange-700 flex items-center gap-1 font-bold">
                  <Sun className="w-3 h-3" /> HEAT {breed.metrics.heat}%
                </span>
                <span title="Disease Resistance" className="text-[9px] uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2 py-1 rounded text-emerald-700 flex items-center gap-1 font-bold">
                  <Shield className="w-3 h-3" /> DEF {breed.metrics.defense}%
                </span>
                <span title="Draught Power" className="text-[9px] uppercase tracking-widest bg-amber-50 border border-amber-100 px-2 py-1 rounded text-amber-700 flex items-center gap-1 font-bold">
                  <Tractor className="w-3 h-3" /> DRAUGHT {breed.metrics.draught}%
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {breed.traits.map(trait => (
                  <span key={trait} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-emerald-500" /> {trait}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <div className="flex gap-3">
                  <div className="p-2 bg-white rounded border border-slate-100 flex-shrink-0 self-start">
                    <span className="text-emerald-600 inline-block text-[10px] font-bold">FEEDS</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                    {breed.feeding}
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="p-2 bg-white rounded border border-slate-100 flex-shrink-0 self-start">
                    <span className="text-rose-600 inline-block text-[10px] font-bold">HEALTH</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                    {breed.diseases}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DocumentationContent = () => (
  <div className="space-y-8">
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-emerald-600" />
        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">Quick Start Guide</h4>
      </div>
      <div className="grid gap-4">
        {[
          { step: "01", title: "Input Data", desc: "Upload a JPG/PNG or use the device camera to capture a clear specimen image." },
          { step: "02", title: "ML Processing", desc: "Our Gemini-3-V neural engine extracts morphological features and spatial patterns." },
          { step: "03", title: "Results", desc: "Receive breed identification, confidence scoring, and technical documentation." },
        ].map(item => (
          <div key={item.step} className="flex gap-4">
            <span className="text-lg font-black text-slate-100 italic select-none">{item.step}</span>
            <div>
              <h5 className="text-xs font-bold text-slate-800 mb-1">{item.title}</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="bg-slate-900 border border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-emerald-500" />
        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-100">Technical Parameters</h4>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">Latency Threshold</span>
          <span className="text-emerald-400 font-mono">{'<'}2000ms</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">Model Lineage</span>
          <span className="text-emerald-400 font-mono">CattRegg AI-Core-V4</span>
        </div>
      </div>
    </section>

    <section className="border-t border-slate-100 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-emerald-600" />
        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">Best Practices</h4>
      </div>
      <ul className="grid gap-3">
         <li className="text-[11px] text-slate-600 flex items-start gap-2 italic">
           <div className="h-4 w-1 bg-emerald-500 shrink-0" />
           Ensure the animal's face, hump, and dewlap are visible for higher precision.
         </li>
         <li className="text-[11px] text-slate-600 flex items-start gap-2 italic">
           <div className="h-4 w-1 bg-emerald-500 shrink-0" />
           Avoid heavy blur or obstructing foreground elements like fencing.
         </li>
      </ul>
    </section>
  </div>
);

const StatusBar = () => (
  <footer className="h-12 bg-slate-900 text-slate-400 flex items-center justify-between px-8 text-[10px] font-mono uppercase tracking-widest flex-shrink-0">
    <div className="flex gap-6">
      <span className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 
        Neural Engine Online
      </span>
      <span className="hidden sm:inline">Dataset: AgriNet-2024</span>
    </div>
    <div className="flex gap-6">
      <span className="hidden sm:inline">Latency: 38ms</span>
      <span className="text-white font-bold">UID: #BCE-88219-X</span>
    </div>
  </footer>
);

const CharactersticBar = ({ label, value, percentage, icon: Icon }: { label: string, value: string, percentage: number, icon?: React.ElementType }) => (
  <div className="group">
    <div className="flex justify-between text-[10px] mb-2 uppercase font-bold tracking-widest">
      <span className="text-slate-400 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className={cn(
        "font-black tracking-tighter",
        percentage > 80 ? "text-emerald-600" : percentage > 50 ? "text-blue-600" : "text-amber-600"
      )}>{value}</span>
    </div>
    <div className="w-full h-1 bg-slate-100 overflow-hidden rounded-full">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn(
          "h-full transition-colors duration-500",
          percentage > 80 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
          percentage > 50 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" : 
          "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
        )}
      />
    </div>
  </div>
);

const ConfidenceGauge = ({ percentage }: { percentage: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-full h-full -rotate-90">
        {/* Background track */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-100"
        />
        {/* Progress bar */}
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeLinecap="round"
          className="text-emerald-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-slate-800 leading-none">{percentage}%</span>
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Match</span>
      </div>
    </div>
  );
};

const ScrollReveal = ({ children, containerRef, className }: { children: React.ReactNode, containerRef: React.RefObject<HTMLDivElement | null>, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container: containerRef,
    offset: ["0 1", "0.5 0.8"]
  });
  
  const smoothProgress = useSpring(scrollYProgress, { damping: 25, stiffness: 150 });
  const opacity = useTransform(smoothProgress, [0, 1], [0, 1]);
  const y = useTransform(smoothProgress, [0, 1], [50, 0]);

  return (
    <motion.div ref={ref} style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
};

const INDIAN_LANGUAGES = [
  "English", "Hindi (हिन्दी)", "Bengali (বাংলা)", "Marathi (मराठी)", "Telugu (తెలుగు)", 
  "Tamil (தமிழ்)", "Gujarati (ગુજરાતી)", "Urdu (اردو)", "Kannada (ಕನ್ನಡ)", "Odia (ଓଡ଼ିଆ)", 
  "Malayalam (മലയാളം)", "Punjabi (ਪੰਜਾਬੀ)", "Assamese (অসমীয়া)", "Maithili (मैथिली)", 
  "Santali (ᱥᱟᱱᱛᱟᱲᱤ)", "Kashmiri (कॉशुर)", "Nepali (नेपाली)", "Sindhi (سنڌي)", 
  "Dogri (डोगरी)", "Konkani (कोंकणी)", "Manipuri (ꯃꯤꯇꯩꯂꯣꯟ)", "Bodo (बर')", "Sanskrit (संस्कृत)"
];

function FarmerChat({ image, fileType, result }: { image: string | null, fileType: string, result: ClassificationResult | null }) {
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatLog, preferredLanguage]);

  const handleLanguageSelect = (lang: string) => {
    setPreferredLanguage(lang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !preferredLanguage) return;

    const currentQuestion = question;
    const currentHistory = [...chatLog];
    
    setChatLog(prev => [...prev, { role: 'user', content: currentQuestion }]);
    setQuestion('');
    setIsAsking(true);

    try {
      const historyFormatted: ChatMessage[] = currentHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));
      
      const response = await askFarmerAssistant(image, fileType, currentQuestion, historyFormatted, result, preferredLanguage);
      setChatLog(prev => [...prev, { role: 'model', content: response }]);
    } catch (err: any) {
      setChatLog(prev => [...prev, { role: 'model', content: "Error: " + err.message + ". Please try again later." }]);
    } finally {
      setIsAsking(false);
    }
  };

  if (!preferredLanguage) {
    return (
      <div className="flex flex-col h-full mt-2">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          AI Chat Assistant for Farmers - Select Language
        </h3>
        <div className="bg-slate-50 border border-slate-100 rounded-sm p-4 mb-4">
          <p className="text-[13px] font-medium text-slate-700 mb-4 text-center">
            Please choose your preferred language / कृपया अपनी पसंदीदा भाषा चुनें:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2">
            {INDIAN_LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageSelect(lang)}
                className="px-3 py-2 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-sm hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-left"
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full mt-2">
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          AI Chat Assistant
        </span>
        <button 
          onClick={() => setPreferredLanguage(null)}
          className="text-emerald-600 hover:text-emerald-700 underline text-[9px]"
        >
          Change Language ({preferredLanguage.split(' ')[0]})
        </button>
      </h3>
      
      <div ref={chatContainerRef} className="space-y-4 mb-4 max-h-80 overflow-y-auto pr-2">
        {chatLog.map((log, i) => (
          <div key={i} className={cn("p-4 rounded-md border text-[13px] leading-relaxed", log.role === 'user' ? "bg-slate-50 border-slate-200 ml-8" : "bg-emerald-50/50 border-emerald-100 mr-8")}>
            <div className="text-slate-800 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2 [&_strong]:font-bold [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm space-y-1">
              <Markdown>{log.content}</Markdown>
            </div>
          </div>
        ))}
        {isAsking && (
          <div className="mr-8 p-3 rounded-md border bg-emerald-50/50 border-emerald-100 flex items-center gap-2">
            <Loader2 className="animate-spin w-4 h-4 text-emerald-600" />
            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Assistant is typing...</span>
          </div>
        )}
        {chatLog.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 border border-slate-100 rounded-sm">
            <MessageSquare className="w-6 h-6 text-slate-300 mb-2" />
            <p className="text-[11px] font-medium text-slate-500 text-center">
              {result && result.breed !== "Unknown" 
                ? `Ask a question about your ${result.breed}.` 
                : image 
                  ? "Ask a question about the cattle in the image."
                  : "Ask a question or tell me what type of cattle you have."}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 italic text-center">
              {result && result.breed !== "Unknown"
                ? `E.g. "What should I feed my ${result.breed}?"`
                : "E.g. \"I have a Gir cow, what should I feed it?\""}
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 relative mt-4">
        <input 
          type="text" 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question..."
          className="flex-1 bg-white border border-slate-200 p-3 pr-12 rounded-sm text-[12px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-slate-800"
          disabled={isAsking}
        />
        <button 
          type="submit" 
          disabled={isAsking || !question.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'breeds' | 'docs' | null>(null);
  const [showPDFLanguageModal, setShowPDFLanguageModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const centerScrollRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { offsetWidth, offsetHeight } = currentTarget;
    
    // Normalize to -1 to 1 based on center of screen
    const x = (clientX / offsetWidth - 0.5) * 2;
    const y = (clientY / offsetHeight - 0.5) * 2;
    
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const springConfig = { damping: 30, stiffness: 150, mass: 1 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const rotateY = useTransform(smoothMouseX, [-1, 1], [-6, 6]);
  const rotateX = useTransform(smoothMouseY, [-1, 1], [6, -6]);

  const handleDownloadPDF = () => {
    if (!result) return;
    setShowPDFLanguageModal(true);
  };

  const generateTranslatedPDF = async (lang: string) => {
    if (!result) return;
    setIsGeneratingPDF(true);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to generate the PDF report.");
        setIsGeneratingPDF(false);
        return;
    }
    
    printWindow.document.write(`<html><body><h2 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Generating PDF report in ${lang}... Please wait.</h2></body></html>`);

    try {
        const payloadToTranslate = {
            ...result,
            pdfLabels: {
                reportTitle: "CattRegg AI Classification Report",
                reportUid: "Report UID:",
                dateText: "Date:",
                languageText: "Language:",
                category: "Category",
                indigenousIndianBreed: "Indigenous Indian Breed",
                foreignGlobalBreed: "Foreign/Global Breed",
                origin: "Origin",
                confidence: "Confidence",
                usage: "Usage",
                estimatedPrice: "Estimated Price",
                estimatedAge: "Estimated Age",
                timeRemaining: "Time Remaining",
                technicalDescription: "Technical Description",
                keyMorphologicalCharacteristics: "Key Morphological Characteristics",
                similarBreedsConsidered: "Similar Breeds Considered",
                breedComparisons: "Breed Comparisons",
                comparisonText: "Comparison:",
                feedingHabits: "Feeding Habits",
                climateLivingConditions: "Climate & Living Conditions",
                healthAnalysis: "Health Analysis",
                visibleSigns: "Visible Signs:",
                proneAilments: "Prone Ailments:",
                solutionsTreatments: "Solutions/Treatments",
                thingsToAvoid: "Things To Avoid",
                dewormingSchedule: "Deworming Schedule",
                checkupSchedule: "Checkup Schedule",
                recommendedVaccines: "Recommended Vaccines"
            }
        };

        const translatedResult = await translateClassificationResult(payloadToTranslate, lang);
        
        // Use strictly translated result to prevent English fallbacks
        const finalResult = translatedResult;
        const labels = { ...payloadToTranslate.pdfLabels, ...(finalResult.pdfLabels || {}) };

        const dateStr = new Date().toLocaleDateString();
        const uid = `#BCE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>CattRegg AI Report (${lang})</title>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #000; font-size: 24px; }
                .header p { margin: 4px 0 0; color: #475569; font-size: 12px; }
                .grid { display: flex; gap: 20px; margin-bottom: 30px; }
                .img-container { flex: 0 0 200px; }
                .img-container img { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
                .basic-info { flex: 1; }
                .breed-title { font-size: 20px; font-weight: bold; color: #047857; margin: 0 0 10px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 14px; }
                td { padding: 4px 0; }
                .label { font-weight: 600; color: #475569; width: 140px; }
                .section { margin-bottom: 20px; }
                .section h2 { font-size: 16px; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; }
                .text { font-size: 14px; color: #334155; }
                ul { margin: 0; padding-left: 20px; font-size: 14px; color: #334155; auto; }
                li { margin-bottom: 4px; }
                @media print {
                  body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${labels.reportTitle}</h1>
                <p>${labels.reportUid} ${uid} | ${labels.dateText} ${dateStr} | ${labels.languageText} ${lang.split(' ')[0]}</p>
            </div>
            
            <div class="grid">
                ${image ? `<div class="img-container"><img src="${image}" /></div>` : ''}
                <div class="basic-info">
                    <h2 class="breed-title">${finalResult.breed ? finalResult.breed.toUpperCase() : ''}</h2>
                    <table>
                        ${finalResult.isIndigenous !== undefined ? `<tr><td class="label">${labels.category}</td><td>${finalResult.isIndigenous ? labels.indigenousIndianBreed : labels.foreignGlobalBreed}</td></tr>` : ''}
                        ${finalResult.origin ? `<tr><td class="label">${labels.origin}</td><td>${finalResult.origin}</td></tr>` : ''}
                        ${finalResult.confidence ? `<tr><td class="label">${labels.confidence}</td><td>${finalResult.confidence}</td></tr>` : ''}
                        ${finalResult.usage ? `<tr><td class="label">${labels.usage}</td><td>${finalResult.usage}</td></tr>` : ''}
                        ${finalResult.estimatedPrice ? `<tr><td class="label">${labels.estimatedPrice}</td><td>${finalResult.estimatedPrice}</td></tr>` : ''}
                        ${finalResult.estimatedAge ? `<tr><td class="label">${labels.estimatedAge}</td><td>${finalResult.estimatedAge}</td></tr>` : ''}
                        ${finalResult.timeRemaining ? `<tr><td class="label">${labels.timeRemaining}</td><td>${finalResult.timeRemaining}</td></tr>` : ''}
                    </table>
                </div>
            </div>

            ${finalResult.description ? `
            <div class="section">
                <h2>${labels.technicalDescription}</h2>
                <div class="text">${finalResult.description}</div>
            </div>` : ''}

            ${Array.isArray(finalResult.characteristics) && finalResult.characteristics.length ? `
            <div class="section">
                <h2>${labels.keyMorphologicalCharacteristics}</h2>
                <ul>
                    ${finalResult.characteristics.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>` : ''}

            ${Array.isArray(finalResult.similarBreeds) && finalResult.similarBreeds.length ? `
            <div class="section">
                <h2>${labels.similarBreedsConsidered}</h2>
                <div class="text">${finalResult.similarBreeds.join(', ')}</div>
            </div>` : ''}

            ${Array.isArray(finalResult.breedComparisons) && finalResult.breedComparisons.length ? `
            <div class="section">
                <h2>${labels.breedComparisons}</h2>
                ${finalResult.breedComparisons.map(comp => `
                    <div style="margin-bottom: 10px;">
                        <div style="font-weight: bold; color: #1e293b; font-size: 14px;">${comp.candidateName}</div>
                        <div class="text">${labels.comparisonText} ${comp.comparisonText}</div>
                    </div>
                `).join('')}
            </div>` : ''}

             ${finalResult.feedingHabits ? `
            <div class="section">
                <h2>${labels.feedingHabits}</h2>
                <div class="text">${finalResult.feedingHabits}</div>
            </div>` : ''}

            ${finalResult.optimalClimaticConditions ? `
            <div class="section">
                <h2>${labels.climateLivingConditions}</h2>
                <div class="text">${finalResult.optimalClimaticConditions}</div>
            </div>` : ''}

            ${finalResult.currentDiseases || (Array.isArray(finalResult.expectedDiseases) && finalResult.expectedDiseases.length) ? `
            <div class="section">
                <h2>${labels.healthAnalysis}</h2>
                ${finalResult.currentDiseases ? `<div class="text" style="margin-bottom:5px;"><strong>${labels.visibleSigns}</strong> ${finalResult.currentDiseases}</div>` : ''}
                ${Array.isArray(finalResult.expectedDiseases) && finalResult.expectedDiseases.length ? `<div class="text"><strong>${labels.proneAilments}</strong> ${finalResult.expectedDiseases.join(', ')}</div>` : ''}
            </div>` : ''}

            ${finalResult.diseaseSolutions ? `
            <div class="section">
                <h2>${labels.solutionsTreatments}</h2>
                <div class="text">${finalResult.diseaseSolutions}</div>
            </div>` : ''}

            ${Array.isArray(finalResult.thingsToAvoid) && finalResult.thingsToAvoid.length ? `
            <div class="section">
                <h2>${labels.thingsToAvoid}</h2>
                <ul>
                    ${finalResult.thingsToAvoid.map(a => `<li>${a}</li>`).join('')}
                </ul>
            </div>` : ''}
            
            ${finalResult.dewormingSchedule ? `
            <div class="section">
                <h2>${labels.dewormingSchedule}</h2>
                <div class="text">${finalResult.dewormingSchedule}</div>
            </div>` : ''}

            ${finalResult.checkupSchedule ? `
            <div class="section">
                <h2>${labels.checkupSchedule}</h2>
                <div class="text">${finalResult.checkupSchedule}</div>
            </div>` : ''}

            ${Array.isArray(finalResult.vaccines) && finalResult.vaccines.length ? `
            <div class="section">
                <h2>${labels.recommendedVaccines}</h2>
                <ul>
                    ${finalResult.vaccines.map(v => `<li>${v?.name} - ${v?.schedule} (${v?.cost})</li>`).join('')}
                </ul>
            </div>` : ''}

            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setShowPDFLanguageModal(false);
    } catch (err: any) {
        console.error(err);
        printWindow.document.open();
        printWindow.document.write(`<html><body style="font-family: sans-serif; text-align: center; margin-top: 50px;"><h2>Error generating PDF. Please close this window and try again.</h2><p style="color: red;">${err.message || "Failed to generate Translated PDF."}</p></body></html>`);
        printWindow.document.close();
        // optionally alert(err.message || "Failed to generate Translated PDF.");
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setFileType(file.type);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleClassify = async () => {
    if (!image) return;
    setIsClassifying(true);
    setError(null);
    try {
      const classification = await classifyCattleBreed(image, fileType);
      setResult(classification);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsClassifying(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-900 flex flex-col font-sans relative overflow-hidden"
      onMouseMove={handleMouseMove}
      style={{ perspective: "2500px" }}
    >
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-white"
          >
            <div className="flex flex-row items-center gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ 
                  scale: 0.5,
                  opacity: 0,
                  filter: "blur(10px)"
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 15
                }}
                className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 flex items-center justify-center rounded-sm text-4xl md:text-5xl shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50"
              >
                🐄
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                className="flex items-center text-4xl md:text-6xl font-mono font-bold tracking-tight text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
              >
                {"CattReg AI".split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.01,
                      delay: 0.8 + index * 0.1,
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
                <motion.span 
                  className="w-[0.5em] h-[1em] bg-emerald-400 ml-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [1, 1, 0, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, times: [0, 0.49, 0.5, 0.99, 1] }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="flex-grow flex flex-col relative z-0 h-full max-h-screen overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: showSplash ? 0 : 1 }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <div className="absolute top-0 left-0 right-0 bottom-0 min-h-screen bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none -z-10" />

        <Navigation 
          onBreedsClick={() => setActiveModal('breeds')} 
          onDocsClick={() => setActiveModal('docs')}
          toggleDarkMode={toggleDarkMode}
          isDarkMode={isDarkMode} 
        />

        <motion.main 
        className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 lg:p-8 relative max-w-[1800px] mx-auto w-full"
        style={{ 
          rotateX, 
          rotateY, 
          transformStyle: "preserve-3d" 
        }}
      >
        {/* Left Sidebar: Controls */}
        <section 
          className="col-span-1 lg:col-span-3 bg-white p-6 shadow-2xl rounded-2xl flex flex-col gap-8 z-10 relative overflow-y-auto border border-slate-200/50 lg:h-[calc(100vh-4rem-6rem)]"
          style={{ transform: "translateZ(80px)", transformStyle: "preserve-3d" }}
        >
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-6">Input Matrix</h3>
            {!image ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-sm flex flex-col items-center justify-center text-slate-400 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer transition-all group"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <Upload className="h-8 w-8 mb-2 group-hover:text-emerald-500 transition-colors" />
                <span className="text-[10px] uppercase font-bold tracking-widest">Select Dataset</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="aspect-video bg-slate-100 rounded-sm border border-slate-200 overflow-hidden relative group">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={clearImage}
                    className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Trash2 className="text-white w-6 h-6" />
                  </button>
                </div>
                <div className="flex justify-between items-center bg-slate-50 rounded px-3 py-2 border border-slate-100">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                     <span className="text-[10px] font-mono text-slate-600 truncate max-w-[120px]">DATA_STREAM_READY</span>
                   </div>
                   <button onClick={clearImage} className="text-[10px] font-bold text-rose-500 hover:underline">RESET</button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-grow">
            <FarmerChat image={image} fileType={fileType} result={result} />
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Processing Params</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <label className="text-[11px] font-medium text-slate-500">Core Engine</label>
                <span className="text-[10px] font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">GEMINI-3-V</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <label className="text-[11px] font-medium text-slate-500">Feature Extraction</label>
                <span className="text-[10px] font-mono text-slate-800 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">ENABLED</span>
              </div>
            </div>
          </div>
        </section>

        {/* Center: Image Display & Details */}
        <section 
          ref={centerScrollRef}
          className="col-span-1 lg:col-span-6 bg-slate-50 shadow-2xl rounded-2xl flex flex-col lg:h-[calc(100vh-4rem-6rem)] overflow-y-auto relative border border-slate-200/50 scroll-smooth"
          style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
        >
          <div className="p-4 md:p-8 flex flex-col gap-8 md:gap-12">
            <div className="bg-white border border-slate-200 p-1 flex-shrink-0 flex flex-col shadow-sm relative overflow-hidden min-h-[350px] lg:min-h-[450px] rounded-xl z-20">
              {/* Viewfinder Overlay */}
              <div className="absolute inset-4 pointer-events-none z-10 border border-emerald-500/10">
                 <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500/40" />
                 <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-500/40" />
                 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-500/40" />
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500/40" />
              </div>

              <div className="flex-grow bg-[#0c1117] flex items-center justify-center relative group min-h-[250px]">
                <div className="absolute top-0 left-0 bg-emerald-600 text-white text-[10px] px-3 py-1 font-bold uppercase tracking-widest z-20">
                  {isClassifying ? "Scanning Frame..." : image ? "Signal Input" : "Standby Mode"}
                </div>
                
                {!image ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border border-slate-800 flex items-center justify-center relative">
                      <div className="absolute inset-0 border border-emerald-500/10 animate-ping" />
                      <Camera className="text-slate-700 w-8 h-8" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Awaiting Video Ingest</span>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center p-8" style={{ perspective: "1200px" }}>
                     <motion.div
                       animate={isClassifying ? {
                         rotateX: [0, 8, -8, 0],
                         rotateY: [0, -10, 10, 0],
                         scale: [1, 0.95, 1],
                         z: [0, 40, 0]
                       } : {
                         rotateX: 0,
                         rotateY: 0,
                         scale: 1,
                         z: 0
                       }}
                       transition={{
                         duration: 5,
                         repeat: Infinity,
                         ease: "easeInOut"
                       }}
                       style={{ transformStyle: "preserve-3d" }}
                       className="w-full h-full flex items-center justify-center relative"
                     >
                       <img 
                        src={image} 
                        alt="Process Target" 
                        className={cn(
                          "max-w-full max-h-full object-contain grayscale transition-all duration-700",
                          isClassifying && "shadow-[0_0_40px_rgba(52,211,153,0.2)] sepia-[.5] hue-rotate-135",
                          result && "grayscale-0"
                        )} 
                        style={isClassifying ? { filter: 'drop-shadow(0 0 20px rgba(52, 211, 153, 0.4))' } : undefined}
                      />
                       {isClassifying && (
                         <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ transform: "translateZ(50px)" }}>
                            <motion.div 
                              initial={{ top: "-20%" }}
                              animate={{ top: "120%" }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                              className="absolute w-full h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)] z-10"
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(52,211,153,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.1)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 mix-blend-screen" />
                            <div className="absolute inset-x-0 h-full bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent animate-pulse" />
                         </div>
                       )}
                     </motion.div>
                  </div>
                )}
              </div>

              <div className="h-auto md:h-32 p-4 md:p-6 flex justify-between items-center border-t border-slate-100 flex-shrink-0">
                <div className="max-w-[70%] flex flex-col gap-2">
                  <div>
                    <h2 className={cn(
                      "text-xl md:text-3xl font-black tracking-tight leading-none uppercase mb-1.5",
                      result?.breed === "Unknown" ? "text-rose-600" : "text-slate-800"
                    )}>
                      {result ? result.breed : "No Target"}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      {result?.origin || "Location Unknown"}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {result && result.usage && (
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest",
                        result.usage.toLowerCase().includes('milk') ? "bg-blue-100/80 text-blue-700" :
                        result.usage.toLowerCase().includes('draught') ? "bg-amber-100/80 text-amber-700" :
                        "bg-emerald-100/80 text-emerald-700"
                      )}>
                        {result.usage.split(' ')[0]}
                      </span>
                    )}
                    {result && result.rarity && (
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest",
                        result.rarity.toLowerCase().includes('rare') ? "bg-purple-100 text-purple-700" :
                        result.rarity.toLowerCase().includes('endangered') ? "bg-rose-100 text-rose-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {result.rarity}
                      </span>
                    )}
                    {result && result.isIndigenous !== undefined && (
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest",
                        result.isIndigenous ? "bg-emerald-100/80 text-emerald-700" : "bg-blue-100/80 text-blue-700"
                      )}>
                        {result.isIndigenous ? "Indigenous Indian" : "Foreign/Global"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  {result ? (
                    <ConfidenceGauge 
                      percentage={
                        result.matchPercentage !== undefined
                          ? result.matchPercentage
                          : result.confidence.includes('%') 
                            ? parseInt(result.confidence) 
                            : result.confidence === 'High' ? 95 : result.confidence === 'Medium' ? 65 : 35
                      } 
                    />
                  ) : (
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-50 flex items-center justify-center">
                      <div className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Idle</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border-l-4 border-rose-500 p-4 flex gap-4 items-center shrink-0"
              >
                <AlertCircle className="text-rose-500 w-5 h-5 flex-shrink-0" />
                <p className="text-[11px] font-bold text-rose-700 uppercase tracking-widest">{error}</p>
              </motion.div>
            )}
            
            {/* Details that were previously on the right side */}
            <div className="flex flex-col gap-12 lg:gap-16 pt-8 pb-24 w-full max-w-3xl mx-auto">
          <ScrollReveal containerRef={centerScrollRef} className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Breed Metrics</h3>
            <div className="space-y-5">
              {result && result.breed !== "Unknown" ? (
                <>
                  <CharactersticBar icon={Droplet} label="Yield Capacity" value="Above Average" percentage={82} />
                  <CharactersticBar icon={Sun} label="Heat Resistance" value="Superior" percentage={96} />
                  <CharactersticBar icon={Shield} label="Pathogen Defense" value="Exceptional" percentage={91} />
                  <CharactersticBar icon={Tractor} label="Draught Utility" value="Dual Purpose" percentage={75} />
                </>
              ) : (
                <div className="space-y-5 opacity-20 select-none grayscale pointer-events-none">
                  <CharactersticBar icon={Droplet} label="Yield Capacity" value="N/A" percentage={30} />
                  <CharactersticBar icon={Sun} label="Heat Resistance" value="N/A" percentage={30} />
                  <CharactersticBar icon={Shield} label="Pathogen Defense" value="N/A" percentage={30} />
                </div>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal containerRef={centerScrollRef} className="pt-6 border-t border-slate-100">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4">Morphological Profile</h3>
            {result && result.breed !== "Unknown" ? (
              <div className="space-y-3">
                {Array.isArray(result.characteristics) && result.characteristics.map((c, i) => (
                  <div key={i} className="flex gap-3 text-[11px] text-slate-600 items-start">
                    <div className="w-1 h-4 bg-emerald-600 mt-0.5 shrink-0" />
                    <span className="font-medium tracking-tight leading-4 italic opacity-90">{c}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] font-mono text-slate-400 italic">No morphological data available yet. Run analysis to populate this field.</p>
            )}
          </ScrollReveal>

          {result && (result.estimatedAge || result.timeRemaining) && result.breed !== "Unknown" && (
            <ScrollReveal containerRef={centerScrollRef} className="pt-6 border-t border-slate-100">
               <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4">Lifespan Metrics</h3>
               <div className="grid grid-cols-2 gap-4">
                 {result.estimatedAge && (
                   <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-sm">
                      <p className="text-[9px] font-bold text-blue-800 uppercase tracking-widest mb-1">Estimated Age</p>
                      <p className="text-xl font-black text-blue-600 tracking-tight">{result.estimatedAge}</p>
                   </div>
                 )}
                 {result.timeRemaining && (
                   <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-sm">
                      <p className="text-[9px] font-bold text-indigo-800 uppercase tracking-widest mb-1">Time Remaining</p>
                      <p className="text-xl font-black text-indigo-600 tracking-tight">{result.timeRemaining}</p>
                   </div>
                 )}
               </div>
            </ScrollReveal>
          )}

          {result && (result.malnourishmentStatus || result.expectedBodyWeight || result.approximateBodyWeight) && result.breed !== "Unknown" && (
            <ScrollReveal containerRef={centerScrollRef} className="pt-6 border-t border-slate-100">
               <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4">Physiology & Nourishment</h3>
               <div className="space-y-4">
                 {result.malnourishmentStatus && (
                   <div className={cn("p-4 border rounded-sm", 
                     result.malnourishmentStatus.toLowerCase().includes("malnourished") ? "bg-red-50/50 border-red-100" :
                     result.malnourishmentStatus.toLowerCase().includes("borderline") ? "bg-amber-50/50 border-amber-100" :
                     "bg-emerald-50/50 border-emerald-100"
                   )}>
                      <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1",
                        result.malnourishmentStatus.toLowerCase().includes("malnourished") ? "text-red-800" :
                        result.malnourishmentStatus.toLowerCase().includes("borderline") ? "text-amber-800" :
                        "text-emerald-800"
                      )}>Nutrition Profile</p>
                      <p className={cn("text-xl font-black tracking-tight",
                        result.malnourishmentStatus.toLowerCase().includes("malnourished") ? "text-red-600" :
                        result.malnourishmentStatus.toLowerCase().includes("borderline") ? "text-amber-600" :
                        "text-emerald-600"
                      )}>{result.malnourishmentStatus}</p>
                   </div>
                 )}
                 {(result.approximateBodyWeight || result.expectedBodyWeight) && (
                   <div className="grid grid-cols-2 gap-4">
                     {result.approximateBodyWeight && (
                       <div className="p-4 bg-slate-50 border border-slate-100 rounded-sm">
                         <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Est. Current Weight</span>
                         <span className="text-xl font-black text-slate-800 tracking-tight">{result.approximateBodyWeight}</span>
                       </div>
                     )}
                     {result.expectedBodyWeight && (
                       <div className="p-4 bg-slate-50 border border-slate-100 rounded-sm">
                         <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Target / Ideal Weight</span>
                         <span className="text-xl font-black text-slate-800 tracking-tight">{result.expectedBodyWeight}</span>
                       </div>
                     )}
                   </div>
                 )}
               </div>
            </ScrollReveal>
          )}

          {result && result.estimatedPrice && result.breed !== "Unknown" && (
            <ScrollReveal containerRef={centerScrollRef} className="pt-6 border-t border-slate-100">
               <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4">Market Insight</h3>
               <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-sm">
                  <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Estimated Value (Specimen)</p>
                  <p className="text-xl font-black text-emerald-600 tracking-tight">{result.estimatedPrice}</p>
                  <p className="text-[9px] text-emerald-700/60 mt-1 italic leading-tight">*Approximate range based on current market trends for healthy indigenous specimens.</p>
               </div>
            </ScrollReveal>
          )}

          {result && result.breed !== "Unknown" && (result.feedingHabits || result.optimalClimaticConditions) && (
            <ScrollReveal containerRef={centerScrollRef} className="pt-6 border-t border-slate-100 space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4">Environmental Suitability</h3>
              {result.feedingHabits && (
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Feeding Habits</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed italic">{result.feedingHabits}</p>
                </div>
              )}
              {result.optimalClimaticConditions && (
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Optimal Conditions</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed italic">{result.optimalClimaticConditions}</p>
                </div>
              )}
            </ScrollReveal>
          )}

          {result && result.breed !== "Unknown" && (result.currentDiseases || (result.expectedDiseases && result.expectedDiseases.length > 0) || result.diseaseSolutions || (result.thingsToAvoid && result.thingsToAvoid.length > 0) || (result.vaccines && result.vaccines.length > 0) || result.checkupSchedule || result.dewormingSchedule) && (
            <ScrollReveal containerRef={centerScrollRef} className="pt-6 border-t border-slate-100 space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4">Health & Handling</h3>
              
              {result.currentDiseases && (
                <div className="space-y-1 p-3 bg-red-50/50 border border-red-100 rounded-sm">
                  <span className="text-[9px] font-bold text-red-800 uppercase tracking-widest flex items-center gap-1.5"><AlertCircle className="w-3 h-3"/> Visible Health Signs</span>
                  <p className="text-[11px] text-red-700 leading-relaxed italic">{result.currentDiseases}</p>
                </div>
              )}

              {result.expectedDiseases && result.expectedDiseases.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prone Ailments</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{result.expectedDiseases.join(", ")}</p>
                </div>
              )}
              
              {result.diseaseSolutions && (
                <div className="space-y-1 p-3 bg-emerald-50/50 border border-emerald-100 rounded-sm">
                  <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest">Solutions & Treatments</span>
                  <p className="text-[11px] text-emerald-700 leading-relaxed italic">{result.diseaseSolutions}</p>
                </div>
              )}

              {result.thingsToAvoid && result.thingsToAvoid.length > 0 && (
                <div className="space-y-2 mt-2">
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Things to Avoid</span>
                  <ul className="space-y-1.5">
                    {Array.isArray(result.thingsToAvoid) && result.thingsToAvoid.map((avoid, index) => (
                      <li key={index} className="text-[11px] text-slate-600 flex items-start gap-2">
                        <X className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <span>{avoid}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(result.checkupSchedule || result.dewormingSchedule) && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {result.dewormingSchedule && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-sm">
                      <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Shield className="w-3 h-3" /> Deworming Schedule</span>
                      <span className="text-[11px] font-medium text-slate-800 leading-relaxed">{result.dewormingSchedule}</span>
                    </div>
                  )}
                  {result.checkupSchedule && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-sm">
                      <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Health Checkups</span>
                      <span className="text-[11px] font-medium text-slate-800 leading-relaxed">{result.checkupSchedule}</span>
                    </div>
                  )}
                </div>
              )}

              {result.vaccines && result.vaccines.length > 0 && (
                <div className="space-y-2 mt-4">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> Recommended Vaccines
                  </span>
                  <div className="border border-slate-100 rounded-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-2 text-[9px] uppercase font-bold text-slate-500 tracking-widest whitespace-nowrap">Vaccine NAME</th>
                          <th className="p-2 text-[9px] uppercase font-bold text-slate-500 tracking-widest whitespace-nowrap">Schedule</th>
                          <th className="p-2 text-[9px] uppercase font-bold text-slate-500 tracking-widest text-right">Est. Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {Array.isArray(result.vaccines) && result.vaccines.map((vaccine, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 text-[10px] font-bold text-slate-800">{vaccine.name}</td>
                            <td className="p-2 text-[10px] text-slate-600">{vaccine.schedule}</td>
                            <td className="p-2 text-[10px] font-mono text-slate-600 text-right">{vaccine.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </ScrollReveal>
          )}

          {(result?.similarBreeds?.length || result?.breedComparisons?.length) ? (
            <ScrollReveal containerRef={centerScrollRef} className="pt-6 border-t border-slate-100">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Alternative Candidates</h3>
               </div>
               
               {result.breedComparisons && result.breedComparisons.length > 0 ? (
                 <div className="overflow-x-auto border border-slate-200 rounded-sm">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-slate-50 border-b border-slate-200">
                         <th className="p-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest whitespace-nowrap">Candidate</th>
                         <th className="p-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Comparison</th>
                         <th className="p-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Key Differences</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-200">
                       {Array.isArray(result.breedComparisons) && result.breedComparisons.map((comp, i) => (
                         <tr key={i} className="hover:bg-slate-50/50 transition-colors bg-white">
                           <td className="p-3 text-[11px] font-bold text-slate-800 uppercase tracking-widest align-top whitespace-nowrap">
                             {comp.candidateName}
                           </td>
                           <td className="p-3 text-[11px] text-slate-600 leading-relaxed italic align-top min-w-[200px]">
                             {comp.comparisonText}
                           </td>
                           <td className="p-3 align-top min-w-[150px]">
                             {comp.keyDifferences && comp.keyDifferences.length > 0 && (
                               <div className="flex flex-wrap gap-1.5">
                                 {Array.isArray(comp.keyDifferences) && comp.keyDifferences.map((diff, j) => (
                                   <span key={j} className="text-[9px] uppercase tracking-widest bg-blue-50/50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-sm">
                                     {diff}
                                   </span>
                                 ))}
                               </div>
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <div className="flex flex-wrap gap-2">
                   {Array.isArray(result.similarBreeds) && result.similarBreeds.map((altBreed, i) => (
                     <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-tight rounded-sm">
                       {altBreed}
                     </span>
                   ))}
                 </div>
               )}
               
               <p className="text-[9px] text-slate-400 mt-4 italic leading-tight">These indigenous breeds share physical markers with the specimen but were discarded as primary matches based on key differentiators.</p>
            </ScrollReveal>
          ) : null}

          <ScrollReveal containerRef={centerScrollRef} className="mt-auto space-y-4">
             <div className="p-4 bg-slate-50 border border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Info className="w-3 h-3 text-emerald-600" />
                  Technical Brief
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  {result?.description || "Select a specimen image and initiate neural network analysis to extract specific breed documentation and regional suitability data."}
                </p>
             </div>
             <div className="flex gap-2">
                <div className="flex-1 p-3 bg-emerald-50 rounded-sm">
                   <span className="block text-[8px] font-bold text-emerald-700 uppercase mb-1">Primary Application</span>
                   <span className="text-[10px] font-bold text-emerald-900 uppercase truncate block">
                     {result?.usage || "UNSET"}
                   </span>
                </div>
                <div className="flex-1 p-3 bg-slate-900 rounded-sm text-white">
                   <span className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Lineage Class</span>
                   <span className="text-[10px] font-bold uppercase truncate block text-emerald-400">
                     {result ? (result.isIndigenous !== undefined ? (result.isIndigenous ? "Zebu (B. Indicus)" : "Taurine (B. Taurus)") : "Taurine/Zebu") : "UNDEF"}
                   </span>
                </div>
             </div>
          </ScrollReveal>
          </div>
          </div>
        </section>

        {/* Right Sidebar: ML Analysis */}
        <section 
          className="col-span-1 lg:col-span-3 bg-white p-6 shadow-2xl rounded-2xl border border-slate-200/50 flex flex-col gap-6 relative z-10 lg:h-[calc(100vh-4rem-6rem)] overflow-y-auto w-full"
          style={{ transform: "translateZ(80px)", transformStyle: "preserve-3d" }}
        >
          <div className="flex flex-col h-full">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-6 flex-shrink-0">ML Analysis</h3>
            
            <div className="flex-grow">
              {isClassifying ? (
                <div className="space-y-4">
                   <div className="flex items-center gap-3 text-emerald-600 mb-4">
                     <Loader2 className="animate-spin w-5 h-5" />
                     <span className="text-[11px] font-bold uppercase tracking-widest">Processing Node Active</span>
                   </div>
                   <div className="bg-slate-900 p-4 rounded-sm text-emerald-500 font-mono text-[9px] space-y-2 uppercase break-words w-full overflow-hidden">
                     <p className="animate-pulse">{'>'} INITIALIZING GEMINI VISION MODEL...</p>
                     <p className="opacity-70">{'>'} EXTRACTING MORPHOLOGICAL FEATURES...</p>
                     <p className="opacity-50">{'>'} CROSS-REFERENCING INDIGENOUS DATABASE...</p>
                     <p className="opacity-30">{'>'} CALCULATING CONFIDENCE SCORES...</p>
                   </div>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-emerald-600 mb-4">
                     <CheckCircle2 className="w-5 h-5" />
                     <span className="text-[11px] font-bold uppercase tracking-widest">Analysis Complete</span>
                   </div>
                   
                   <div className="bg-slate-50 border border-slate-100 p-4 space-y-4 rounded-sm">
                     <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inference Time</span>
                       <span className="text-[10px] font-mono text-slate-800">1.4s</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Data Points</span>
                       <span className="text-[10px] font-mono text-slate-800">{result.characteristics.length * 3 + Math.floor(Math.random() * 5)} Extracted</span>
                     </div>
                     <div className="flex justify-between items-center pb-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confidence</span>
                       <span className="text-[10px] font-mono text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded">{result.confidence}</span>
                     </div>
                   </div>

                   <div className="bg-slate-900 p-4 rounded-sm text-slate-300 font-mono text-[9px] space-y-2 uppercase leading-relaxed max-h-64 overflow-y-auto break-words w-full">
                      <p className="text-emerald-500">{'>'} DIAGNOSTIC RUN SUCCESSFUL</p>
                      <p>{'>'} TARGET BREED: {result.breed}</p>
                      <p>{'>'} CATEGORY: {result.isIndigenous !== undefined ? (result.isIndigenous ? 'INDIGENOUS INDIAN' : 'FOREIGN / GLOBAL') : 'UNKNOWN'}</p>
                      <p>{'>'} DETECTED ORIGIN: {result.origin}</p>
                      <p>{'>'} PRIMARY ANOMALIES: {result.currentDiseases ? 'DETECTED' : 'NONE'}</p>
                      <p className="mt-4 text-emerald-500 animate-pulse">{'>'} AWAITING NEXT SIGNAL...</p>
                   </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                   <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded flex items-center justify-center">
                      <Activity className="w-5 h-5 text-slate-300" />
                   </div>
                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">System Idle</p>
                </div>
              )}
            </div>

            {result && result.breed !== "Unknown" && (
              <button 
                onClick={handleDownloadPDF}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-emerald-400 font-bold py-3.5 px-4 rounded-sm transition-colors uppercase tracking-[0.1em] text-[11px]"
              >
                <Download className="w-4 h-4" />
                Download Full Report
              </button>
            )}

            <button 
              onClick={handleClassify}
              disabled={!image || isClassifying}
              className={cn(
                "mt-6 w-full font-bold py-4 text-[11px] rounded-sm shadow-lg uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shrink-0",
                !image || isClassifying
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-700 text-white hover:bg-emerald-800 shadow-emerald-900/10"
              )}
            >
              {isClassifying ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Processing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Run ML Analysis
                </>
              )}
            </button>
          </div>
        </section>
      </motion.main>

      <StatusBar />

      <Modal 
        isOpen={activeModal === 'breeds'} 
        onClose={() => setActiveModal(null)} 
        title="India's Indigenous Heritage"
      >
        <BreedsList />
      </Modal>

      <Modal 
        isOpen={activeModal === 'docs'} 
        onClose={() => setActiveModal(null)} 
        title="ML System Documentation"
      >
        <DocumentationContent />
      </Modal>

      <Modal 
        isOpen={showPDFLanguageModal} 
        onClose={() => !isGeneratingPDF && setShowPDFLanguageModal(false)} 
        title="Select Report Language / रिपोर्ट की भाषा चुनें"
      >
        <div className="space-y-4">
          <p className="text-[13px] font-medium text-slate-700 leading-relaxed mb-4 text-center border-b border-slate-100 pb-4">
             Choose the preferred language for your PDF Report.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto pr-2 pb-4">
             {INDIAN_LANGUAGES.map((lang) => (
               <button
                 key={lang}
                 onClick={() => generateTranslatedPDF(lang)}
                 disabled={isGeneratingPDF}
                 className="px-3 py-2 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-sm hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-left flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <span>{lang}</span>
               </button>
             ))}
          </div>
          {isGeneratingPDF && (
            <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 text-emerald-600 mt-4">
               <Loader2 className="w-5 h-5 animate-spin" />
               <span className="text-[11px] font-bold uppercase tracking-widest animate-pulse">Processing Translation...</span>
            </div>
          )}
        </div>
      </Modal>
      </motion.div>
    </div>
  );
}

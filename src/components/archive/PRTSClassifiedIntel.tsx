import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, FileText, Globe, Search, Lock, BookOpen, ExternalLink, Compass, Database, Cpu, Eye, CheckCircle2 } from 'lucide-react';

interface IntelRecord {
  id: string;
  code: string;
  title: string;
  classification: 'TOP SECRET' | 'RESTRICTED' | 'CONFIDENTIAL' | 'EYES ONLY';
  nation: string;
  category: 'FACTION' | 'ORGANIZATION' | 'PHENOMENON' | 'ORIGINIUM_RESEARCH';
  summary: string;
  date: string;
  content: string;
}

const CLASSIFIED_INTEL_DATA: IntelRecord[] = [
  {
    id: 'intel_rhodes_island',
    code: 'DOC-RI-001',
    title: 'Rhodes Island Landship & Pharmaceutical Protocol',
    classification: 'TOP SECRET',
    nation: 'Rhodes Island',
    category: 'ORGANIZATION',
    summary: 'Core structural overview of the Rhodes Island mobile landship, Babel origins, and infected treatment methodology.',
    date: '1097.04.15',
    content: `[FILE: RI_STRUCTURE_OVERVIEW]
• ARCHITECTURE: Mobile Landship recovered from Rim Billiton underground excavation.
• ORIGINAL DESIGNATION: Project Babel Command Center.
• CURRENT MISSION: Medical intervention for Oripathy, geopolitical conflict arbitration, and containment of active Originium catastrophes.
• KEY PERSONNEL:
  - Amiya: Public CEO & Caster Overseer.
  - Dr. Kal'tsit: Chief Medical Officer & High Authority.
  - Doctor: Tactical Grandmaster & Field Commander.`
  },
  {
    id: 'intel_originium_oripathy',
    code: 'DOC-SCI-089',
    title: 'Originium Crystallization & Neurological Oripathy',
    classification: 'RESTRICTED',
    nation: 'Terra Global',
    category: 'ORIGINIUM_RESEARCH',
    summary: 'Comprehensive pathological analysis of Originium assimilation into organic biological tissues.',
    date: '1098.01.22',
    content: `[FILE: BIO_PATHOLOGY_ORIGINIUM]
• PATHOLOGY: Assimilation of active mineral particles into host bloodstream and organ tissues.
• TRANSMISSION: Airborne exposure during Catastrophes, direct puncture from raw crystals, secondary particulate inhalation.
• ARTS CONDUCTION: Severe infection increases biological Arts conduciveness while decreasing cellular survival limits.
• RHODES ISLAND TREATMENT: Suppressant inhibitors developed by Dr. Kal'tsit extend lifespan by slowing crystal crystallization rate by ~64%.`
  },
  {
    id: 'intel_rhine_lab',
    code: 'DOC-COL-304',
    title: 'Rhine Lab Section 35 & Diαbol Ballistics Project',
    classification: 'EYES ONLY',
    nation: 'Columbia',
    category: 'ORGANIZATION',
    summary: 'Investigative findings regarding Kirsten Wright, the Trimounts Space Barrier experiment, and Section 35.',
    date: '1099.03.11',
    content: `[FILE: COLUMBIA_RHINE_PROJECT]
• LEAD SCIENTIST: Kirsten Wright, Director of Rhine Lab.
• EXPERIMENT SUMMARY: Piercing the Starpod boundary above Terra using energy gathered from the precursor civilization sarcophagus.
• CONSEQUENCES: Trimounts orbital breakthrough, reveal of the artificial sky barrier enclosing Terra.`
  },
  {
    id: 'intel_kazdel_sarkaz',
    code: 'DOC-KAZ-772',
    title: 'Kazdel Reconstruction & Sarkaz Royal Court Protocols',
    classification: 'TOP SECRET',
    nation: 'Kazdel',
    category: 'FACTION',
    summary: 'The Civil War of Kazdel, the Military Commission led by Theresis, and the crown of the Lord of Fiends.',
    date: '1098.11.04',
    content: `[FILE: SARKAZ_ROYAL_REGISTRY]
• REGENTS: Theresis, General of the Kazdel Military Commission.
• LORE ANOMALY: Transfer of the Black Crown from Theresa to Amiya during the Babel tragedy.
• CURRENT MOVEMENT: Military Commission deployment inside Victoria (Londinium).`
  },
  {
    id: 'intel_abyssal_seaborn',
    code: 'DOC-IBE-990',
    title: 'Aegirian Abyssal Hunters & The Seaborn Convergence',
    classification: 'TOP SECRET',
    nation: 'Aegir / Iberia',
    category: 'PHENOMENON',
    summary: 'Cellular integration of Seaborn biomatter into Abyssal Hunter bloodlines; Great Silence of Iberia.',
    date: '1097.08.30',
    content: `[FILE: AEGIR_SEABORN_ASSESSMENT]
• THREAT CLASS: Extinction-level biological assimilation hivemind (We Many).
• OPERATORS ENGAGED: Gladiia, Specter, Skadi, Ulpianus.
• PRIMARY DEFENSE: Deep ocean sound barriers and high-density neural Arts filters.`
  }
];

export const PRTSClassifiedIntel: React.FC = () => {
  const [selectedRecord, setSelectedRecord] = useState<IntelRecord>(CLASSIFIED_INTEL_DATA[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  const filtered = CLASSIFIED_INTEL_DATA.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.nation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || doc.category === selectedFilter || doc.classification === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-[#0c0d0e] text-white overflow-hidden font-mono">
      {/* Left List Pane */}
      <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-black/40 shrink-0">
        
        {/* Search and Filters */}
        <div className="p-4 border-b border-white/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-sm">
            <Search className="w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ПОИСК В БАЗЕ ДАННЫХ PRTS..."
              className="bg-transparent border-none outline-none text-xs text-white placeholder-white/30 w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[9px]">
            {['ALL', 'ORGANIZATION', 'ORIGINIUM_RESEARCH', 'FACTION', 'PHENOMENON'].map(filter => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-2 py-1 rounded-sm uppercase tracking-wider font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  selectedFilter === filter 
                    ? 'bg-lime-400 text-black shadow-[0_0_10px_rgba(163,230,53,0.3)]' 
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* List of Intel Documents */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
          {filtered.map(doc => {
            const isSelected = selectedRecord.id === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedRecord(doc)}
                className={`p-3 text-left border rounded-sm transition-all duration-200 cursor-pointer relative overflow-hidden ${
                  isSelected 
                    ? 'bg-zinc-900 border-lime-400/80 shadow-[0_0_15px_rgba(163,230,53,0.15)]' 
                    : 'bg-zinc-950/60 border-white/5 hover:border-white/20 hover:bg-zinc-900/60'
                }`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-lime-400" />
                )}
                
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] font-black text-lime-400/90 tracking-widest uppercase">
                    {doc.code}
                  </span>
                  <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded-[1px] tracking-wider uppercase ${
                    doc.classification === 'TOP SECRET' ? 'bg-red-950/80 text-red-400 border border-red-500/30' :
                    doc.classification === 'EYES ONLY' ? 'bg-purple-950/80 text-purple-400 border border-purple-500/30' :
                    'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                  }`}>
                    {doc.classification}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white tracking-wide line-clamp-1 mb-1">
                  {doc.title}
                </h4>

                <p className="text-[9px] text-white/40 line-clamp-2 leading-relaxed">
                  {doc.summary}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Reading Pane */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
        
        {/* Document Header */}
        <div className="border-b border-white/10 pb-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-lime-400/10 border border-lime-400/30 text-lime-400 text-[10px] font-black tracking-widest uppercase">
                {selectedRecord.code}
              </span>
              <span className="text-[10px] font-bold text-white/40 uppercase">
                // {selectedRecord.nation}
              </span>
            </div>
            <span className="text-[9px] font-mono text-white/40">
              LOGGED: {selectedRecord.date}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-2">
            {selectedRecord.title}
          </h2>

          <p className="text-xs text-white/60 leading-relaxed max-w-3xl">
            {selectedRecord.summary}
          </p>
        </div>

        {/* Document Body */}
        <div className="flex-1 max-w-3xl">
          <div className="p-6 bg-zinc-950 border border-white/10 rounded-sm font-mono text-xs md:text-sm text-white/80 leading-relaxed whitespace-pre-line shadow-inner">
            {selectedRecord.content}
          </div>

          {/* Verification Stamp */}
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[9px] text-white/40 uppercase">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
              <span>DIGITALLY SIGNED // PRTS AUTHENTICATED INTEL</span>
            </div>
            <span>CLEARANCE: LEVEL 5 OVERRIDE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  FileText, 
  Search, 
  Lock, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Share2,
  Bookmark
} from 'lucide-react';

interface IntelRecord {
  id: string;
  code: string;
  title: string;
  classification: 'TOP SECRET' | 'RESTRICTED' | 'CONFIDENTIAL' | 'EYES ONLY';
  nation: string;
  category: 'FACTION' | 'ORGANIZATION' | 'PHENOMENON' | 'ORIGINIUM_RESEARCH' | 'ANCIENT_RUINS';
  date: string;
  clearanceRequired: number;
  summary: string;
  content: string[];
  keyPersonnel: string[];
  relatedNodes: string[];
}

const INTEL_DATABASE: IntelRecord[] = [
  {
    id: 'intel_rhodes_island',
    code: 'DOC-RI-001',
    title: 'Rhodes Island Landship & Babel Protocol',
    classification: 'TOP SECRET',
    nation: 'Rhodes Island',
    category: 'ORGANIZATION',
    date: '1097.04.15',
    clearanceRequired: 5,
    summary: 'Core structural overview of the Rhodes Island mobile landship, Babel origins, and infected treatment methodology.',
    content: [
      'ARCHITECTURE: Mobile Landship recovered from Rim Billiton underground excavation dating back to the First Era.',
      'ORIGINAL DESIGNATION: Project Babel Command Center and Sarcophagus Transport Unit.',
      'CURRENT MISSION: Medical intervention for Oripathy, geopolitical conflict arbitration, and containment of active Originium catastrophes.',
      'SECURITY NOTE: Level 5 credentials are required to decrypt the lower sub-levels and Doctor stasis recovery logs.'
    ],
    keyPersonnel: ["Amiya (CEO)", "Dr. Kal'tsit (High Authority)", "Doctor (Tactical Commander)", "Closure (Systems)"],
    relatedNodes: ['Project Babel', 'Originium Stasis', 'Catastrophe Messenger Net']
  },
  {
    id: 'intel_originium_oripathy',
    code: 'DOC-SCI-089',
    title: 'Originium Assimilation & Cellular Oripathy',
    classification: 'RESTRICTED',
    nation: 'Terra Global',
    category: 'ORIGINIUM_RESEARCH',
    date: '1098.01.22',
    clearanceRequired: 3,
    summary: 'Comprehensive pathological analysis of Originium assimilation into organic biological tissues and neurological Arts conduction.',
    content: [
      'PATHOLOGY: Assimilation of active mineral particles into host bloodstream, organ tissues, and neurological synapses.',
      'TRANSMISSION: Airborne exposure during Catastrophes, direct puncture from active crystals, secondary particulate inhalation.',
      'ARTS CONDUCTION: Severe infection exponentially increases biological Arts conduciveness while decreasing cellular survival limits.',
      'SUPPRESSANT REGIMEN: Suppressant inhibitors developed by Dr. Kal\'tsit slow crystallization rate by ~64% in clinical trials.'
    ],
    keyPersonnel: ["Dr. Kal'tsit", "Eyjafjalla", "Silence", "Ptilopsis"],
    relatedNodes: ['Catastrophe Dynamics', 'Arts Amplification Units', 'Mineral Toxicology']
  },
  {
    id: 'intel_rhine_lab',
    code: 'DOC-COL-304',
    title: 'Rhine Lab Section 35 & Trimounts Barrier Project',
    classification: 'EYES ONLY',
    nation: 'Columbia',
    category: 'ORGANIZATION',
    date: '1099.03.11',
    clearanceRequired: 4,
    summary: 'Investigative findings regarding Director Kirsten Wright, the Trimounts Space Barrier puncture, and Section 35.',
    content: [
      'OVERVIEW: Covert military-scientific initiative funded by the Columbian Department of Defense.',
      'PROJECT DIABOL: Weaponization of ancient Sarkaz genetic memory and crystallized Arts units.',
      'TRIMOUNTS INCIDENT: The launch of the transmitter ark breached the planetary sky barrier at altitude 35,000m.',
      'OUTCOME: Substantial structural collapse of Section 35; Silence reassigned to the Rhine Lab Reform Committee.'
    ],
    keyPersonnel: ["Kirsten Wright (Former Director)", "Silence (Director)", "Saria (Defense Chief)", "Muelsyse"],
    relatedNodes: ['Sky Barrier Phenomenon', 'Project Diαbol', 'Trimounts Defense Arc']
  },
  {
    id: 'intel_aegir_seaborn',
    code: 'DOC-AEG-990',
    title: 'Aegir Ocean Descent & The First Born Hivemind',
    classification: 'TOP SECRET',
    nation: 'Aegir',
    category: 'PHENOMENON',
    date: '1099.08.04',
    clearanceRequired: 5,
    summary: 'Classified underwater transmission reports concerning the We Many collective evolution and Abyssal Hunters.',
    content: [
      'ENTITY CLASSIFICATION: Biological adaptive organism designated "Seaborn / We Many".',
      'EVOLUTION PATTERN: Rapid genetic assimilation of inorganic and organic matter with shared hive consciousness.',
      'ABYSSAL HUNTER PROJECT: Surgical implantation of Seaborn tissue into select Aegir warriors to counter deep sea incursions.',
      'CURRENT THREAT LEVEL: Critical. Deep ocean cities reporting complete biological silence since year 1095.'
    ],
    keyPersonnel: ["Gladiia", "Specter", "Skadi", "Ulpianus"],
    relatedNodes: ['Stultifera Navis', 'The First Born', 'Abyssal Resonance Protocol']
  },
  {
    id: 'intel_kazdel_sarkaz',
    code: 'DOC-KAZ-772',
    title: 'Kazdel Royal Court & The Lord of Fiends Succession',
    classification: 'TOP SECRET',
    nation: 'Kazdel',
    category: 'FACTION',
    date: '1098.11.30',
    clearanceRequired: 5,
    summary: 'Genealogical and Arts analysis of the Black Crown (Civilight Eterna) and the Sarkaz Royal Court.',
    content: [
      'HISTORICAL LOG: The wandering homeland of the Teekaz, razed multiple times by coalition forces of Terra.',
      'CIVILIGHT ETERNA: The Black Crown containing the collective memory, grief, and Arts lineage of all past Sarkaz kings.',
      'SUCCESSION MATRIX: Transferred from Theresa to Amiya under emergency Babel protocol during the Kazdel evacuation.',
      'CURRENT STATUS: Theresis forces occupying Victoria Londinium; active air fleet mobilizations observed.'
    ],
    keyPersonnel: ["Theresa (Former Queen)", "Theresis (General)", "Amiya", "W", "Ines"],
    relatedNodes: ['Babel Records', 'Civilight Eterna', 'Londinium Crisis']
  }
];

export const PRTSClassifiedIntelView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(INTEL_DATABASE[0].id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredRecords = INTEL_DATABASE.filter((rec) => {
    const matchesSearch = 
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.nation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || rec.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const activeRecord = INTEL_DATABASE.find((r) => r.id === selectedId) || INTEL_DATABASE[0];

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 p-2 sm:p-4 overflow-hidden font-sans text-black select-none">
      
      {/* LEFT LIST PANEL (Technical Catalog) */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white/90 border-2 border-black p-3 sm:p-4 shadow-[4px_4px_0px_#000] shrink-0">
        
        {/* Header with black tag */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-black text-white text-[9px] font-mono font-black tracking-widest uppercase">
              DOSSIER ARCHIVE
            </div>
            <span className="text-[10px] font-mono font-bold text-black/50">
              [{filteredRecords.length} / {INTEL_DATABASE.length}]
            </span>
          </div>
          <span className="text-[9px] font-mono font-black text-black">
            ANALYSIS [ 05 ]
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative my-3">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH CODE / NATION / TITLE..."
            className="w-full bg-[#f4f6ee] border border-black/30 focus:border-black pl-8 pr-3 py-1.5 text-[9.5px] font-mono text-black placeholder:text-black/35 outline-none tracking-wider uppercase"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
          {['ALL', 'ORGANIZATION', 'PHENOMENON', 'ORIGINIUM_RESEARCH', 'FACTION'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-black text-white'
                  : 'bg-black/5 hover:bg-black/10 text-black/70 border border-black/15'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Scrollable Records List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-2">
          {filteredRecords.map((rec) => {
            const isSelected = rec.id === selectedId;
            return (
              <div
                key={rec.id}
                onClick={() => setSelectedId(rec.id)}
                className={`p-2.5 border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#f4f6ee] border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-white hover:bg-black/5 border-black/20'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-lime-500" />
                )}
                
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-mono text-[9px] font-black text-black">
                    {rec.code}
                  </span>
                  <span className="px-1.5 py-0.2 text-[7.5px] font-mono font-bold bg-black text-white uppercase">
                    {rec.classification}
                  </span>
                </div>

                <div className="text-[11px] font-black tracking-tight text-black line-clamp-1">
                  {rec.title}
                </div>

                <div className="flex items-center justify-between text-[8px] font-mono text-black/50 mt-1">
                  <span>{rec.nation}</span>
                  <span>{rec.date}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* RIGHT DOSSIER INSPECTION VIEW */}
      <div className="flex-1 flex flex-col bg-white/90 border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_#000] overflow-y-auto relative">
        
        {/* Top Header of Document */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-black gap-2">
          <div className="flex items-center gap-3">
            {/* Green Accent Ribbon */}
            <div className="w-2.5 h-10 bg-lime-400 transform -skew-x-12 shadow-[0_0_10px_rgba(163,230,53,0.5)]" />
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-black">
                  PRTS // CLASSIFIED INTEL REPORT
                </span>
                <span className="px-2 py-0.2 bg-black text-white text-[8px] font-mono font-black uppercase">
                  CLEARANCE: LEVEL {activeRecord.clearanceRequired}
                </span>
              </div>
              <span className="text-[9px] font-mono text-black/50 tracking-wider">
                ID: {activeRecord.code} • REGION: {activeRecord.nation.toUpperCase()} • DATE: {activeRecord.date}
              </span>
            </div>
          </div>

          {/* Classification Stamp */}
          <div className="border-2 border-black px-3 py-1 bg-lime-300/30 flex items-center gap-2 self-start sm:self-auto">
            <ShieldAlert className="w-3.5 h-3.5 text-black" />
            <span className="text-[9.5px] font-mono font-black tracking-widest text-black uppercase">
              {activeRecord.classification}
            </span>
          </div>
        </div>

        {/* Document Title */}
        <div className="my-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-black tracking-tight uppercase">
            {activeRecord.title}
          </h1>
          <p className="text-xs sm:text-sm text-black/75 font-sans mt-2 border-l-2 border-black pl-3 py-1 bg-black/5">
            {activeRecord.summary}
          </p>
        </div>

        {/* Main Document Body */}
        <div className="space-y-3 my-2 flex-1">
          <div className="px-2 py-0.5 bg-black text-white text-[8.5px] font-mono font-black tracking-widest uppercase inline-block">
            DECRYPTED FILE CONTENT
          </div>

          <div className="space-y-2 font-mono text-xs text-black/85 leading-relaxed bg-[#f8faf2] p-4 border border-black/20">
            {activeRecord.content.map((paragraph, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-lime-700 font-bold select-none">▸</span>
                <span>{paragraph}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Meta Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t-2 border-black mt-4">
          
          {/* Key Personnel */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[8.5px] font-mono font-black tracking-widest text-black uppercase">
              KEY SUBJECTS & PERSONNEL:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeRecord.keyPersonnel.map((person, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 bg-white border border-black text-[9px] font-mono font-bold text-black"
                >
                  {person}
                </span>
              ))}
            </div>
          </div>

          {/* Related Data Nodes */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[8.5px] font-mono font-black tracking-widest text-black uppercase">
              LINKED ARCHIVE NODES:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeRecord.relatedNodes.map((node, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 bg-lime-400 text-black border border-black text-[9px] font-mono font-black tracking-wider flex items-center gap-1 shadow-xs"
                >
                  <span>//</span>
                  <span>{node}</span>
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

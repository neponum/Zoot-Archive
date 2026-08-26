import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Tag, 
  Layers, 
  FileText, 
  Network, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface LoreArticle {
  id: string;
  category: 'HISTORICAL_TIMELINE' | 'ANCIENT_RACES' | 'ORIGINIUM_DISASTER' | 'FACTION_TREATIES';
  title: string;
  era: string;
  excerpt: string;
  body: string[];
  tags: string[];
}

const LORE_ARTICLES: LoreArticle[] = [
  {
    id: 'lore_babel_foundation',
    category: 'HISTORICAL_TIMELINE',
    title: 'The Babel Era & The Kazdel Civil War',
    era: 'Era 1089 - 1094',
    excerpt: 'The establishment of the Babel Organization under Queen Theresa to salvage the future of the Sarkaz race.',
    body: [
      'Babel was originally created as a secret non-governmental peacekeeping entity founded by Theresa, the rightful monarch of Kazdel, alongside Dr. Kal\'tsit and the Doctor.',
      'Headquartered within the ancient subterranean landship recovered from Rim Billiton, Babel sought a peaceful resolution to centuries of territorial oppression and ethnic conflict.',
      'The assassination of Theresa in 1094 triggered the catastrophic dissolution of Babel, leading directly to the founding of Rhodes Island Pharmaceuticals.'
    ],
    tags: ['Theresa', 'Babel', 'Kazdel', 'Doctor', "Kal'tsit"]
  },
  {
    id: 'lore_first_born_aegir',
    category: 'ANCIENT_RACES',
    title: 'The Great Silence of Aegir & The Leviathans',
    era: 'Ancient Era - Ongoing',
    excerpt: 'The silent collapse of the undersea civilization of Aegir under pressure from the biological Seaborn tide.',
    body: [
      'Aegir, a civilization possessing technological prowess far exceeding the surface nations of Terra, maintained sealed aquatic domes deep beneath the oceans.',
      'The awakening of the biological Leviathans ("First Born") disrupted oceanic stability, forcing Aegir to engineer the hybrid Abyssal Hunters as a living vanguard.',
      'Surface nations remained largely oblivious to the marine extinction threat until the Stultifera Navis incident off the coast of Iberia.'
    ],
    tags: ['Aegir', 'Seaborn', 'Abyssal Hunters', 'Iberia']
  },
  {
    id: 'lore_sky_barrier',
    category: 'ORIGINIUM_DISASTER',
    title: 'Planetary Sky Barrier & The False Sky of Terra',
    era: 'Era 1099',
    excerpt: 'Discovery of the artificial ceiling encasing Terra, preventing conventional atmospheric departure.',
    body: [
      'For millennia, the inhabitants of Terra believed the celestial sky was merely obscured by Originium dust clouds and Catastrophe storm fronts.',
      'During the Rhine Lab incident in Trimounts, Director Kirsten Wright piloted an energy conduit to pierce the 35,000-meter threshold.',
      'The breakthrough revealed that Terra is encased in an impenetrable artificial crystalline barrier, separating the planet from the deep cosmos.'
    ],
    tags: ['Rhine Lab', 'Kirsten', 'Columbia', 'Astronomy']
  },
  {
    id: 'lore_teekaz_homeland',
    category: 'FACTION_TREATIES',
    title: 'The Teekaz Dispossession & The Nomadic Wars',
    era: 'Pre-Ancient Era',
    excerpt: 'The original inhabitants of Terra and their displacement following the arrival of the Elder races.',
    body: [
      'The Sarkaz, originally known as the Teekaz, were the native inhabitants of Terra prior to the recorded arrival of ancient civilization.',
      'Successive waves of colonization by early Elder and Ancient factions drove the Teekaz from their fertile territories into the barren wasteland of Kazdel.',
      'This historical trauma remains the central ideological fuel of the Military Commission and Theresis’s campaign in Victoria.'
    ],
    tags: ['Teekaz', 'Sarkaz', 'Kazdel', 'Elder Races']
  }
];

export const PRTSLoreVaultView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(LORE_ARTICLES[0].id);
  const [search, setSearch] = useState<string>('');
  const [activeTag, setActiveTag] = useState<string>('ALL');

  const allTags = ['ALL', ...Array.from(new Set(LORE_ARTICLES.flatMap((a) => a.tags)))];

  const filteredArticles = LORE_ARTICLES.filter((art) => {
    const matchesSearch = 
      art.title.toLowerCase().includes(search.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(search.toLowerCase());
    const matchesTag = activeTag === 'ALL' || art.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const current = LORE_ARTICLES.find((a) => a.id === selectedId) || LORE_ARTICLES[0];

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 p-2 sm:p-4 overflow-hidden font-sans text-black select-none">
      
      {/* LEFT SIDEBAR: Lore Index */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white/90 border-2 border-black p-3 sm:p-4 shadow-[4px_4px_0px_#000] shrink-0">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-black text-white text-[9px] font-mono font-black tracking-widest uppercase">
              LORE ARCHIVE
            </div>
            <span className="text-[10px] font-mono font-bold text-black/50">
              [VAULT {filteredArticles.length}]
            </span>
          </div>
          <div className="w-3 h-3 bg-lime-400 border border-black transform rotate-45" />
        </div>

        {/* Search */}
        <div className="relative my-3">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH CHRONICLES & LORE..."
            className="w-full bg-[#f4f6ee] border border-black/30 focus:border-black pl-8 pr-3 py-1.5 text-[9.5px] font-mono text-black placeholder:text-black/35 outline-none tracking-wider uppercase"
          />
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer ${
                activeTag === tag
                  ? 'bg-black text-white'
                  : 'bg-black/5 hover:bg-black/10 text-black/70 border border-black/15'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-2">
          {filteredArticles.map((art) => {
            const isSelected = art.id === selectedId;
            return (
              <div
                key={art.id}
                onClick={() => setSelectedId(art.id)}
                className={`p-2.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#f4f6ee] border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-white hover:bg-black/5 border-black/20'
                }`}
              >
                <div className="flex items-center justify-between text-[8px] font-mono text-black/50 mb-1">
                  <span className="font-bold text-black">{art.era}</span>
                  <span className="px-1.5 py-0.2 bg-black text-white uppercase text-[7px]">
                    {art.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[11px] font-black text-black leading-snug">
                  {art.title}
                </div>
                <div className="text-[9px] text-black/60 line-clamp-1 mt-1 font-sans">
                  {art.excerpt}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* RIGHT SIDE: Lore Article Viewer */}
      <div className="flex-1 flex flex-col bg-white/90 border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_#000] overflow-y-auto relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-10 bg-lime-400 transform -skew-x-12" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-black text-black uppercase">
                TERRA HISTORICAL COMPENDIUM // {current.era}
              </span>
              <span className="text-[8.5px] font-mono text-black/50">
                CATEGORY: {current.category}
              </span>
            </div>
          </div>
          <div className="px-2 py-1 bg-black text-white font-mono text-[9px] font-black uppercase">
            RESTRICTED ACCESS
          </div>
        </div>

        {/* Title */}
        <div className="my-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-black tracking-tight uppercase">
            {current.title}
          </h2>
          <p className="text-xs sm:text-sm text-black/75 mt-2 bg-lime-100/60 border-l-2 border-black p-2 font-sans font-medium">
            {current.excerpt}
          </p>
        </div>

        {/* Content Paragraphs */}
        <div className="space-y-4 my-2 flex-1 font-sans text-xs sm:text-sm text-black/85 leading-relaxed bg-[#fbfcf7] p-4 sm:p-6 border border-black/20">
          {current.body.map((p, i) => (
            <p key={i} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* Tags */}
        <div className="pt-4 border-t-2 border-black mt-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[8.5px] font-mono font-black text-black uppercase">
              SEMANTIC TAGS:
            </span>
            {current.tags.map((tag) => (
              <span 
                key={tag}
                className="px-2 py-0.5 bg-black text-white text-[8px] font-mono font-black uppercase tracking-wider"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="text-[9px] font-mono font-black text-black/60">
            PRTS RECORD ID: {current.id.toUpperCase()}
          </div>
        </div>

      </div>

    </div>
  );
};

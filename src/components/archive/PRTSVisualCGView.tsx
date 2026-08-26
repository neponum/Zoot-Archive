import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  ZoomIn, 
  Layers, 
  MapPin, 
  Maximize2, 
  Sparkles,
  Info,
  Calendar,
  Compass
} from 'lucide-react';

interface ArchivalVisual {
  id: string;
  code: string;
  title: string;
  event: string;
  location: string;
  timestamp: string;
  imageUrl: string;
  description: string;
  tags: string[];
}

const VISUAL_RECORDS: ArchivalVisual[] = [
  {
    id: 'cg_babel_sarcophagus',
    code: 'CG-BBL-01',
    title: 'The Sarcophagus Awakening & Babel Evacuation',
    event: 'Episode 14 / Babel Records',
    location: 'Kazdel Wasteland / Subterranean Sarcophagus Chamber',
    timestamp: '1094.12.23 03:42',
    imageUrl: 'https://raw.githubusercontent.com/Aceship/Arknight-Images/main/avg/backgrounds/bg_black.png',
    description: 'Dr. Kal\'tsit standing before the primary stasis pod chamber in the heart of the ancient landship.',
    tags: ['Babel', "Kal'tsit", 'Doctor', 'Sarcophagus']
  },
  {
    id: 'cg_lone_trail_sky',
    code: 'CG-LT-09',
    title: 'Breach of the Planetary Sky Barrier',
    event: 'Lone Trail / Section 35',
    location: 'Columbia, Trimounts Airspace 35,000m',
    timestamp: '1099.03.11 17:15',
    imageUrl: 'https://raw.githubusercontent.com/Aceship/Arknight-Images/main/avg/backgrounds/bg_black.png',
    description: 'The transmitter conduit piercing the false celestial firmament, revealing the true vacuum of the universe beyond Terra.',
    tags: ['Lone Trail', 'Kirsten', 'Columbia', 'Sky Barrier']
  },
  {
    id: 'cg_stultifera_navis',
    code: 'CG-SN-04',
    title: 'The Golden Fleet Flagship in the Dark Sea',
    event: 'Stultifera Navis',
    location: 'Iberian Coast / The Eye of Iberia',
    timestamp: '1099.08.02 22:08',
    imageUrl: 'https://raw.githubusercontent.com/Aceship/Arknight-Images/main/avg/backgrounds/bg_black.png',
    description: 'The final surviving vessel of the Iberian Armada drifting through the bioluminescent Seaborn ocean fog.',
    tags: ['Stultifera Navis', 'Iberia', 'Aegir', 'Seaborn']
  },
  {
    id: 'cg_londinium_steam_knight',
    code: 'CG-LDN-12',
    title: 'The Last Steam Knight of Victoria',
    event: 'Episode 11 / Return to Mist',
    location: 'Victoria, City of Londinium Lower District',
    timestamp: '1098.10.19 14:30',
    imageUrl: 'https://raw.githubusercontent.com/Aceship/Arknight-Images/main/avg/backgrounds/bg_black.png',
    description: 'The towering steam engine armor standing as the final guardian of Victorian sovereignty against the Sarkaz Military Commission.',
    tags: ['Victoria', 'Londinium', 'Steam Knight', 'Sarkaz']
  }
];

export const PRTSVisualCGView: React.FC = () => {
  const [selectedVisual, setSelectedVisual] = useState<ArchivalVisual>(VISUAL_RECORDS[0]);
  const [zoomModal, setZoomModal] = useState<boolean>(false);

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 p-2 sm:p-4 overflow-hidden font-sans text-black select-none">
      
      {/* LEFT GALLERY STRIP */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white/90 border-2 border-black p-3 sm:p-4 shadow-[4px_4px_0px_#000] shrink-0">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-black text-white text-[9px] font-mono font-black tracking-widest uppercase">
              VISUAL RECORDS
            </div>
            <span className="text-[10px] font-mono font-bold text-black/50">
              [{VISUAL_RECORDS.length} ENTRIES]
            </span>
          </div>
          <Camera className="w-3.5 h-3.5 text-black" />
        </div>

        {/* List of CG Cards */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-3">
          {VISUAL_RECORDS.map((item) => {
            const isSelected = item.id === selectedVisual.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedVisual(item)}
                className={`p-2.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#f4f6ee] border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-white hover:bg-black/5 border-black/20'
                }`}
              >
                <div className="flex items-center justify-between text-[8px] font-mono text-black/50 mb-1">
                  <span className="font-black text-black">{item.code}</span>
                  <span className="px-1.5 py-0.2 bg-black text-white text-[7.5px] uppercase">
                    {item.event}
                  </span>
                </div>
                <div className="text-[11px] font-black text-black line-clamp-1">
                  {item.title}
                </div>
                <div className="text-[8px] font-mono text-black/60 mt-1 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  <span className="truncate">{item.location}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* RIGHT MAIN VIEWFINDER */}
      <div className="flex-1 flex flex-col bg-white/90 border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_#000] overflow-y-auto relative">
        
        {/* Top Viewfinder HUD */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-10 bg-lime-400 transform -skew-x-12" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-black text-black uppercase">
                OPTICAL SATELLITE RECONSTRUCTION // {selectedVisual.code}
              </span>
              <span className="text-[8.5px] font-mono text-black/50">
                TIMECODE: {selectedVisual.timestamp} • {selectedVisual.location}
              </span>
            </div>
          </div>
          <div className="border border-black px-2 py-0.5 font-mono text-[9px] font-black bg-lime-200">
            REC 1080P // HIGH DENSITY
          </div>
        </div>

        {/* Viewport Frame with Optical Reticle */}
        <div className="relative w-full aspect-video bg-[#0f1115] border-2 border-black my-4 overflow-hidden flex items-center justify-center group shadow-md">
          
          {/* Subtle Grid overlay */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(to right, #a3e635 1px, transparent 1px), linear-gradient(to bottom, #a3e635 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          />

          {/* Optical Corner Brackets */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-lime-400 pointer-events-none" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-lime-400 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-lime-400 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-lime-400 pointer-events-none" />

          {/* Center Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 border border-lime-400/40 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-lime-400 rounded-full" />
            </div>
          </div>

          {/* Visual Presentation text / image placeholder */}
          <div className="text-center p-6 z-10">
            <div className="text-lime-400 font-mono text-xs font-black tracking-widest uppercase mb-2">
              [ OPTICAL RECONSTRUCTION FEED ]
            </div>
            <div className="text-white font-black text-lg sm:text-2xl uppercase tracking-tight max-w-lg">
              {selectedVisual.title}
            </div>
            <div className="text-white/60 font-mono text-[10px] mt-2">
              {selectedVisual.location}
            </div>
          </div>

          {/* Bottom HUD Bar inside image */}
          <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-lime-400 font-mono text-[8px] tracking-widest z-10">
            <span>FOV: 74.2° // ISO 400</span>
            <span>PRTS SENSOR #04</span>
            <span>{selectedVisual.timestamp}</span>
          </div>

        </div>

        {/* Narrative Context */}
        <div className="flex-1 space-y-2">
          <div className="px-2 py-0.5 bg-black text-white text-[8.5px] font-mono font-black tracking-widest uppercase inline-block">
            TACTICAL DEBRIEF & SCENE CONTEXT
          </div>
          <p className="text-xs sm:text-sm text-black/85 font-sans leading-relaxed bg-[#fbfcf7] p-4 border border-black/20">
            {selectedVisual.description}
          </p>
        </div>

        {/* Footer Tags */}
        <div className="pt-3 border-t-2 border-black mt-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[8.5px] font-mono font-black text-black uppercase">
              TAGS:
            </span>
            {selectedVisual.tags.map((tag) => (
              <span 
                key={tag}
                className="px-2 py-0.5 bg-black text-white text-[8px] font-mono font-black uppercase"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="font-mono text-[9px] font-black text-black">
            EVENT: {selectedVisual.event.toUpperCase()}
          </div>
        </div>

      </div>

    </div>
  );
};

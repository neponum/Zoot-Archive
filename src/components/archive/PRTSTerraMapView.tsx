import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Compass, 
  AlertTriangle, 
  Activity, 
  Radio, 
  MapPin, 
  ShieldAlert, 
  Sparkles,
  Layers
} from 'lucide-react';

interface TerraSector {
  id: string;
  name: string;
  nation: string;
  dangerLevel: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL' | 'EXTREME';
  originiumDensity: string;
  catastropheThreat: string;
  activeLandships: string[];
  climate: string;
  summary: string;
}

const SECTORS: TerraSector[] = [
  {
    id: 'sec_kazdel',
    name: 'Sector K-01: Kazdel Wasteland',
    nation: 'Kazdel',
    dangerLevel: 'EXTREME',
    originiumDensity: '84.6 ppm (Active Crystal Veins)',
    catastropheThreat: 'Class-V Active Storm Front',
    activeLandships: ['Rhodes Island Command (Sub-route)', 'Military Commission Air Fleet'],
    climate: 'Arid desert, high Originium dust storms',
    summary: 'The battleground of the Teekaz and Sarkaz sub-factions. Constant shifting Catastrophes and ruins from the ancient eras.'
  },
  {
    id: 'sec_columbia',
    name: 'Sector C-08: Trimounts Tech Corridor',
    nation: 'Columbia',
    dangerLevel: 'MODERATE',
    originiumDensity: '28.2 ppm (Controlled Industrial)',
    catastropheThreat: 'Class-I Low Pressure Front',
    activeLandships: ['Rhine Lab Mobile Branch 04', 'Columbian Pioneer Unit 12'],
    climate: 'Temperate urban plateau',
    summary: 'Modern mobile scientific hubs and pioneer laboratories. Site of the Section 35 space barrier launch experiment.'
  },
  {
    id: 'sec_victoria',
    name: 'Sector V-03: Londinium Metropolitan',
    nation: 'Victoria',
    dangerLevel: 'SEVERE',
    originiumDensity: '62.1 ppm (War Zone Dispersion)',
    catastropheThreat: 'Class-III Urban Shroud',
    activeLandships: ['Duke of Wellington Armada', 'Self-Salvation Corps Mobile Outposts'],
    climate: 'Dense industrial fog and soot rain',
    summary: 'Victorian capital enveloped in internal power struggle and Sarkaz military occupation. High Arts energy emissions.'
  },
  {
    id: 'sec_iberia_ocean',
    name: 'Sector I-09: Iberian Dark Coast & Eyes of Iberia',
    nation: 'Iberia / Aegir Border',
    dangerLevel: 'CRITICAL',
    originiumDensity: '12.4 ppm (Subsurface Biological)',
    catastropheThreat: 'The Profound Silence Tide',
    activeLandships: ['Inquisition Coastal Patrol', 'Stultifera Navis (Wreckage Site)'],
    climate: 'Coastal marine fog with bioluminescent tides',
    summary: 'Decaying lighthouses guarding against the deep ocean Seaborn assimilation. High marine hazard warning.'
  },
  {
    id: 'sec_yan',
    name: 'Sector Y-05: Lungmen Trade Hub',
    nation: 'Yan',
    dangerLevel: 'LOW',
    originiumDensity: '15.8 ppm (Filtered Metropolitan)',
    catastropheThreat: 'Nomadic Evacuation Route Clear',
    activeLandships: ['Lungmen Guard Mobile City Core', 'Wei Yenwu State Landship'],
    climate: 'Subtropical monsoon basin',
    summary: 'Prosperous nomadic commercial city-state. Robust Catastrophe Messenger prediction system and border defenses.'
  }
];

export const PRTSTerraMapView: React.FC = () => {
  const [selectedSector, setSelectedSector] = useState<TerraSector>(SECTORS[0]);

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 p-2 sm:p-4 overflow-hidden font-sans text-black select-none">
      
      {/* LEFT LIST: Sectors */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white/90 border-2 border-black p-3 sm:p-4 shadow-[4px_4px_0px_#000] shrink-0">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-black text-white text-[9px] font-mono font-black tracking-widest uppercase">
              TERRA GEOLOGICAL RADAR
            </div>
            <span className="text-[10px] font-mono font-bold text-black/50">
              [{SECTORS.length} SECTORS]
            </span>
          </div>
          <Compass className="w-3.5 h-3.5 text-black" />
        </div>

        {/* Sectors list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-3">
          {SECTORS.map((sec) => {
            const isSelected = sec.id === selectedSector.id;
            return (
              <div
                key={sec.id}
                onClick={() => setSelectedSector(sec)}
                className={`p-2.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#f4f6ee] border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-white hover:bg-black/5 border-black/20'
                }`}
              >
                <div className="flex items-center justify-between text-[8px] font-mono text-black/50 mb-1">
                  <span className="font-black text-black">{sec.nation}</span>
                  <span className={`px-1.5 py-0.2 text-[7.5px] font-mono font-black uppercase ${
                    sec.dangerLevel === 'EXTREME' || sec.dangerLevel === 'CRITICAL'
                      ? 'bg-black text-white'
                      : 'bg-lime-300 text-black border border-black'
                  }`}>
                    {sec.dangerLevel}
                  </span>
                </div>
                <div className="text-[11px] font-black text-black line-clamp-1">
                  {sec.name}
                </div>
                <div className="text-[8px] font-mono text-black/60 mt-1 truncate">
                  ORIGINIUM: {sec.originiumDensity}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* RIGHT: Sector Detailed Telemetry */}
      <div className="flex-1 flex flex-col bg-white/90 border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_#000] overflow-y-auto relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-10 bg-lime-400 transform -skew-x-12" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-black text-black uppercase">
                RADAR TELEMETRY // {selectedSector.nation.toUpperCase()}
              </span>
              <span className="text-[8.5px] font-mono text-black/50">
                SENSOR ARRAY: ORBITAL OPTICAL 05 • ACTIVE PING
              </span>
            </div>
          </div>
          <div className="border border-black px-2 py-0.5 font-mono text-[9px] font-black bg-lime-300">
            RADAR ONLINE
          </div>
        </div>

        {/* Title */}
        <div className="my-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-black tracking-tight uppercase">
            {selectedSector.name}
          </h2>
          <p className="text-xs sm:text-sm text-black/75 mt-2 bg-black/5 border-l-2 border-black p-2 font-sans font-medium">
            {selectedSector.summary}
          </p>
        </div>

        {/* Telemetry Readout Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
          
          {/* Originium Density */}
          <div className="p-3 bg-[#f8faf2] border border-black/30">
            <div className="text-[8px] font-mono font-black text-black/60 uppercase">
              ORIGINIUM DENSITY INDEX
            </div>
            <div className="text-sm font-mono font-black text-black mt-1">
              {selectedSector.originiumDensity}
            </div>
          </div>

          {/* Catastrophe Threat */}
          <div className="p-3 bg-[#f8faf2] border border-black/30">
            <div className="text-[8px] font-mono font-black text-black/60 uppercase">
              CATASTROPHE FORECAST
            </div>
            <div className="text-sm font-mono font-black text-black mt-1">
              {selectedSector.catastropheThreat}
            </div>
          </div>

          {/* Climate & Terrain */}
          <div className="p-3 bg-[#f8faf2] border border-black/30">
            <div className="text-[8px] font-mono font-black text-black/60 uppercase">
              TERRAIN & BIOSPHERE
            </div>
            <div className="text-sm font-sans font-bold text-black mt-1">
              {selectedSector.climate}
            </div>
          </div>

          {/* Hazard Level */}
          <div className="p-3 bg-[#f8faf2] border border-black/30">
            <div className="text-[8px] font-mono font-black text-black/60 uppercase">
              OPERATIONAL THREAT MATRIX
            </div>
            <div className="text-sm font-mono font-black text-black mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-600 animate-pulse" />
              <span>{selectedSector.dangerLevel} RISK</span>
            </div>
          </div>

        </div>

        {/* Active Landships in Sector */}
        <div className="mt-3 space-y-2 flex-1">
          <div className="px-2 py-0.5 bg-black text-white text-[8.5px] font-mono font-black tracking-widest uppercase inline-block">
            DEPLOYED NOMADIC CITIES & LANDSHIPS
          </div>
          <div className="space-y-1.5 font-mono text-xs text-black/85 bg-[#fbfcf7] p-3 border border-black/20">
            {selectedSector.activeLandships.map((ship, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-lime-600 font-bold">⚓</span>
                <span>{ship}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t-2 border-black mt-4 flex items-center justify-between text-[9px] font-mono text-black/60">
          <span>COORDINATES: TERRA GRID #{selectedSector.id.toUpperCase()}</span>
          <span>CALIBRATED VIA PRTS CORE</span>
        </div>

      </div>

    </div>
  );
};

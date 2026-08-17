import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { User } from 'lucide-react';
import { StoryEpisode } from '../types';
import { fetchCharacterMapping } from '../services/storyService';

interface OperationRecordsGraphProps {
  episodes: StoryEpisode[];
  episodeImages: Record<string, string | null>;
  onSelectEpisode: (episode: StoryEpisode) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  episode: StoryEpisode;
  radius: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export const OperationRecordsGraph: React.FC<OperationRecordsGraphProps> = ({
  episodes,
  episodeImages,
  onSelectEpisode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  // Extract character ID and set initial image URLs
  useEffect(() => {
    const loadImages = async () => {
      const mapping = await fetchCharacterMapping();
      const urls: Record<string, string> = {};
      
      episodes.forEach(ep => {
        // Extract the character name from the episode ID (e.g., story_deepcl_set_1 -> deepcl)
        let charName = '';
        const match = ep.id.match(/story_([a-zA-Z0-9]+)_set/);
        if (match) {
          charName = match[1];
        } else {
          charName = ep.id.replace(/^(or_|story_)/, '').split('_')[0];
        }
        
        // Look up the full character ID from the mapping
        const charId = mapping[charName.toLowerCase()] || `char_${charName}`;
        
        urls[ep.id] = `https://raw.githubusercontent.com/fexli/ArknightsResource/main/avatar/ASSISTANT/${charId}_2.png`;
      });
      
      setImageUrls(urls);
    };
    
    loadImages();
  }, [episodes]);

  const handleImageError = (id: string) => {
    setImageUrls(prev => {
      const currentUrl = prev[id];
      if (!currentUrl) return prev;
      
      // Fallback chain: _2.png -> .png -> _1.png -> fail
      if (currentUrl.endsWith('_2.png')) {
        return { ...prev, [id]: currentUrl.replace('_2.png', '.png') };
      } else if (currentUrl.endsWith('.png') && !currentUrl.endsWith('_1.png')) {
        return { ...prev, [id]: currentUrl.replace('.png', '_1.png') };
      }
      
      setFailedImages(f => ({ ...f, [id]: true }));
      return prev;
    });
  };

  // Setup D3 Zoom
  useEffect(() => {
    if (!containerRef.current) return;
    
    const zoom = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        setTransform(event.transform);
      });

    d3.select(containerRef.current).call(zoom);
  }, []);

  // Setup D3 Force Simulation
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (episodes.length === 0) {
      setNodes([]);
      setLinks([]);
      return;
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Create nodes
    const newNodes: GraphNode[] = episodes.map(ep => ({
      id: ep.id,
      episode: ep,
      radius: 40,
      x: Math.random() * width,
      y: Math.random() * height
    }));

    // Create random links to make it look like a graph
    const newLinks: GraphLink[] = [];
    newNodes.forEach((node, i) => {
      // Connect to 1-2 random previous nodes
      if (i > 0) {
        const numLinks = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < numLinks; j++) {
          const targetIdx = Math.floor(Math.random() * i);
          newLinks.push({
            source: node.id,
            target: newNodes[targetIdx].id
          });
        }
      }
    });

    const simulation = d3.forceSimulation<GraphNode>(newNodes)
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(80))
      .force('link', d3.forceLink<GraphNode, GraphLink>(newLinks).id(d => d.id).distance(200))
      .on('tick', () => {
        setNodes([...simulation.nodes()]);
        setLinks([...newLinks]);
      });

    return () => {
      simulation.stop();
    };
  }, [episodes]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#b0c4de]/5 cursor-grab active:cursor-grabbing">
      {/* Decorative background lines to simulate network */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} />

      {/* Zoomable Container */}
      <div 
        className="absolute inset-0 transform-gpu"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          transformOrigin: '0 0'
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          {links.map((link, i) => {
            const source = link.source as GraphNode;
            const target = link.target as GraphNode;
            if (!source.x || !source.y || !target.x || !target.y) return null;
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={2 / transform.k} // Keep line width consistent regardless of zoom
              />
            );
          })}
        </svg>

        {nodes.map((node) => {
          if (node.x === undefined || node.y === undefined) return null;
          return (
            <button
              key={node.id}
              onClick={() => onSelectEpisode(node.episode)}
              className="absolute group flex flex-col items-center transition-transform hover:scale-110 hover:z-50"
              style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-white tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                UPDATED
              </div>
              
              {/* Avatar Box */}
              <div className="w-16 h-16 md:w-20 md:h-20 bg-black border-2 border-white/40 group-hover:border-white transition-colors relative overflow-hidden shadow-lg rounded-full">
                {imageUrls[node.id] && !failedImages[node.id] ? (
                  <img 
                    src={imageUrls[node.id]} 
                    alt={node.episode.name} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError(node.id)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] p-2">
                    <span className="text-[10px] text-white/50 text-center leading-tight font-bold">Не получилось</span>
                  </div>
                )}
              </div>
              
              {/* Nameplate */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-3 py-0.5 min-w-[80px] shadow-md border border-black/10 flex items-center justify-center group-hover:bg-gray-100 transition-colors rounded-full">
                <span className="text-xs font-black text-black whitespace-nowrap">
                  {node.episode.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

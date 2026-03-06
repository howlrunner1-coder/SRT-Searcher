import React, { useState, useMemo } from 'react';
import { Search, FileText, ChevronRight, Subtitles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import subtitlesData from './subtitles-index.json';

interface Subtitle {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  fileName: string;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cast the imported JSON to our Subtitle interface
  const allSubtitles = subtitlesData as Subtitle[];

  // Memoized search results for performance
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return allSubtitles.filter(sub => 
      sub.text.toLowerCase().includes(query) || 
      sub.fileName.toLowerCase().includes(query)
    ).slice(0, 100); // Limit results for performance
  }, [searchQuery, allSubtitles]);

  // Unique files for the sidebar
  const uniqueFiles = useMemo(() => {
    const files = new Set(allSubtitles.map(s => s.fileName));
    return Array.from(files).map(name => ({
      name,
      uploaded_at: new Date().toISOString() // Static placeholder
    }));
  }, [allSubtitles]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#141414] p-2 rounded-lg">
              <Subtitles className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight italic font-serif">SRT Searcher</h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-[#141414]/50 font-mono uppercase tracking-widest hidden sm:inline">
              {uniqueFiles.length} Files Indexed
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Files Info */}
        <div className="lg:col-span-4 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">Indexed Files</h2>
              <span className="text-[10px] bg-[#141414]/5 px-2 py-0.5 rounded text-[#141414]/40 font-mono">Static</span>
            </div>
            <div className="bg-white rounded-2xl border border-[#141414]/10 overflow-hidden shadow-sm">
              {uniqueFiles.length === 0 ? (
                <div className="p-8 text-center text-[#141414]/40 italic">
                  No files indexed. Add .srt files to /subtitles and run build.
                </div>
              ) : (
                <div className="divide-y divide-[#141414]/5 max-h-[60vh] overflow-y-auto">
                  {uniqueFiles.map((file, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between group hover:bg-[#F5F5F0]/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-[#141414]/30 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate text-sm">{file.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#141414]/40 italic px-2">
              This is a static version. Files are indexed during the build process from the <code>/subtitles</code> folder.
            </p>
          </section>
        </div>

        {/* Right Column: Search & Results */}
        <div className="lg:col-span-8 space-y-8">
          {/* Search Bar */}
          <section className="space-y-4">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#141414]/30" />
              <input
                type="text"
                placeholder="Search for words or phrases..."
                className="w-full bg-white border border-[#141414]/10 rounded-2xl py-6 pl-16 pr-6 text-lg focus:outline-none focus:ring-2 focus:ring-[#141414]/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </section>

          {/* Search Results */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">
                {searchResults.length > 0 ? `Found ${searchResults.length} results` : 'Search Results'}
              </h2>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {searchResults.length === 0 && searchQuery ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-12 text-center border border-[#141414]/10 shadow-sm"
                  >
                    <p className="text-[#141414]/40 italic">No matches found for "{searchQuery}"</p>
                  </motion.div>
                ) : (
                  searchResults.map((result, idx) => (
                    <motion.div
                      key={`${result.fileName}-${result.index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                      className="bg-white rounded-2xl p-6 border border-[#141414]/10 shadow-sm hover:border-[#141414]/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#141414]/40">
                          <span className="bg-[#F5F5F0] px-2 py-1 rounded text-[#141414] font-bold">{result.fileName}</span>
                          <ChevronRight className="w-3 h-3" />
                          <span>Index {result.index}</span>
                        </div>
                        <div className="text-[10px] font-mono text-[#141414]/60 bg-[#141414]/5 px-2 py-1 rounded">
                          {result.startTime}
                        </div>
                      </div>
                      <p className="text-lg leading-relaxed font-serif italic">
                        {result.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => (
                          part.toLowerCase() === searchQuery.toLowerCase() ? (
                            <mark key={i} className="bg-yellow-200 text-[#141414] px-1 rounded">{part}</mark>
                          ) : part
                        ))}
                      </p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>

              {!searchQuery && (
                <div className="bg-white/50 rounded-2xl p-12 text-center border border-dashed border-[#141414]/10">
                  <p className="text-[#141414]/30 italic">Enter a keyword above to start searching</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

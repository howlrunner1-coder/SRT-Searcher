import React, { useState, useEffect } from 'react';
import { Search, FileText, Trash2, Loader2, ChevronRight, Subtitles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileRecord {
  id: number;
  name: string;
  uploaded_at: string;
}

interface Subtitle {
  id: number;
  file_id: number;
  start_time: string;
  end_time: string;
  text: string;
  subtitle_index: number;
  file_name?: string;
}

export default function App() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Subtitle[]>([]);
  const [isRescanning, setIsRescanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    try {
      await fetch('/api/rescan', { method: 'POST' });
      await fetchFiles();
    } catch (error) {
      console.error('Rescan failed:', error);
    } finally {
      setIsRescanning(false);
    }
  };

  const deleteFile = async (id: number) => {
    try {
      await fetch(`/api/files/${id}`, { method: 'DELETE' });
      setFiles(files.filter(f => f.id !== id));
      setSearchResults(searchResults.filter(s => s.file_id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

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
            <button
              onClick={handleRescan}
              disabled={isRescanning}
              className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-xl hover:bg-[#141414]/90 transition-all disabled:opacity-50 text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isRescanning ? 'animate-spin' : ''}`} />
              {isRescanning ? 'Scanning...' : 'Rescan Folder'}
            </button>
            <span className="text-sm text-[#141414]/50 font-mono uppercase tracking-widest hidden sm:inline">
              {files.length} Files Indexed
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
              <span className="text-[10px] bg-[#141414]/5 px-2 py-0.5 rounded text-[#141414]/40 font-mono">/subtitles</span>
            </div>
            <div className="bg-white rounded-2xl border border-[#141414]/10 overflow-hidden shadow-sm">
              {files.length === 0 ? (
                <div className="p-8 text-center text-[#141414]/40 italic">
                  No files found in /subtitles
                </div>
              ) : (
                <div className="divide-y divide-[#141414]/5 max-h-[60vh] overflow-y-auto">
                  {files.map((file) => (
                    <div key={file.id} className="p-4 flex items-center justify-between group hover:bg-[#F5F5F0]/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-[#141414]/30 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate text-sm">{file.name}</p>
                          <p className="text-[10px] text-[#141414]/40 font-mono">
                            {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(file.id);
                        }}
                        className="p-2 text-[#141414]/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from index (does not delete file)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#141414]/40 italic px-2">
              Files are automatically indexed from the <code>/subtitles</code> folder on startup.
            </p>
          </section>
        </div>

        {/* Right Column: Search & Results */}
        <div className="lg:col-span-8 space-y-8">
          {/* Search Bar */}
          <section className="space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#141414]/30" />
              <input
                type="text"
                placeholder="Search for words or phrases..."
                className="w-full bg-white border border-[#141414]/10 rounded-2xl py-6 pl-16 pr-6 text-lg focus:outline-none focus:ring-2 focus:ring-[#141414]/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#141414]/30" />
                </div>
              )}
            </form>
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
                {searchResults.length === 0 && searchQuery && !isSearching ? (
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
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-2xl p-6 border border-[#141414]/10 shadow-sm hover:border-[#141414]/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#141414]/40">
                          <span className="bg-[#F5F5F0] px-2 py-1 rounded text-[#141414] font-bold">{result.file_name}</span>
                          <ChevronRight className="w-3 h-3" />
                          <span>Index {result.subtitle_index}</span>
                        </div>
                        <div className="text-[10px] font-mono text-[#141414]/60 bg-[#141414]/5 px-2 py-1 rounded">
                          {result.start_time}
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

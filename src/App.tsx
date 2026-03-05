import React, { useState, useEffect, useRef } from 'react';
import { Search, Upload, FileText, Trash2, Loader2, X, ChevronRight, Subtitles } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const parseSRT = (content: string) => {
    const blocks = content.trim().split(/\n\s*\n/);
    return blocks.map(block => {
      const lines = block.split('\n');
      if (lines.length < 3) return null;
      
      const index = parseInt(lines[0]);
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (!timeMatch) return null;
      
      const text = lines.slice(2).join(' ');
      return {
        index,
        startTime: timeMatch[1],
        endTime: timeMatch[2],
        text: text.trim()
      };
    }).filter(Boolean);
  };

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        if (!file.name.endsWith('.srt')) continue;

        const content = await file.text();
        const parsedSubtitles = parseSRT(content);

        await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            subtitles: parsedSubtitles
          })
        });
      }
      await fetchFiles();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (id: number) => {
    try {
      await fetch(`/api/files/${id}`, { method: 'DELETE' });
      setFiles(files.filter(f => f.id !== id));
      // Clear search results if they belong to this file
      setSearchResults(searchResults.filter(s => s.file_id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#141414]/50 font-mono uppercase tracking-widest">
              {files.length} Files Indexed
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Upload & Files */}
        <div className="lg:col-span-4 space-y-8">
          {/* Upload Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">Add Subtitles</h2>
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 ${
                dragActive ? 'border-[#141414] bg-[#141414]/5' : 'border-[#141414]/10 hover:border-[#141414]/30'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".srt"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div className="bg-white shadow-sm p-3 rounded-full">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#141414]" />
                ) : (
                  <Upload className="w-6 h-6 text-[#141414]" />
                )}
              </div>
              <div>
                <p className="font-medium">Drop .srt files here</p>
                <p className="text-sm text-[#141414]/50">or click to browse</p>
              </div>
            </div>
          </section>

          {/* Files List */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">Indexed Files</h2>
            <div className="bg-white rounded-2xl border border-[#141414]/10 overflow-hidden shadow-sm">
              {files.length === 0 ? (
                <div className="p-8 text-center text-[#141414]/40 italic">
                  No files uploaded yet
                </div>
              ) : (
                <div className="divide-y divide-[#141414]/5">
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
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                          <span className="bg-[#F5F5F0] px-2 py-1 rounded">{result.file_name}</span>
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

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Copy, CheckCircle2, TrendingUp, Link as LinkIcon, DollarSign, ArrowRight, Twitter, Facebook, Linkedin } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Home() {
  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customImage, setCustomImage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shortenedUrls, setShortenedUrls] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  const [localLinkIds, setLocalLinkIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('puulp_links');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetchStats(localLinkIds);
  }, []);

  const fetchStats = async (ids: string[]) => {
    if (ids.length === 0) {
      setShortenedUrls([]);
      return;
    }
    try {
      const res = await fetch('/api/links/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      if (data.stats) setShortenedUrls(data.stats);
    } catch (err) {
      console.error("Failed to fetch stats");
    }
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('http')) return alert('URL must start with http:// or https://');

    setIsLoading(true);
    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url,
          customTitle: customTitle.trim() || undefined,
          customDescription: customDescription.trim() || undefined,
          customImage: customImage.trim() || undefined
        }),
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const textData = await res.text();
        throw new Error(`Server returned non-JSON: ${res.status} ${textData.substring(0, 50)}`);
      }

      if (data.error) {
        alert(data.error);
      } else {
        setUrl('');
        setCustomTitle('');
        setCustomDescription('');
        setCustomImage('');
        setShowAdvanced(false);
        
        const newIds = [data.id, ...localLinkIds.filter(id => id !== data.id)];
        setLocalLinkIds(newIds);
        localStorage.setItem('puulp_links', JSON.stringify(newIds));
        fetchStats(newIds);
      }
    } catch (err: any) {
      console.error("Shortening error:", err);
      alert(`Failed to shorten URL: ${err.message || 'Unknown error'}`);
    }
    setIsLoading(false);
  };

  const handleCopy = (id: string, fullPath: string) => {
    navigator.clipboard.writeText(fullPath);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-200">
      <header className="border-b border-neutral-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-lg tracking-tight">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span>Puulp.it</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4">
            Shorten links.<br/>
            <span className="text-neutral-500">Earn with every click.</span>
          </h1>
          <p className="text-lg text-neutral-600 mb-8 max-w-xl leading-relaxed">
            Create short URLs that show an ad interstitial before redirecting. Monetize your traffic effortlessly while providing a reliable redirection service.
          </p>

          <form onSubmit={handleShorten} className="bg-transparent border-none">
            <div className="relative flex flex-col sm:flex-row shadow-sm rounded-xl overflow-hidden sm:bg-white sm:border sm:border-neutral-200 sm:focus-within:ring-2 sm:focus-within:ring-neutral-900 sm:focus-within:border-transparent transition-all gap-3 sm:gap-0 p-1 sm:p-0">
              <div className="flex items-center flex-1 bg-white border border-neutral-200 sm:border-none rounded-xl sm:rounded-none focus-within:ring-2 focus-within:ring-neutral-900 sm:focus-within:ring-0">
                <div className="pl-4 pr-2 text-neutral-400">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <input
                  type="url"
                  required
                  placeholder="Paste your long URL here..."
                  className="w-full py-4 pr-2 outline-none text-neutral-900 placeholder:text-neutral-400 font-medium bg-transparent"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="sm:p-2 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="px-4 py-4 sm:py-2.5 rounded-xl sm:rounded-lg font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  {showAdvanced ? 'Hide Options' : 'Options'}
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 sm:flex-none flex items-center justify-center bg-neutral-900 text-white px-6 py-4 sm:py-2.5 rounded-xl sm:rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isLoading ? 'Shortening...' : 'Shorten'}
                </button>
              </div>
            </div>

            {showAdvanced && (
              <div className="mt-4 p-5 bg-white border border-neutral-200 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <h3 className="font-medium tracking-tight text-neutral-900">Custom Social Preview Attributes</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-neutral-600 mb-1.5 block">Title (og:title)</span>
                    <input 
                      type="text" 
                      placeholder="Custom link title" 
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-neutral-600 mb-1.5 block">Image URL (og:image)</span>
                    <input 
                      type="url" 
                      placeholder="https://example.com/image.png" 
                      value={customImage}
                      onChange={e => setCustomImage(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-neutral-600 mb-1.5 block">Description (og:description)</span>
                    <textarea 
                      placeholder="A short description summarizing the link." 
                      value={customDescription}
                      onChange={e => setCustomDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all resize-none"
                    />
                  </label>
                </div>
                <p className="text-xs text-neutral-500">If left blank, these fields will be automatically fetched from the original URL if possible.</p>
              </div>
            )}
          </form>
        </div>

        <div className="mt-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neutral-400" />
              Your Links
            </h2>
            <div className="text-sm font-medium text-neutral-500">
              {shortenedUrls.length} {shortenedUrls.length === 1 ? 'link' : 'links'}
            </div>
          </div>

          {shortenedUrls.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LinkIcon className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="text-neutral-900 font-medium">No links yet</p>
              <p className="text-neutral-500 text-sm mt-1">Shorten your first URL to start earning.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {shortenedUrls.map((link) => {
                const shortUrl = `${appUrl}/${link.id}`;
                return (
                  <div key={link.id} className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 transition-colors">
                    <div className="flex-1 min-w-0 flex items-start sm:items-center gap-4">
                      {link.metadata?.image ? (
                        <div className="w-16 h-12 sm:w-20 sm:h-14 flex-shrink-0 bg-neutral-100 rounded-lg border border-neutral-200 overflow-hidden mt-1 sm:mt-0">
                          <img src={link.metadata.image} alt={link.metadata?.title || 'Preview'} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center mt-1 sm:mt-0">
                          {link.metadata?.favicon ? (
                            <img src={link.metadata.favicon} alt="" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
                          ) : (
                            <LinkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-400" />
                          )}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-900 truncate mb-1">
                          {link.metadata?.title || link.originalUrl}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-emerald-600 truncate text-sm">
                            {shortUrl}
                          </span>
                          <a href={shortUrl} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-neutral-900 transition-colors">
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {link.originalUrl}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between sm:justify-end items-center sm:gap-6 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-neutral-100 w-full sm:w-auto">
                      <div className="flex flex-col sm:items-end">
                        <span className="text-sm font-medium text-neutral-900">{link.views} views</span>
                        <span className="text-xs text-neutral-500">
                          ~${(link.views * 0.002).toFixed(4)} earned
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <a 
                          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shortUrl)}&text=${encodeURIComponent('Check this out!')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 sm:p-2 text-neutral-500 hover:text-[#1DA1F2] hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0"
                          title="Share on Twitter"
                        >
                          <Twitter className="w-5 h-5" />
                        </a>
                        <a 
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortUrl)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 sm:p-2 text-neutral-500 hover:text-[#4267B2] hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0"
                          title="Share on Facebook"
                        >
                          <Facebook className="w-5 h-5" />
                        </a>
                        <a 
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shortUrl)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 sm:p-2 text-neutral-500 hover:text-[#0077b5] hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0"
                          title="Share on LinkedIn"
                        >
                          <Linkedin className="w-5 h-5" />
                        </a>
                        <button 
                          onClick={() => handleCopy(link.id, shortUrl)}
                          className="p-2 sm:p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0 ml-1 sm:ml-2"
                          title="Copy to clipboard"
                        >
                          {copiedId === link.id ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

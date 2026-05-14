import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, ShieldCheck, DollarSign, CheckCircle2 } from 'lucide-react';
import { AdSenseScript, AdUnit } from '../components/AdSense';

export default function RedirectPage() {
  const { id } = useParams<{ id: string }>();
  const [countdown, setCountdown] = useState(5);
  const [linkData, setLinkData] = useState<{ originalUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // Fetch the link data
    fetch(`/api/links/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setLinkData(data);
          // Track the view
          fetch(`/api/links/${id}/track`, { method: 'POST' });
        }
      })
      .catch(() => setError("Failed to load link"));
  }, [id]);

  useEffect(() => {
    if (error || !linkData || !verified) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect when countdown hits 0
          window.location.href = linkData.originalUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [linkData, error, verified]);

  const handleVerify = () => {
    setVerifying(true);
    // Simulate a network request / human check
    setTimeout(() => {
      setVerified(true);
      setVerifying(false);
    }, 1500);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 text-neutral-900">Oops!</div>
          <div className="text-neutral-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans">
      <AdSenseScript />
      {/* Fake Header */}
      <header className="bg-white border-b border-neutral-200 h-14 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2 font-semibold text-neutral-400">
          <DollarSign className="w-4 h-4" /> Puulp.it
        </div>
        <div className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> Link protected
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 w-full max-w-5xl mx-auto gap-4">
        {/* Real Top Ad Unit */}
        <div className="w-full min-h-[90px] bg-white rounded-lg flex items-center justify-center overflow-hidden">
          <AdUnit slot="auto" style={{ display: 'block', minWidth: '300px', minHeight: '90px', width: '100%' }} />
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-4">
          {/* Main Content Area */}
          <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center mb-6 border border-neutral-100">
              <ExternalLink className="w-8 h-8 text-neutral-400" />
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
              You are leaving Puulp.it
            </h1>
            
            {!verified ? (
              <div className="flex flex-col items-center">
                <p className="text-neutral-500 mb-8 max-w-sm">
                  Please complete the security check to continue to your destination.
                </p>
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto px-8 py-4 sm:py-3 rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[56px] sm:min-h-0"
                >
                  {verifying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Verify I am human
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                <p className="text-neutral-500 mb-6 max-w-sm">
                  Please wait while we redirect you to your destination.
                </p>

                {countdown > 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 text-emerald-600 font-medium mb-6">
                      <CheckCircle2 className="w-5 h-5" /> Verification passed
                    </div>
                    <div className="text-5xl font-mono font-medium tracking-tight text-neutral-900 mb-2">
                      {countdown}
                    </div>
                    <div className="text-sm font-medium uppercase tracking-wider text-neutral-400">
                      Seconds Remaining
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <div className="text-emerald-600 font-medium">Redirecting now...</div>
                  </div>
                )}
              </>
            )}

            {linkData && (
              <div className="mt-12 text-sm text-neutral-400 break-all max-w-full px-4">
                Destination: <span className="font-mono">{linkData.originalUrl}</span>
              </div>
            )}
          </div>

          {/* Real Sidebar Ad Unit */}
          <div className="hidden lg:flex w-[300px] bg-white rounded-xl items-center justify-center overflow-hidden p-4">
            <AdUnit slot="auto" style={{ display: 'block', width: '100%', height: '100%' }} />
          </div>
        </div>

        {/* Real Interstitial Ad Container - Full Width below */}
        <div className="w-full min-h-[250px] lg:hidden bg-white rounded-xl flex items-center justify-center overflow-hidden p-4 mt-auto">
          <AdUnit slot="auto" style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
      </main>
    </div>
  );
}

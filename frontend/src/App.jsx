import { useState, useMemo } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line
} from 'recharts'
import {
  CloudArrowDownIcon, SparklesIcon, ChartBarIcon, ExclamationTriangleIcon,
  HandThumbUpIcon, XMarkIcon, MagnifyingGlassIcon, ChevronRightIcon, CheckCircleIcon
} from '@heroicons/react/24/outline'

const API_URL = 'http://127.0.0.1:8000/api'
const COLORS = {
  positive: '#34d399', // Emerald 400
  neutral: '#94a3b8',  // Slate 400
  negative: '#f87171', // Red 400
  primary: '#8b5cf6',
  secondary: '#06b6d4'
}

function App() {
  const [apiKey, setApiKey] = useState('')
  const [googleUrl, setGoogleUrl] = useState('')
  const [appleUrl, setAppleUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedPainPoint, setSelectedPainPoint] = useState(null)
  const [allReviews, setAllReviews] = useState([]) // Store raw reviews specifically for filtering

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!googleUrl && !appleUrl) return setError("Please provide at least one URL.")
    if (!apiKey) return setError("OpenAI API Key is required.")

    setLoading(true); setError(null); setData(null); setSelectedPainPoint(null)

    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        google_url: googleUrl, apple_url: appleUrl, openai_key: apiKey
      })
      setData(response.data)

      // We need to fetch the full excel content effectively to filter locally? 
      // ACTUALLY: The backend API returns the analysis and stats, but NOT the full list of reviews in JSON to save bandwidth.
      // However, for client-side filtering (which is fast/interactive), we DO need them.
      // Let's assume for this "Demo" the backend DOESN'T send them yet in the response... 
      // WAIT, `analyze_reviews` in backend doesn't return the raw list.
      // I should update main.py to return `all_reviews` (limit 1000) for this feature.

      // Since I can't update main.py in this single tool call, I will do it in parallel or next step.
      // For now, I will write the code Assuming `all_reviews` is present in response.data.
      setAllReviews(response.data.reviews || [])

    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred.")
    } finally {
      setLoading(false)
    }
  }

  // Filter reviews for the selected pain point
  const matchingReviews = useMemo(() => {
    if (!selectedPainPoint || !allReviews.length) return []
    const keywords = selectedPainPoint.search_keywords || []
    if (!keywords.length) return []

    return allReviews.filter(r => {
      const text = (r.content || "").toLowerCase()
      return keywords.some(k => text.includes(k.toLowerCase()))
    }).slice(0, 50) // Limit display
  }, [selectedPainPoint, allReviews])

  return (
    <div className="min-h-screen bg-darker p-4 md:p-8 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Review Intelligence AI
            </h1>
          </div>
          {data && (
            <button onClick={() => setData(null)} className="text-sm text-slate-400 hover:text-white">
              Analyze Another App
            </button>
          )}
        </header>

        {/* Input Section */}
        <AnimatePresence mode="wait">
          {!data && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto mt-20">
              <div className="card space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold">Unlock User Insights</h2>
                  <p className="text-slate-400">Paste your app store URLs to analyze sentiment, pain points, and trends.</p>
                </div>
                <form onSubmit={handleAnalyze} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">OpenAI API Key</label>
                    <input type="password" placeholder="sk-..." className="glass-input w-full" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Google Play URL</label>
                      <input type="url" placeholder="https://play.google.com/..." className="glass-input w-full" value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">App Store URL</label>
                      <input type="url" placeholder="https://apps.apple.com/..." className="glass-input w-full" value={appleUrl} onChange={(e) => setAppleUrl(e.target.value)} />
                    </div>
                  </div>
                  {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
                  <button type="submit" disabled={!apiKey || (!googleUrl && !appleUrl)} className="w-full glass-button bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                    Analyze Reviews
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-[50vh] space-y-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
              </div>
              <h3 className="text-xl font-semibold">Analyzing Reviews...</h3>
            </motion.div>
          )}

          {data && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard title="App Name" value={data.app_name} icon={<SparklesIcon className="w-5 h-5 text-secondary" />} />
                <StatsCard title="Total Reviews" value={data.stats.total_reviews} icon={<ChartBarIcon className="w-5 h-5 text-primary" />} />
                <StatsCard title="Negative Reviews" value={data.stats.sentiment_counts?.negative || 0} sub={`/ ${data.stats.total_reviews}`} icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-400" />} />
                <div className="card flex items-center justify-between p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                  <div><p className="text-green-400 text-sm font-medium">Sentiment</p><p className="text-2xl font-bold text-green-100">{(data.stats.sentiment_counts?.positive / data.stats.total_reviews * 100).toFixed(0)}% <span className="text-sm font-normal text-green-400/70">Positive</span></p></div>
                  <HandThumbUpIcon className="w-8 h-8 text-green-400/50" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Charts */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Timeline Chart */}
                  <div className="card h-96">
                    <h3 className="text-lg font-semibold mb-6">Sentiment Over Time</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.stats.timeline}>
                        <defs>
                          <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.positive} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.positive} stopOpacity={0} /></linearGradient>
                          <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.negative} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.negative} stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="period" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                        <Area type="monotone" dataKey="positive" stroke={COLORS.positive} fillOpacity={1} fill="url(#colorPos)" stackId="1" />
                        <Area type="monotone" dataKey="neutral" stroke={COLORS.neutral} fillOpacity={1} fill={COLORS.neutral} stackId="1" />
                        <Area type="monotone" dataKey="negative" stroke={COLORS.negative} fillOpacity={1} fill="url(#colorNeg)" stackId="1" />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Version Analysis Chart (Issues) */}
                  {data.stats.version_stats && data.stats.version_stats.length > 0 && (
                    <div className="card h-80">
                      <h3 className="text-lg font-semibold mb-6 text-red-400">Issues by App Version</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.stats.version_stats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="app_version" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                          <Bar dataKey="issue_count" name="Negative Reviews" fill={COLORS.negative} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Resolved Issues Graph (New) */}
                  {data.analysis.resolved_issues && data.analysis.resolved_issues.length > 0 && (
                    <div className="card h-96 border-l-4 border-l-emerald-500">
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
                        Fixed Issues (Declining Trend)
                      </h3>
                      <p className="text-slate-400 text-sm mb-6">Issues that were frequent in the past but have dropped in recent updates.</p>

                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={(() => {
                          const periods = [...new Set(allReviews.map(r => (r.at || "").slice(0, 7)))].sort();
                          return periods.map(period => {
                            const reviews = allReviews.filter(r => (r.at || "").startsWith(period));
                            const point = { period };
                            data.analysis.resolved_issues.forEach((issue, idx) => {
                              const kws = issue.search_keywords || [];
                              point[issue.title] = reviews.filter(r => kws.some(k => (r.content || "").toLowerCase().includes(k.toLowerCase()))).length;
                            });
                            return point;
                          });
                        })()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="period" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                          <Legend />
                          {data.analysis.resolved_issues.map((issue, idx) => (
                            <Line
                              key={idx}
                              type="monotone"
                              dataKey={issue.title}
                              stroke={[COLORS.positive, COLORS.secondary, COLORS.primary][idx % 3]}
                              strokeWidth={3}
                              dot={{ r: 4 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Pain Points Grid (Interactive) */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                      Top Pain Points (Click for details)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.analysis.pain_points?.map((point, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedPainPoint(point)}
                          className="card border-l-4 border-l-red-500 cursor-pointer hover:bg-slate-800/60 transition-colors group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-lg group-hover:text-red-400 transition-colors">{point.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${point.severity.toLowerCase().includes('high') ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                              }`}>
                              {point.severity}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm line-clamp-2">{point.description}</p>
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <MagnifyingGlassIcon className="w-4 h-4" />
                            <span>Keywords: {point.search_keywords?.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Right Column: Sidebar */}
                <div className="space-y-6">
                  {/* Sentiment Donut */}
                  <div className="card flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4 w-full">Sentiment Distribution</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Positive', value: data.stats.sentiment_counts?.positive || 0 },
                              { name: 'Neutral', value: data.stats.sentiment_counts?.neutral || 0 },
                              { name: 'Negative', value: data.stats.sentiment_counts?.negative || 0 },
                            ]}
                            cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                            paddingAngle={5} dataKey="value"
                          >
                            <Cell fill={COLORS.positive} />
                            <Cell fill={COLORS.neutral} />
                            <Cell fill={COLORS.negative} />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-xs mt-2">
                      <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-400"></div>Pos</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-slate-400"></div>Neu</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-400"></div>Neg</div>
                    </div>
                  </div>



                  {/* Download */}
                  <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                    <h3 className="text-lg font-semibold mb-2">Export Data</h3>
                    <a href={`${API_URL}/download/${data.download_token}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full glass-button bg-white text-darker hover:bg-slate-200">
                      <CloudArrowDownIcon className="w-5 h-5" /> Download Excel
                    </a>
                  </div>



                </div>
              </div>
            </motion.div>
          )}

          {/* Review Details Modal */}
          {selectedPainPoint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPainPoint(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-red-400">{selectedPainPoint.title}</h3>
                    <p className="text-slate-400 text-sm mt-1">{selectedPainPoint.description}</p>
                  </div>
                  <button onClick={() => setSelectedPainPoint(null)} className="text-slate-500 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    Found {matchingReviews.length} relevant reviews
                  </h4>
                  {matchingReviews.length > 0 ? (
                    matchingReviews.map((review, i) => (
                      <div key={i} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${review.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                              review.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>{review.sentiment}</span>
                            <span className="text-xs text-slate-400">{new Date(review.at).toLocaleDateString()}</span>
                          </div>
                          {review.app_version && <span className="text-xs text-slate-500">v{review.app_version}</span>}
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{review.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 py-8">
                      No reviews found matching keywords: <br />
                      <span className="text-slate-400 italic">{selectedPainPoint.search_keywords?.join(', ')}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

function StatsCard({ title, value, sub, icon }) {
  return (
    <div className="card flex items-center justify-between p-6">
      <div><p className="text-slate-400 text-sm font-medium mb-1">{title}</p><div className="flex items-baseline gap-1"><span className="text-3xl font-bold">{value}</span>{sub && <span className="text-slate-500 text-sm">{sub}</span>}</div></div>
      {icon && <div className="p-3 bg-slate-800 rounded-lg">{icon}</div>}
    </div>
  )
}

export default App

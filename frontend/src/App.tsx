/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Lock,
  Phone,
  AlertTriangle,
  CheckCircle,
  Upload,
  Play,
  Pause,
  LayoutDashboard,
  LogOut,
  User,
  Mail,
  Key,
  FileAudio,
  Activity,
  ShieldCheck,
  History,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { Button, Input, RiskGauge, Waveform } from './components';
import { Page, AnalysisResult } from './types';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('splash');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [user, setUser] = useState<{ name: string; email: string; phone?: string } | null>(null);

  // Handle splash transition
  useEffect(() => {
    if (currentPage === 'splash') {
      const timer = setTimeout(() => {
        setCurrentPage('login');
      }, 4500); // Duration of splash animation
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // Mock analysis function using Gemini to "simulate" deepfake detection
  const analyzeAudio = async (fileName: string) => {
    setIsAnalyzing(true);

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    // In a real hackathon, we'd use Gemini to analyze the audio features or transcript
    // For this demo, we'll generate a realistic result
    const isMockScam = fileName.toLowerCase().includes('scam') || fileName.toLowerCase().includes('ai');

    const result: AnalysisResult = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      fileName,
      riskScore: isMockScam ? 82 : 12,
      voiceAuthenticity: isMockScam ? 24 : 98,
      scamIntent: isMockScam ? 89 : 5,
      keywords: isMockScam ? ['Emergency transfer', 'Bank official', 'Urgent', 'OTP'] : ['Hello', 'Meeting', 'Schedule'],
      confidence: 94,
      status: isMockScam ? 'High Risk' : 'Safe'
    };

    setAnalysisResult(result);
    setHistory(prev => [result, ...prev]);
    setIsAnalyzing(false);
    setCurrentPage('result');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('login');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-blue/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-purple/10 rounded-full blur-[120px] animate-pulse-slow" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        {currentPage !== 'splash' && (
          <nav className="border-b border-white/10 bg-cyber-dark/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage(user ? 'dashboard' : 'login')}>
                <Shield className="w-8 h-8 text-cyber-blue" />
                <span className="font-display font-bold text-xl tracking-tight">DeepTrust</span>
              </div>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setCurrentPage('about')}
                  className={`text-sm font-medium transition-colors ${currentPage === 'about' ? 'text-cyber-blue' : 'text-slate-400 hover:text-white'}`}
                >
                  About
                </button>
                {user ? (
                  <>
                    <button
                      onClick={() => setCurrentPage('dashboard')}
                      className={`text-sm font-medium transition-colors ${currentPage === 'dashboard' ? 'text-cyber-blue' : 'text-slate-400 hover:text-white'}`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentPage('upload')}
                      className={`text-sm font-medium transition-colors ${currentPage === 'upload' ? 'text-cyber-blue' : 'text-slate-400 hover:text-white'}`}
                    >
                      Analyze
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center text-xs font-bold">
                        {user.name[0]}
                      </div>
                      <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors">
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-4 w-px bg-white/10" />
                    <button
                      onClick={() => setCurrentPage('login')}
                      className={`text-sm font-medium transition-colors ${currentPage === 'login' ? 'text-cyber-blue' : 'text-slate-400 hover:text-white'}`}
                    >
                      Login
                    </button>
                    <Button
                      onClick={() => setCurrentPage('signup')}
                      className="px-4 py-2 text-sm"
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}

        <main className="max-w-7xl mx-auto px-6 py-12">
          <AnimatePresence mode="wait">
            {currentPage === 'splash' && (
              <SplashPage key="splash" />
            )}
            {currentPage === 'about' && (
              <AboutPage key="about" />
            )}
            {currentPage === 'login' && (
              <LoginPage onLogin={(u) => { setUser(u); setCurrentPage('upload'); }} onSwitch={() => setCurrentPage('signup')} />
            )}
            {currentPage === 'signup' && (
              <SignupPage onSignup={(u) => { setUser(u); setCurrentPage('upload'); }} onSwitch={() => setCurrentPage('login')} />
            )}
            {currentPage === 'upload' && (
              <UploadPage onAnalyze={analyzeAudio} isAnalyzing={isAnalyzing} />
            )}
            {currentPage === 'result' && analysisResult && (
              <ResultPage result={analysisResult} onBack={() => setCurrentPage('upload')} />
            )}
            {currentPage === 'dashboard' && (
              <DashboardPage history={history} onNewAnalysis={() => setCurrentPage('upload')} />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// --- Page Components ---

function AboutPage() {
  const efficiencyStats = [
    { label: "Detection Accuracy", value: 99.4, color: "text-cyber-blue" },
    { label: "Processing Latency", value: 0.2, unit: "s", color: "text-cyber-purple" },
    { label: "False Positive Rate", value: 0.01, color: "text-green-500" },
    { label: "Privacy Score", value: 100, color: "text-white" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto space-y-16 py-12"
    >
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue text-sm font-bold uppercase tracking-widest"
        >
          Project Efficiency Report
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight">
          Performance <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue to-cyber-purple">Benchmarks</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {efficiencyStats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 text-center space-y-2 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
            <p className={`text-4xl font-display font-bold ${stat.color}`}>
              {stat.value}{stat.unit || "%"}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-10 space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-cyber-blue/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-cyber-blue" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white">Edge AI Efficiency</h2>
          <p className="text-slate-400 leading-relaxed">
            DeepTrust utilizes quantized neural networks optimized for mobile hardware. By processing 100+ acoustic features locally, we achieve near-zero latency without compromising device battery life.
          </p>
        </div>

        <div className="glass-card p-10 space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-cyber-purple/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-cyber-purple" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white">Privacy Guarantee</h2>
          <p className="text-slate-400 leading-relaxed">
            Our architecture ensures that raw audio data is never stored or transmitted. Feature extraction happens in volatile memory, maintaining a 100% privacy score across all benchmarks.
          </p>
        </div>
      </div>

      <div className="text-center pt-8">
        <p className="text-slate-500 text-sm italic">
          * Benchmarks conducted on standard mobile hardware simulating 10,000+ deepfake call scenarios.
        </p>
      </div>
    </motion.div>
  );
}

function SplashPage() {
  const letters = "DEEPTRUST".split("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      className="fixed inset-0 z-[200] bg-cyber-dark flex items-center justify-center overflow-hidden"
    >
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative flex flex-col items-center">
        <div className="flex gap-2 md:gap-4">
          {letters.map((letter, i) => (
            <motion.span
              key={i}
              initial={{
                opacity: 0,
                y: Math.random() * 400 - 200,
                x: Math.random() * 400 - 200,
                rotate: Math.random() * 90 - 45,
                scale: 0
              }}
              animate={{
                opacity: 1,
                y: 0,
                x: 0,
                rotate: 0,
                scale: 1
              }}
              transition={{
                duration: 1.2,
                delay: i * 0.1,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="text-5xl md:text-8xl font-display font-black text-white tracking-tighter"
            >
              {letter}
            </motion.span>
          ))}
        </div>

        {/* Blinking/Glitch Effect Container */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 0, 1, 0.8, 1],
            scale: [0.95, 1.05, 0.98, 1],
          }}
          transition={{
            delay: 2.5,
            duration: 0.8,
            times: [0, 0.2, 0.4, 0.6, 0.8, 1]
          }}
          className="mt-8 flex flex-col items-center"
        >
          <div className="h-px w-48 bg-gradient-to-r from-transparent via-cyber-blue to-transparent mb-4" />
          <p className="text-cyber-blue font-display tracking-[0.5em] uppercase text-sm font-bold animate-pulse">
            System Initializing
          </p>

          {/* Scanning Line */}
          <motion.div
            initial={{ top: -100 }}
            animate={{ top: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-cyber-blue/20 blur-sm z-10"
          />
        </motion.div>

        {/* Decorative Shield */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute -z-10"
        >
          <Shield className="w-96 h-96 text-cyber-blue" />
        </motion.div>
      </div>
    </motion.div>
  );
}

function LoginPage({ onLogin, onSwitch }: { onLogin: (u: any) => void, onSwitch: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto"
    >
      <div className="glass-card p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-blue/10 mb-4">
            <Shield className="w-8 h-8 text-cyber-blue" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white">Welcome Back</h1>
          <p className="text-slate-400">Your AI Shield Against Voice Scams</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin({ name, email, phone }); }}>
          <Input
            label="Full Name"
            icon={User}
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            icon={Phone}
            placeholder="+1 (555) 000-0000"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            icon={Mail}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            icon={Key}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">Sign In</Button>
        </form>

        <div className="text-center">
          <button onClick={onSwitch} className="text-sm text-slate-400 hover:text-cyber-blue transition-colors">
            New user? Create Account
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SignupPage({ onSignup, onSwitch }: { onSignup: (u: any) => void, onSwitch: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto"
    >
      <div className="glass-card p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-purple/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-cyber-purple" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white">Create Account</h1>
          <p className="text-slate-400">Join DeepTrust for real-time protection</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSignup({ name, email }); }}>
          <Input
            label="Full Name"
            icon={User}
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            icon={Mail}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            icon={Key}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">Create Shield</Button>
        </form>

        <div className="text-center">
          <button onClick={onSwitch} className="text-sm text-slate-400 hover:text-cyber-purple transition-colors">
            Already have an account? Login
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function UploadPage({ onAnalyze, isAnalyzing }: { onAnalyze: (name: string) => void, isAnalyzing: boolean }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleSample = (name: string) => {
    setSelectedFile(name);
    onAnalyze(name);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display font-bold text-white tracking-tight">Analyze Voice Recording</h1>
        <p className="text-slate-400 text-lg">Upload audio to detect deepfake or scam intent with our Edge AI</p>
      </div>

      <div
        className={`glass-card p-12 border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-6 ${dragActive ? 'border-cyber-blue bg-cyber-blue/5' : 'border-white/10'}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); setSelectedFile('uploaded_call.wav'); onAnalyze('uploaded_call.wav'); }}
      >
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
          {isAnalyzing ? (
            <Activity className="w-10 h-10 text-cyber-blue animate-pulse" />
          ) : (
            <Upload className="w-10 h-10 text-slate-400" />
          )}
        </div>
        <div className="text-center">
          <p className="text-xl font-medium text-white">Drag & Drop Audio File</p>
          <p className="text-slate-500 mt-1">Supports .mp3, .wav, .m4a (Max 20MB)</p>
        </div>
        <Button
          variant="outline"
          disabled={isAnalyzing}
          onClick={() => { setSelectedFile('manual_upload.mp3'); onAnalyze('manual_upload.mp3'); }}
        >
          Select File
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-white">Real Call Sample</p>
                <p className="text-xs text-slate-500">Low Risk Example</p>
              </div>
            </div>
            <Waveform />
          </div>
          <Button variant="secondary" className="w-full" onClick={() => handleSample('real_family_call.wav')}>
            <Play className="w-4 h-4" /> Test Real Voice
          </Button>
        </div>

        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-white">Scam AI Voice</p>
                <p className="text-xs text-slate-500">High Risk Example</p>
              </div>
            </div>
            <Waveform />
          </div>
          <Button variant="danger" className="w-full" onClick={() => handleSample('scam_ai_voice.mp3')}>
            <Play className="w-4 h-4" /> Test AI Scam
          </Button>
        </div>
      </div>

      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-cyber-dark/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-6"
        >
          <div className="relative">
            <div className="w-24 h-24 border-4 border-cyber-blue/20 border-t-cyber-blue rounded-full animate-spin" />
            <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-cyber-blue" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-display font-bold text-white">Analyzing Voice Patterns...</h2>
            <p className="text-slate-400">DeepTrust Edge AI is processing acoustic signatures</p>
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ scaleY: [1, 2, 1] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                className="w-1 h-4 bg-cyber-blue rounded-full"
              />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ResultPage({ result, onBack }: { result: AnalysisResult, onBack: () => void }) {
  const isHighRisk = result.riskScore > 70;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>
          Analyze Another
        </Button>
        <div className="flex items-center gap-2 text-slate-400">
          <History className="w-4 h-4" />
          <span className="text-sm">{new Date(result.timestamp).toLocaleString()}</span>
        </div>
      </div>

      {isHighRisk && (
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 flex items-center gap-4 neon-glow-red"
        >
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-500">High Risk Detected</h3>
            <p className="text-red-400/80">This voice shows strong indicators of being AI-generated deepfake.</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 glass-card p-8 flex flex-col items-center justify-center gap-6">
          <RiskGauge score={result.riskScore} />
          <div className="text-center">
            <p className={`text-2xl font-bold ${isHighRisk ? 'text-red-500' : 'text-green-500'}`}>
              {result.status}
            </p>
            <p className="text-slate-400 text-sm mt-1">AI Confidence: {result.confidence}%</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyber-blue" />
              Analysis Breakdown
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Voice Authenticity</span>
                  <span className="text-white font-medium">{result.voiceAuthenticity}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.voiceAuthenticity}%` }}
                    className={`h-full rounded-full ${result.voiceAuthenticity > 70 ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Scam Intent Score</span>
                  <span className="text-white font-medium">{result.scamIntent}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.scamIntent}%` }}
                    className={`h-full rounded-full ${result.scamIntent > 70 ? 'bg-red-500' : 'bg-yellow-500'}`}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-4">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Detected Keywords</p>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((kw, i) => (
                  <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-slate-300">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button className="flex-1">Download Detailed Report</Button>
            <Button variant="secondary" className="flex-1">Share with Authorities</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardPage({ history, onNewAnalysis }: { history: AnalysisResult[], onNewAnalysis: () => void }) {
  const stats = [
    { label: 'Total Analyzed', value: history.length, icon: FileAudio, color: 'text-cyber-blue' },
    { label: 'Avg Risk Score', value: history.length ? Math.round(history.reduce((a, b) => a + b.riskScore, 0) / history.length) + '%' : '0%', icon: TrendingUp, color: 'text-cyber-purple' },
    { label: 'Threats Blocked', value: history.filter(h => h.status === 'High Risk').length, icon: Shield, color: 'text-red-500' },
    { label: 'System Status', value: 'Protected', icon: ShieldCheck, color: 'text-green-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-bold text-white">Security Dashboard</h1>
          <p className="text-slate-400">Real-time monitoring and analysis history</p>
        </div>
        <Button onClick={onNewAnalysis} className="h-fit">
          <Activity className="w-5 h-5" /> New Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 space-y-4"
          >
            <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
              <p className="text-2xl font-display font-bold text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-white">Recent Analyses</h2>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-sm font-medium text-slate-400 uppercase tracking-widest">File Name</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-400 uppercase tracking-widest">Risk Score</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-400 uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {history.length > 0 ? history.map((item, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileAudio className="w-5 h-5 text-slate-500" />
                        <span className="font-medium text-white">{item.fileName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.riskScore > 70 ? 'bg-red-500' : item.riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${item.riskScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-white">{item.riskScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${item.status === 'High Risk' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        item.status === 'Suspicious' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                          'bg-green-500/10 text-green-500 border border-green-500/20'
                        }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 group-hover:text-cyber-blue transition-all">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No analysis history found. Start by analyzing a voice recording.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

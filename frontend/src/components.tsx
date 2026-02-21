import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Phone, AlertTriangle, CheckCircle, Upload, Play, Pause, LayoutDashboard, LogOut, User, Mail, Key } from 'lucide-react';

// --- Components ---

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-cyber-blue to-cyber-purple text-white hover:opacity-90 neon-glow-blue",
    secondary: "bg-white/10 text-white hover:bg-white/20",
    outline: "border border-cyber-blue text-cyber-blue hover:bg-cyber-blue/10",
    danger: "bg-red-500/20 border border-red-500/50 text-red-500 hover:bg-red-500/30 neon-glow-red"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
};

export const Input = ({ 
  label, 
  type = 'text', 
  placeholder, 
  icon: Icon,
  value,
  onChange,
  required = false
}: { 
  label: string; 
  type?: string; 
  placeholder?: string; 
  icon?: any;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-slate-400 ml-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 ${Icon ? 'pl-12' : 'px-4'} pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyber-blue transition-colors`}
      />
    </div>
  </div>
);

export const RiskGauge = ({ score }: { score: number }) => {
  const getColor = () => {
    if (score < 30) return '#22c55e'; // Green
    if (score < 70) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="45"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="8"
          className="text-white/5"
        />
        <motion.circle
          cx="50%"
          cy="50%"
          r="45"
          fill="transparent"
          stroke={getColor()}
          strokeWidth="8"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-5xl font-bold font-display"
        >
          {score}%
        </motion.span>
        <span className="text-sm text-slate-400 uppercase tracking-widest mt-1">Risk Score</span>
      </div>
    </div>
  );
};

export const Waveform = ({ active = false }: { active?: boolean }) => (
  <div className="flex items-center gap-1 h-8">
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        animate={active ? {
          height: [8, Math.random() * 24 + 8, 8],
        } : { height: 8 }}
        transition={{
          repeat: Infinity,
          duration: 0.5 + Math.random() * 0.5,
          ease: "easeInOut"
        }}
        className="w-1 bg-cyber-blue rounded-full"
      />
    ))}
  </div>
);

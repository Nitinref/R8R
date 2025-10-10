'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Card } from '@/app/components/ui/Card';
import { UserPlus, ArrowRight, Sparkles, Eye, EyeOff, Lock, Mail, User, Shield, Zap, Check, Rocket, Users, Workflow, Database } from 'lucide-react';
import { CursorGlow } from '@/app/components/cursor-glow';

export default function SignupPage() {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    // Calculate password strength
    let strength = 0;
    if (formData.password.length >= 6) strength += 25;
    if (formData.password.match(/[a-z]/) && formData.password.match(/[A-Z]/)) strength += 25;
    if (formData.password.match(/\d/)) strength += 25;
    if (formData.password.match(/[^a-zA-Z\d]/)) strength += 25;
    setPasswordStrength(strength);
  }, [formData.password]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
    } catch (error) {
      // Error is handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return 'bg-red-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Very Weak';
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  return (
    <>
      <style jsx global>{`
        @keyframes glowMove1 {
          0%, 100% { transform: translate(-100vw, -100vh) scale(0.8); opacity: 0.1; }
          50% { transform: translate(0, 0) scale(1.2); opacity: 0.2; }
        }

        @keyframes glowMove2 {
          0%, 100% { transform: translate(100vw, -50vh) scale(1); opacity: 0.15; }
          50% { transform: translate(-20vw, 20vh) scale(0.9); opacity: 0.25; }
        }

        @keyframes glowMove3 {
          0%, 100% { transform: translate(-50vw, 100vh) scale(1.1); opacity: 0.1; }
          50% { transform: translate(50vw, -50vh) scale(0.8); opacity: 0.2; }
        }

        .background-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: -1;
          pointer-events: none;
        }

        .glow-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, var(--brand-red-1), transparent 60%);
          animation: glowMove1 25s infinite alternate ease-in-out;
          top: -300px;
          left: -300px;
        }

        .glow-2 {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, var(--brand-red-2), transparent 70%);
          animation: glowMove2 30s infinite alternate-reverse ease-in-out;
          bottom: -350px;
          right: -350px;
        }

        .glow-3 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #e91e63, transparent 65%);
          animation: glowMove3 20s infinite alternate ease-in-out;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .grid-pattern {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        @keyframes checkmark {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        .checkmark-animate {
          animation: checkmark 0.3s ease-out;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .floating-element {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      <main className="relative min-h-screen overflow-hidden text-[var(--brand-contrast)] bg-[var(--brand-bg)] grid-pattern">
        {/* BACKGROUND GLOWING ELEMENTS */}
        <div className="background-glow glow-1"></div>
        <div className="background-glow glow-2"></div>
        <div className="background-glow glow-3"></div>

        {/* CENTERING GRADIENT */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle at center, var(--brand-red-1), rgba(0,0,0,0) 75%)",
          }}
          aria-hidden
        />
        
        <CursorGlow size={800} opacity={0.1} hoverOnly />

        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img src="/logos/4.png" alt="R8R logo" className="h-10 w-auto transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-[var(--brand-red-1)] rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300"></div>
              </div>
              <span className="text-xl font-bold tracking-tighter bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                R8R
              </span>
            </Link>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/60">Already have an account?</span>
              <Link
                href="/login"
                className="group relative overflow-hidden rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white/10"
              >
                <span className="relative z-10">Sign In</span>
              </Link>
            </div>
          </div>
        </header>

        {/* EXPANDED SIGNUP SECTION */}
        <section className="relative z-10 py-16">
          <div className="mx-auto max-w-6xl px-6"> {/* Changed from max-w-2xl to max-w-6xl */}
            <div className="grid xl:grid-cols-5 gap-8 items-start"> {/* Changed to 5-column grid for more width */}
              
              {/* Left Column - Benefits (Wider) */}
              <div className="xl:col-span-3 space-y-8"> {/* Increased from 2 to 3 columns */}
                <div className="text-center xl:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 mb-6">
                    <Rocket className="h-4 w-4 text-[var(--brand-red-1)]" />
                    <span className="text-sm font-medium text-white/80">Join the Future of AI Development</span>
                  </div>
                  
                  <h1 className="text-4xl xl:text-5xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent mb-4">
                    Build Amazing AI Workflows in Minutes
                  </h1>
                  <p className="text-xl text-white/70 max-w-3xl">
                    Join thousands of developers who are transforming how they build and deploy AI applications with our visual workflow platform.
                  </p>
                </div>

                {/* Enhanced Benefits Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    { 
                      icon: Workflow, 
                      title: 'Visual Workflow Editor',
                      description: 'Drag-and-drop interface to build complex RAG pipelines without coding'
                    },
                    { 
                      icon: Zap, 
                      title: 'Multi-LLM Integration',
                      description: 'Connect to OpenAI, Anthropic, Google, and other models seamlessly'
                    },
                    { 
                      icon: Shield, 
                      title: 'Enterprise Security',
                      description: 'SOC 2 compliant with end-to-end encryption and access controls'
                    },
                    { 
                      icon: Database, 
                      title: 'Unified Data Sources',
                      description: 'Connect to databases, APIs, and file storage with built-in connectors'
                    },
                    { 
                      icon: Users, 
                      title: 'Team Collaboration',
                      description: 'Real-time collaboration features for your entire development team'
                    },
                    { 
                      icon: Sparkles, 
                      title: 'One-Click Deployment',
                      description: 'Deploy production-ready APIs with automatic scaling and monitoring'
                    },
                  ].map((benefit, index) => (
                    <div 
                      key={index} 
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[var(--brand-red-1)]/30 hover:bg-white/10 hover:scale-105"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-red-1)] to-[var(--brand-red-2)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <benefit.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
                          <p className="text-sm text-white/60 leading-relaxed">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                      <div className="absolute -right-2 -top-2 w-4 h-4 bg-[var(--brand-red-1)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  ))}
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/10">
                  {[
                    { number: '15K+', label: 'Developers', icon: Users },
                    { number: '75K+', label: 'Workflows', icon: Workflow },
                    { number: '99.9%', label: 'Uptime', icon: Shield },
                    { number: '24/7', label: 'Support', icon: Zap },
                  ].map((stat, index) => (
                    <div key={index} className="text-center group">
                      <div className="flex justify-center mb-2">
                        <stat.icon className="h-6 w-6 text-[var(--brand-red-1)] group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="text-2xl font-bold text-white group-hover:text-[var(--brand-red-1)] transition-colors duration-300">
                        {stat.number}
                      </div>
                      <div className="text-sm text-white/60 group-hover:text-white/80 transition-colors duration-300">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Form (Wider) */}
              <div className="xl:col-span-2"> {/* Kept as 2 columns but now with more total space */}
                <div className="sticky top-24"> {/* Make form sticky on scroll */}
                  {/* Card Glow Effect */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                  
                  <Card className="relative backdrop-blur-sm bg-black/40 border-white/10 p-8 rounded-2xl shadow-2xl">
                    {/* Form Header */}
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent mb-2">
                        Start Building Today
                      </h2>
                      <p className="text-white/60">
                        Create your account and get instant access
                      </p>
                    </div>

                    {/* Signup Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Name Input */}
                      <div className="space-y-2">
                        <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-white/80">
                          <User className="h-4 w-4 text-[var(--brand-red-1)]" />
                          Full Name
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            autoComplete="name"
                            className="w-full bg-white/5 border-white/10 text-white placeholder-white/40 rounded-xl py-3 px-4 pr-10 focus:border-[var(--brand-red-1)] focus:ring-1 focus:ring-[var(--brand-red-1)] transition-all duration-300"
                          />
                        </div>
                        {errors.name && (
                          <p className="text-sm text-red-400 flex items-center gap-1">
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Email Input */}
                      <div className="space-y-2">
                        <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-white/80">
                          <Mail className="h-4 w-4 text-[var(--brand-red-1)]" />
                          Email Address
                        </label>
                        <div className="relative">
                          <Input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            autoComplete="email"
                            className="w-full bg-white/5 border-white/10 text-white placeholder-white/40 rounded-xl py-3 px-4 pr-10 focus:border-[var(--brand-red-1)] focus:ring-1 focus:ring-[var(--brand-red-1)] transition-all duration-300"
                          />
                        </div>
                        {errors.email && (
                          <p className="text-sm text-red-400 flex items-center gap-1">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      {/* Password Input */}
                      <div className="space-y-3">
                        <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-white/80">
                          <Lock className="h-4 w-4 text-[var(--brand-red-1)]" />
                          Password
                        </label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="w-full bg-white/5 border-white/10 text-white placeholder-white/40 rounded-xl py-3 px-4 pr-10 focus:border-[var(--brand-red-1)] focus:ring-1 focus:ring-[var(--brand-red-1)] transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors duration-200"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        
                        {/* Password Strength Meter */}
                        {formData.password && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-white/60">Password strength</span>
                              <span className={`font-medium ${
                                passwordStrength < 50 ? 'text-red-400' : 
                                passwordStrength < 75 ? 'text-yellow-400' : 'text-green-400'
                              }`}>
                                {getPasswordStrengthText()}
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                                style={{ width: `${passwordStrength}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        {errors.password && (
                          <p className="text-sm text-red-400 flex items-center gap-1">
                            {errors.password}
                          </p>
                        )}
                      </div>

                      {/* Confirm Password Input */}
                      <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium text-white/80">
                          <Lock className="h-4 w-4 text-[var(--brand-red-1)]" />
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="w-full bg-white/5 border-white/10 text-white placeholder-white/40 rounded-xl py-3 px-4 pr-10 focus:border-[var(--brand-red-1)] focus:ring-1 focus:ring-[var(--brand-red-1)] transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors duration-200"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-sm text-red-400 flex items-center gap-1">
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>

                      {/* Terms Agreement */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          required
                          className="mt-1 rounded border-white/20 bg-white/5 text-[var(--brand-red-1)] focus:ring-[var(--brand-red-1)]"
                        />
                        <label className="text-sm text-white/60">
                          I agree to the{' '}
                          <Link href="/terms" className="text-[var(--brand-red-1)] hover:text-[var(--brand-red-2)]">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link href="/privacy" className="text-[var(--brand-red-1)] hover:text-[var(--brand-red-2)]">
                            Privacy Policy
                          </Link>
                        </label>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        variant="primary"
                        className="w-full group relative overflow-hidden bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] border-0 text-white py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[var(--brand-red-1)]/30"
                        isLoading={isLoading}
                      >
                        <UserPlus className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-red-2)] to-[var(--brand-red-1)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-black/40 text-white/40">Or sign up with</span>
                      </div>
                    </div>

                    {/* Social Signup */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:scale-105"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:scale-105"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                        </svg>
                        Twitter
                      </button>
                    </div>

                    {/* Sign In Link */}
                    <div className="mt-6 text-center">
                      <p className="text-white/60">
                        Already have an account?{' '}
                        <Link 
                          href="/login" 
                          className="text-[var(--brand-red-1)] hover:text-[var(--brand-red-2)] font-semibold transition-colors duration-200 group"
                        >
                          Sign in now
                          <ArrowRight className="w-4 h-4 inline ml-1 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative z-10 border-t border-white/10 py-8 mt-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2">
                  <img src="/logos/4.png" alt="R8R logo" className="h-6 w-auto" />
                  <span className="font-bold text-white">R8R</span>
                </Link>
                <p className="text-sm text-white/50">
                  Powering the future of AI workflows
                </p>
              </div>

              <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/50">
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
                <Link href="/support" className="hover:text-white transition-colors">
                  Support
                </Link>
              </nav>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
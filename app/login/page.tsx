'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Card } from '@/app/components/ui/Card';
import { LogIn, ArrowRight, Sparkles, Eye, EyeOff, Lock, Mail, Zap, Shield } from 'lucide-react';
import { CursorGlow } from '@/app/components/cursor-glow';

export default function LoginPage() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await login(formData);
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
          background: radial-gradient(circle, #0ea5e9, transparent 60%);
          animation: glowMove1 25s infinite alternate ease-in-out;
          top: -300px;
          left: -300px;
        }

        .glow-2 {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, #06b6d4, transparent 70%);
          animation: glowMove2 30s infinite alternate-reverse ease-in-out;
          bottom: -350px;
          right: -350px;
        }

        .glow-3 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #1e40af, transparent 65%);
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
      `}</style>

      <main className="relative min-h-screen overflow-hidden text-white bg-black grid-pattern">
        {/* BACKGROUND GLOWING ELEMENTS */}
        <div className="background-glow glow-1"></div>
        <div className="background-glow glow-2"></div>
        <div className="background-glow glow-3"></div>

        {/* CENTERING GRADIENT */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle at center, #0ea5e9, rgba(0,0,0,0) 75%)",
          }}
          aria-hidden
        />
        
        <CursorGlow size={800} opacity={0.1} hoverOnly />

        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  R8R
                </span>
                <div className="absolute inset-0 bg-cyan-500 rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300"></div>
              </div>
              <Sparkles className="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/60">New to R8R?</span>
              <Link
                href="/signup"
                className="group relative overflow-hidden rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white/10"
              >
                <span className="relative z-10">Create Account</span>
              </Link>
            </div>
          </div>
        </header>

        {/* LOGIN SECTION */}
        <section className="relative z-10 py-20">
          <div className="mx-auto max-w-md px-6">
            {/* Animated Card */}
            <div className="relative">
              {/* Card Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
              
              <Card className="relative backdrop-blur-sm bg-black/40 border-white/10 p-8 rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 mb-6">
                    <Sparkles className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm font-medium text-white/80">Welcome Back</span>
                  </div>
                  
                  <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent mb-2">
                    Sign In to R8R
                  </h1>
                  <p className="text-white/60">
                    Enter your credentials to access your AI workflows
                  </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-white/80">
                      <Mail className="h-4 w-4 text-cyan-500" />
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
                        className="w-full bg-white/5 border-white/10 text-white placeholder-white/40 rounded-xl py-3 px-4 pr-10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-white/80">
                      <Lock className="h-4 w-4 text-cyan-500" />
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full bg-white/5 border-white/10 text-white placeholder-white/40 rounded-xl py-3 px-4 pr-10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-white/60">
                      <input
                        type="checkbox"
                        className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                      />
                      Remember me
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors duration-200"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-500 border-0 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30"
                    isLoading={isLoading}
                  >
                    <LogIn className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                    {isLoading ? 'Signing In...' : 'Sign In'}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-black/40 text-white/40">Or continue with</span>
                  </div>
                </div>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Sign Up Link */}
                <div className="mt-8 text-center">
                  <p className="text-white/60">
                    Don't have an account?{' '}
                    <Link 
                      href="/signup" 
                      className="text-cyan-500 hover:text-cyan-400 font-semibold transition-colors duration-200 group"
                    >
                      Sign up now
                      <ArrowRight className="w-4 h-4 inline ml-1 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </p>
                </div>
              </Card>
            </div>

            {/* Features Preview */}
            <div className="mt-12 grid grid-cols-3 gap-6 text-center">
              {[
                { label: 'Secure', icon: Shield },
                { label: 'Fast', icon: Zap },
                { label: 'Reliable', icon: Lock },
              ].map((item, index) => (
                <div key={index} className="text-white/60">
                  <item.icon className="h-5 w-5 mx-auto mb-2 text-cyan-500" />
                  <div className="text-xs font-medium">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative z-10 border-t border-white/10 py-8 mt-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    R8R
                  </span>
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
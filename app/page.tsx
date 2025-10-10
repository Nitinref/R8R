"use client";
import Link from "next/link";
import { PublicNavbar } from "./components/layout/PublicNavbar";
import {
  ArrowRight,
  Code,
  LayoutGrid,
  BarChart2,
  Share2,
  Zap,
  Maximize,
  Lightbulb,
  Settings,
  Play,
  Sparkles,
  Rocket,
  Brain,
  Workflow,
  Database,
  Shield,
  Infinity,
} from "lucide-react";
import { CursorGlow } from "./components/cursor-glow";
import { Navbar } from "./components/layout/Navbar";
import { useState, useEffect, useRef } from "react";

// Define a type for feature items for better code management
type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
};

// Enhanced feature list with gradients
const features: Feature[] = [
  {
    icon: LayoutGrid,
    title: "Visual Workflow Editor",
    description: "Drag, drop, and connect nodes on an intuitive snap-to-grid canvas. Build complex pipelines with unparalleled ease.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Zap,
    title: "Multi-LLM Integration",
    description: "Seamlessly integrate and switch between top-tier models from OpenAI, Anthropic, Google, and beyond.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: BarChart2,
    title: "Real-time Analytics & Debugging",
    description: "Gain deep insights into pipeline performance and pinpoint issues with advanced visual analytics.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Share2,
    title: "Effortless API Deployment",
    description: "Deploy your complex RAG workflow as a production-ready API endpoint with a single click.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Lightbulb,
    title: "Innovation at Speed",
    description: "Rapidly prototype, experiment, and iterate on new RAG strategies without extensive coding.",
    gradient: "from-yellow-500 to-amber-500",
  },
  {
    icon: Settings,
    title: "Fine-grained Customization",
    description: "Tailor every aspect of your workflow with custom nodes, integrations, and logic for unique solutions.",
    gradient: "from-indigo-500 to-purple-500",
  },
];

// New moving particles component
const MovingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] opacity-20"
          style={{
            width: Math.random() * 100 + 50 + 'px',
            height: Math.random() * 100 + 50 + 'px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            animation: `float${i % 3} ${15 + Math.random() * 20}s infinite ease-in-out`,
            filter: 'blur(40px)',
          }}
        />
      ))}
    </div>
  );
};

// Animated circuit lines component
const CircuitLines = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--brand-red-1)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--brand-red-2)" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M0,100 Q300,50 400,200 T800,100"
          stroke="url(#circuitGradient)"
          strokeWidth="2"
          fill="none"
          className="animate-pulse"
        />
        <path
          d="M100,0 Q200,300 500,150 T900,300"
          stroke="url(#circuitGradient)"
          strokeWidth="2"
          fill="none"
          className="animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <path
          d="M50,300 Q400,100 600,250 T1200,50"
          stroke="url(#circuitGradient)"
          strokeWidth="2"
          fill="none"
          className="animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </svg>
    </div>
  );
};

// Floating elements component
const FloatingElements = () => {
  const elements = [
    { icon: Brain, delay: 0, size: 24 },
    { icon: Workflow, delay: 1, size: 28 },
    { icon: Database, delay: 2, size: 22 },
    { icon: Shield, delay: 3, size: 26 },
    { icon: Infinity, delay: 4, size: 30 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {elements.map((Element, index) => (
        <div
          key={index}
          className="absolute text-white/10"
          style={{
            left: `${20 + (index * 15) % 60}%`,
            top: `${10 + (index * 20) % 70}%`,
            animation: `float ${15 + index * 2}s infinite ease-in-out`,
            animationDelay: `${Element.delay}s`,
          }}
        >
          <Element.icon size={Element.size} />
        </div>
      ))}
    </div>
  );
};

// Interactive Image Component with safe window access
const InteractiveImageSection = () => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Safe parallax calculations
  const parallaxX = isClient ? (mouseX / window.innerWidth - 0.5) * 30 : 0;
  const parallaxY = isClient ? (mouseY / window.innerHeight - 0.5) * 30 : 0;

  return (
    <section className="relative z-10 py-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-16 items-center">
        <div className="text-center md:text-left">
          <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">
            Visualize Intelligence in Motion
          </h2>
          <p className="mt-6 text-lg text-white/70">
            Our platform brings clarity to complex AI systems. See your multi-LLM RAG pipelines come to life, allowing for intuitive design and instant feedback.
          </p>
          
          <div className="mt-8 space-y-4">
            {[
              "Real-time pipeline visualization",
              "Interactive node debugging",
              "Performance metrics overlay",
              "Collaborative editing features"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white/80">
                <div className="w-2 h-2 bg-[var(--brand-red-1)] rounded-full animate-pulse"></div>
                {feature}
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative flex justify-center items-center py-10">
          <div 
            className="relative rounded-2xl border border-white/10 bg-black/30 p-8 backdrop-blur-sm"
            style={{
              transform: isClient ? `translate(${parallaxX * 0.5}px, ${parallaxY * 0.5}px) rotate3d(${mouseY / 100}, ${mouseX / 100}, 0, 5deg)` : 'none',
              transition: "transform 0.1s ease-out",
            }}
          >
            <img
              src="/api/placeholder/600/400"
              alt="AI workflow visualization"
              className="rounded-xl shadow-2xl border border-white/10 opacity-90 transition-opacity hover:opacity-100"
              style={{ maxWidth: "600px" }}
            />
            
            {/* Animated nodes overlay */}
            <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-[var(--brand-red-1)] rounded-full animate-pulse shadow-lg shadow-[var(--brand-red-1)]/50"></div>
            <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-[var(--brand-red-2)] rounded-full animate-pulse shadow-lg shadow-[var(--brand-red-2)]/50"></div>
            <div className="absolute bottom-1/3 left-1/3 w-5 h-5 bg-[var(--brand-red-1)] rounded-full animate-pulse shadow-lg shadow-[var(--brand-red-1)]/50"></div>
            
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[var(--brand-red-1)]/10 to-[var(--brand-red-2)]/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Demo Video Section with safe scroll access
const DemoVideoSection = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsClient(true);
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollParallax = isClient ? scrollY * 0.1 : 0;

  return (
    <section id="demo" className="relative z-10 py-16" style={{ transform: `translateY(${scrollParallax}px)` }}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">
            See It in Action
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
            Watch how easily you can build, test, and deploy complex RAG workflows
          </p>
        </div>
        
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-black/40 to-black/20 p-1 shadow-2xl shadow-black/60 ring-1 ring-[var(--brand-red-1)]/30 transition-all duration-500 hover:scale-[1.0] hover:ring-[var(--brand-red-1)]/50 backdrop-blur-sm">
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
          <video
            ref={videoRef}
            className="h-full w-full rounded-2xl object-cover relative z-10"
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/RAG_Workflow_API_Creation-zInmkL7O9vdvnTSkrUiQLtPpkFLSNN.mp4"
            autoPlay
            muted
            loop
            playsInline
            poster="/placeholder.jpg"
            aria-label="Demo: RAG Workflow API creation"
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/50 to-transparent z-20 pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
};

export default function LandingPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      <style jsx global>{`
        /* Keyframes for background glowing elements */
        @keyframes glowMove1 {
          0% {
            transform: translate(-100vw, -100vh) scale(0.8);
            opacity: 0.1;
          }
          50% {
            transform: translate(0, 0) scale(1.2);
            opacity: 0.2;
          }
          100% {
            transform: translate(100vw, 100vh) scale(0.8);
            opacity: 0.1;
          }
        }

        @keyframes glowMove2 {
          0% {
            transform: translate(100vw, -50vh) scale(1);
            opacity: 0.15;
          }
          50% {
            transform: translate(-20vw, 20vh) scale(0.9);
            opacity: 0.25;
          }
          100% {
            transform: translate(-100vw, 100vh) scale(1);
            opacity: 0.15;
          }
        }

        @keyframes glowMove3 {
          0% {
            transform: translate(-50vw, 100vh) scale(1.1);
            opacity: 0.1;
          }
          50% {
            transform: translate(50vw, -50vh) scale(0.8);
            opacity: 0.2;
          }
          100% {
            transform: translate(-50vw, -100vh) scale(1.1);
            opacity: 0.1;
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        @keyframes float0 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(100px, -50px) scale(1.1); }
        }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-80px, 60px) scale(0.9); }
        }

        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(120px, 30px) scale(1.2); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
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

        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, var(--brand-red-1) 50%, #fff 100%);
          background-size: 1000px 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s infinite linear;
        }

        .grid-pattern {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      <main className="relative min-h-screen overflow-hidden text-[var(--brand-contrast)] bg-[var(--brand-bg)] grid-pattern">
        {/* ENHANCED BACKGROUND ELEMENTS */}
        <MovingParticles />
        <CircuitLines />
        <FloatingElements />
        
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
        
        {isClient && <CursorGlow size={1000} opacity={0.15} hoverOnly />}

        {/* ENHANCED HEADER */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-300 hover:bg-black/50">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img src="/logos/2.png" alt="R8R logo" className="h-24 w-auto transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-[var(--brand-red-1)] rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300"></div>
              </div>
              <span className="text-xl font-bold tracking-tighter bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                
              </span>
              <Sparkles className="h-4 w-4 text-[var(--brand-red-1)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            
            <PublicNavbar />
            
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-6 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] px-6 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[var(--brand-red-1)]/30"
              >
                <span className="relative z-10">Get Started</span>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-red-2)] to-[var(--brand-red-1)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          </div>
        </header>

        {/* ENHANCED HERO SECTION */}
        <section className="relative z-10 pt-28 pb-20 md:pt-36 md:pb-28">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 mb-8">
              <Rocket className="h-4 w-4 text-[var(--brand-red-1)]" />
              <span className="text-sm font-medium text-white/80">Next Generation RAG Platform Released</span>
              <div className="h-1 w-1 rounded-full bg-[var(--brand-red-1)] animate-pulse"></div>
            </div>
            
            <h1 className="text-balance bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-5xl font-extrabold tracking-tighter text-transparent sm:text-6xl md:text-8xl lg:text-9xl">
              Ignite Your
              <span className="shimmer-text block">AI Workflows</span>
            </h1>
            
            <p className="mt-8 text-balance text-xl leading-relaxed text-white/70 md:text-2xl max-w-3xl mx-auto">
              Go from conceptualization to a robust, production-ready RAG API in minutes with our intuitive, 
              <span className="text-transparent bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] bg-clip-text font-semibold"> zero-friction visual editor</span>.
            </p>
            
            <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                className="group relative overflow-hidden inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] px-10 py-5 font-bold text-white transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl hover:shadow-[var(--brand-red-1)]/40 transform"
              >
                <Sparkles className="h-5 w-5" />
                Start Building for Free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-red-2)] to-[var(--brand-red-1)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              
              <Link
                href="#demo"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-10 py-5 font-semibold text-white/90 transition-all duration-300 ease-in-out hover:bg-white/10 hover:scale-105 backdrop-blur-sm"
              >
                <Play className="h-5 w-5" />
                Watch Demo
              </Link>
            </div>

            {/* Stats Section */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              {[
                { number: "10x", label: "Faster Development" },
                { number: "99.9%", label: "Uptime" },
                { number: "5min", label: "Setup Time" },
                { number: "24/7", label: "Support" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">{stat.number}</div>
                  <div className="text-sm text-white/60 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEMO VIDEO SECTION */}
        <DemoVideoSection />

        {/* INTERACTIVE IMAGE SECTION */}
        <InteractiveImageSection />

        {/* REST OF THE COMPONENTS REMAIN THE SAME */}
        {/* TRUSTED BY SECTION */}
        <section className="relative z-10 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <h3 className="text-center text-sm font-semibold uppercase tracking-widest text-white/50 mb-12">
              Trusted by innovative teams worldwide
            </h3>
            <div className="relative">
              <div className="flex animate-marquee space-x-16 whitespace-nowrap">
                {["Acme Corp", "Globex Inc.", "Cyberdyne", "OmniCorp", "Stark Industries", "Wayne Enterprises", "Umbrella Corp", "Oscorp"].map((company, index) => (
                  <div key={index} className="flex items-center space-x-3 text-white/70 hover:text-white transition-colors duration-300">
                    <div className="w-2 h-2 bg-[var(--brand-red-1)] rounded-full"></div>
                    <span className="text-xl font-semibold">{company}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="relative z-10 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">
                Powering the Next Generation of AI
              </h2>
              <p className="mx-auto mt-6 max-w-3xl text-lg text-white/70">
                A comprehensive suite of tools designed for the modern AI developer, from visual orchestration to one-click deployment.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-8 shadow-2xl shadow-black/20 transition-all duration-500 hover:scale-105 hover:border-[var(--brand-red-2)]/40 backdrop-blur-sm"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  <div className="relative z-10">
                    <div className={`mb-5 inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-2 shadow-lg`}>
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-base text-white/70">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Animated border effect */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10">
                    <div className="absolute inset-[2px] rounded-3xl bg-[var(--brand-bg)]"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section className="relative z-10 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">
                Loved by Developers
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  quote: "R8R transformed how we build AI products. What used to take weeks now takes hours.",
                  author: "Sarah Chen",
                  role: "AI Lead at TechCorp"
                },
                {
                  quote: "The visual editor is a game-changer. Our team's productivity increased 5x overnight.",
                  author: "Marcus Johnson",
                  role: "CTO at StartupAI"
                },
                {
                  quote: "Finally, a platform that makes complex RAG workflows accessible to everyone.",
                  author: "Dr. Emily Rodriguez",
                  role: "Research Director at University AI Lab"
                }
              ].map((testimonial, index) => (
                <div key={index} className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                  <div className="text-4xl text-[var(--brand-red-1)] mb-4">"</div>
                  <p className="text-white/80 text-lg mb-6">{testimonial.quote}</p>
                  <div>
                    <div className="font-semibold text-white">{testimonial.author}</div>
                    <div className="text-sm text-white/60">{testimonial.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="relative z-10 py-24">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <div className="relative">
              <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">
                Ready to Transform Your AI Development?
              </h2>
              <p className="mx-auto mt-6 max-w-3xl text-xl text-white/70">
                Join thousands of developers building the future of AI with R8R. Start free today with no credit card required.
              </p>
              
              <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center">
                <Link
                  href="/signup"
                  className="group relative overflow-hidden inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] px-12 py-6 text-lg font-bold text-white shadow-2xl shadow-[var(--brand-red-1)]/30 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-[var(--brand-red-2)]/50"
                >
                  <Rocket className="h-6 w-6" />
                  Get Started for Free
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-2" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-red-2)] to-[var(--brand-red-1)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                
                <Link
                  href="/demo"
                  className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-12 py-6 text-lg font-semibold text-white/90 transition-all duration-300 ease-in-out hover:bg-white/10 hover:scale-105 backdrop-blur-sm"
                >
                  <Play className="h-6 w-6" />
                  Book a Demo
                </Link>
              </div>
              
              <div className="mt-8 text-sm text-white/50">
                No credit card required • Free forever plan • 24/7 support
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-lg">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
              <div className="flex flex-col items-center lg:items-start gap-4 text-center lg:text-left">
                <Link href="/" className="flex items-center gap-3 group">
                  <img src="/logos/4.png" alt="R8R logo" className="h-8 w-auto transition-transform group-hover:scale-110" />
                  <span className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">R8R</span>
                </Link>
                <p className="text-sm text-white/50 max-w-md">
                  Building the future of AI workflow development with cutting-edge visual tools and seamless integration.
                </p>
                <div className="flex gap-4">
                  {["Twitter", "GitHub", "LinkedIn", "Discord"].map((social) => (
                    <a key={social} href="#" className="text-white/50 hover:text-[var(--brand-red-1)] transition-colors duration-200">
                      {social}
                    </a>
                  ))}
                </div>
              </div>

              <nav className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center lg:text-left">
                <div>
                  <h4 className="font-semibold text-white mb-4">Product</h4>
                  <div className="space-y-2 text-sm text-white/50">
                    <Link href="/features" className="block hover:text-white transition-colors">Features</Link>
                    <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                    <Link href="/use-cases" className="block hover:text-white transition-colors">Use Cases</Link>
                    <Link href="/integrations" className="block hover:text-white transition-colors">Integrations</Link>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-4">Resources</h4>
                  <div className="space-y-2 text-sm text-white/50">
                    <Link href="/docs" className="block hover:text-white transition-colors">Documentation</Link>
                    <Link href="/blog" className="block hover:text-white transition-colors">Blog</Link>
                    <Link href="/tutorials" className="block hover:text-white transition-colors">Tutorials</Link>
                    <Link href="/community" className="block hover:text-white transition-colors">Community</Link>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-4">Company</h4>
                  <div className="space-y-2 text-sm text-white/50">
                    <Link href="/about" className="block hover:text-white transition-colors">About</Link>
                    <Link href="/careers" className="block hover:text-white transition-colors">Careers</Link>
                    <Link href="/contact" className="block hover:text-white transition-colors">Contact</Link>
                    <Link href="/privacy" className="block hover:text-white transition-colors">Privacy</Link>
                  </div>
                </div>
              </nav>
            </div>
            
            <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/40">
              <p>&copy; {new Date().getFullYear()} R8R Labs, Inc. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
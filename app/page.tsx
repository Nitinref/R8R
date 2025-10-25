"use client"
import Link from "next/link"
import React from "react"

import {
  ArrowRight,
  LayoutGrid,
  BarChart2,
  Share2,
  Zap,
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
  Star,
  Users,
  Cpu,
  GitBranch,
  Cloud,
  Clock,
  ShieldCheck,
  Scale,
  Crown,
  BadgeCheck,
  Heart,
  Moon,
  Sun,
} from "lucide-react"
import { CursorGlow } from "./components/cursor-glow"
import { useState, useEffect, useRef } from "react"

type Feature = {
  icon: React.ElementType
  title: string
  description: string
  gradient: string
  darkGradient?: string
  highlights?: string[]
}

type Testimonial = {
  quote: string
  author: string
  role: string
  company?: string
  avatar?: string
  rating: number
}

const features: Feature[] = [
  {
    icon: LayoutGrid,
    title: "Visual Workflow Editor",
    description:
      "Drag, drop, and connect nodes on an intuitive snap-to-grid canvas. Build complex pipelines with unparalleled ease.",
    gradient: "from-blue-400 to-cyan-400",
    darkGradient: "from-blue-600 to-cyan-600",
    highlights: ["Drag & Drop Interface", "Real-time Collaboration", "Version Control"],
  },
  {
    icon: Zap,
    title: "Multi-LLM Integration",
    description: "Seamlessly integrate and switch between top-tier models from OpenAI, Anthropic, Google, and beyond.",
    gradient: "from-blue-500 to-indigo-500",
    darkGradient: "from-blue-600 to-indigo-600",
    highlights: ["20+ Model Providers", "Automatic Fallback", "Cost Optimization"],
  },
  {
    icon: BarChart2,
    title: "Real-time Analytics & Debugging",
    description: "Gain deep insights into pipeline performance and pinpoint issues with advanced visual analytics.",
    gradient: "from-cyan-400 to-blue-400",
    darkGradient: "from-cyan-600 to-blue-600",
    highlights: ["Live Metrics", "Error Tracking", "Performance Insights"],
  },
  {
    icon: Share2,
    title: "Effortless API Deployment",
    description: "Deploy your complex RAG workflow as a production-ready API endpoint with a single click.",
    gradient: "from-blue-600 to-indigo-600",
    darkGradient: "from-blue-700 to-indigo-700",
    highlights: ["One-click Deploy", "Auto-scaling", "Global CDN"],
  },
  {
    icon: Lightbulb,
    title: "Innovation at Speed",
    description: "Rapidly prototype, experiment, and iterate on new RAG strategies without extensive coding.",
    gradient: "from-cyan-500 to-blue-500",
    darkGradient: "from-cyan-600 to-blue-600",
    highlights: ["Rapid Prototyping", "A/B Testing", "Template Library"],
  },
  {
    icon: Settings,
    title: "Fine-grained Customization",
    description:
      "Tailor every aspect of your workflow with custom nodes, integrations, and logic for unique solutions.",
    gradient: "from-indigo-500 to-blue-500",
    darkGradient: "from-indigo-600 to-blue-600",
    highlights: ["Custom Nodes", "API Integrations", "Plugin System"],
  },
]

const advancedFeatures = [
  {
    icon: GitBranch,
    title: "Version Control",
    description: "Track changes, rollback updates, and maintain multiple versions of your workflows.",
    color: "text-cyan-400",
    darkColor: "text-cyan-600",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description: "SOC 2 compliant with end-to-end encryption and role-based access control.",
    color: "text-blue-400",
    darkColor: "text-blue-600",
  },
  {
    icon: Scale,
    title: "Auto-scaling",
    description: "Automatically scale your workflows based on demand with zero configuration.",
    color: "text-indigo-400",
    darkColor: "text-indigo-600",
  },
  {
    icon: Cloud,
    title: "Multi-cloud Deployment",
    description: "Deploy across AWS, GCP, and Azure with unified management and monitoring.",
    color: "text-blue-300",
    darkColor: "text-blue-500",
  },
]

const testimonials: Testimonial[] = [
  {
    quote:
      "R8R transformed how we build AI products. What used to take weeks now takes hours. The visual editor is incredibly intuitive.",
    author: "Sarah Chen",
    role: "AI Lead",
    company: "TechCorp",
    avatar: "/professional-woman-avatar.jpg",
    rating: 5,
  },
  {
    quote:
      "The platform's performance monitoring alone saved us countless hours of debugging. Our team's productivity increased 5x overnight.",
    author: "Marcus Johnson",
    role: "CTO",
    company: "StartupAI",
    avatar: "/professional-man-avatar.jpg",
    rating: 5,
  },
  {
    quote:
      "Finally, a platform that makes complex RAG workflows accessible to everyone. The multi-LLM support is game-changing for research.",
    author: "Dr. Emily Rodriguez",
    role: "Research Director",
    company: "University AI Lab",
    avatar: "/professional-woman-scientist-avatar.jpg",
    rating: 5,
  },
]

// Theme Context and Hook
const ThemeContext = React.createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}>({
  theme: 'dark',
  toggleTheme: () => {},
});

const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (systemPrefersDark) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-black">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`min-h-screen transition-colors duration-300 ${
        theme === 'dark' ? 'dark bg-black' : 'bg-white'
      }`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 group"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-5 h-5">
        <Sun className={`w-5 h-5 text-yellow-500 transition-all duration-300 absolute ${
          theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'
        }`} />
        <Moon className={`w-5 h-5 text-blue-400 transition-all duration-300 absolute ${
          theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
        }`} />
      </div>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10" />
    </button>
  );
};

const MovingParticles = () => {
  const { theme } = useTheme();
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(25)].map((_, i) => (
        <div
          key={i}
          className={`absolute rounded-full opacity-20 animate-float ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
              : 'bg-gradient-to-r from-blue-200 to-cyan-200'
          }`}
          style={{
            width: Math.random() * 120 + 30 + "px",
            height: Math.random() * 120 + 30 + "px",
            top: Math.random() * 100 + "%",
            left: Math.random() * 100 + "%",
            animationDelay: `${Math.random() * 20}s`,
            animationDuration: `${20 + Math.random() * 20}s`,
            filter: "blur(40px)",
          }}
        />
      ))}
    </div>
  )
}

const CircuitLines = () => {
  const { theme } = useTheme();
  
  const paths = [
    "M0,100 Q300,50 400,200 T800,100 T1200,300",
    "M100,0 Q200,300 500,150 T900,300 T1400,100",
    "M50,300 Q400,100 600,250 T1200,50 T1600,200",
    "M200,400 Q500,50 800,400 T1100,100 T1400,400",
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={theme === 'dark' ? "0.6" : "0.3"} />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity={theme === 'dark' ? "0.4" : "0.2"} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={theme === 'dark' ? "0.2" : "0.1"} />
          </linearGradient>
          <linearGradient id="circuitGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e40af" stopOpacity={theme === 'dark' ? "0.4" : "0.2"} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={theme === 'dark' ? "0.2" : "0.1"} />
          </linearGradient>
        </defs>
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={`url(#${i % 2 === 0 ? "circuitGradient" : "circuitGradient2"})`}
            strokeWidth="1.5"
            fill="none"
            className="animate-dash"
            style={{
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </svg>
    </div>
  )
}

const FloatingElements = () => {
  const { theme } = useTheme();
  
  const elements = [
    { icon: Brain, delay: 0, size: 24, color: "text-blue-500", darkColor: "text-blue-600" },
    { icon: Workflow, delay: 1, size: 28, color: "text-cyan-500", darkColor: "text-cyan-600" },
    { icon: Database, delay: 2, size: 22, color: "text-indigo-500", darkColor: "text-indigo-600" },
    { icon: Shield, delay: 3, size: 26, color: "text-blue-400", darkColor: "text-blue-600" },
    { icon: Infinity, delay: 4, size: 30, color: "text-cyan-400", darkColor: "text-cyan-600" },
    { icon: Cpu, delay: 5, size: 20, color: "text-blue-600", darkColor: "text-blue-700" },
    { icon: GitBranch, delay: 6, size: 25, color: "text-indigo-400", darkColor: "text-indigo-600" },
    { icon: Cloud, delay: 7, size: 23, color: "text-cyan-300", darkColor: "text-cyan-500" },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {elements.map((Element, index) => (
        <div
          key={index}
          className={`absolute opacity-20 animate-float-slow ${
            theme === 'dark' ? Element.darkColor : Element.color
          }`}
          style={{
            left: `${15 + ((index * 12) % 70)}%`,
            top: `${5 + ((index * 18) % 80)}%`,
            animationDelay: `${Element.delay}s`,
            animationDuration: `${20 + index * 3}s`,
          }}
        >
          <Element.icon size={Element.size} />
        </div>
      ))}
    </div>
  )
}

const AnimatedBackground = () => {
  const { theme } = useTheme();
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={`absolute inset-0 grid-pattern opacity-30 ${
        theme === 'dark' ? 'opacity-30' : 'opacity-10'
      }`}></div>

      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 animate-pulse-slow blur-3xl ${
        theme === 'dark' ? 'bg-blue-500' : 'bg-blue-200'
      }`}></div>
      <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 animate-pulse-slow blur-3xl ${
        theme === 'dark' ? 'bg-cyan-500' : 'bg-cyan-200'
      }`}></div>
      <div className={`absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-10 animate-pulse-slow blur-3xl ${
        theme === 'dark' ? 'bg-indigo-500' : 'bg-indigo-200'
      }`}></div>

      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className={`absolute w-2 h-2 rounded-full opacity-10 animate-float ${
            theme === 'dark' ? 'bg-white' : 'bg-gray-600'
          }`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${15 + Math.random() * 20}s`,
          }}
        />
      ))}
    </div>
  )
}

const InteractiveFeatureShowcase = () => {
  const [activeFeature, setActiveFeature] = useState(0)
  const { theme } = useTheme();

  const showcaseItems = [
    {
      title: "Visual Pipeline Builder",
      description: "Create complex workflows with our intuitive drag-and-drop interface",
      image: "/visual-pipeline-builder-interface.jpg",
      color: "from-blue-500 to-cyan-500",
      darkColor: "from-blue-600 to-cyan-600",
    },
    {
      title: "Real-time Monitoring",
      description: "Monitor your AI workflows with live metrics and performance insights",
      image: "/real-time-monitoring-dashboard.jpg",
      color: "from-indigo-500 to-blue-500",
      darkColor: "from-indigo-600 to-blue-600",
    },
    {
      title: "Multi-LLM Orchestration",
      description: "Seamlessly switch between different AI models and providers",
      image: "/multi-llm-orchestration-interface.jpg",
      color: "from-cyan-500 to-blue-500",
      darkColor: "from-cyan-600 to-blue-600",
    },
  ]

  return (
    <section className="relative z-10 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-white/80 bg-clip-text text-transparent">
            See the Magic in Action
          </h2>
          <p className="mt-6 text-xl text-gray-600 dark:text-white/70 max-w-3xl mx-auto">
            Experience the power of visual AI workflow development with our interactive platform
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            {showcaseItems.map((item, index) => (
              <div
                key={index}
                className={`p-6 rounded-2xl border transition-all duration-500 cursor-pointer ${
                  activeFeature === index
                    ? `border-cyan-500/50 ${
                        theme === 'dark' 
                          ? 'bg-cyan-500/10 scale-105 shadow-2xl shadow-cyan-500/20' 
                          : 'bg-cyan-50 scale-105 shadow-2xl shadow-cyan-500/10'
                      }`
                    : `border-gray-200 dark:border-white/10 ${
                        theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-gray-50'
                      }`
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-12 rounded-full bg-gradient-to-b ${
                      theme === 'dark' ? item.darkColor : item.color
                    } ${activeFeature === index ? "animate-pulse" : ""}`}
                  ></div>
                  <div>
                    <h3 className={`text-xl font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{item.title}</h3>
                    <p className={`mt-2 ${
                      theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                    }`}>{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className={`relative rounded-3xl border ${
              theme === 'dark' 
                ? 'border-cyan-500/30 bg-black/30' 
                : 'border-cyan-300 bg-white/80'
            } p-8 backdrop-blur-xl shadow-2xl ${
              theme === 'dark' ? 'shadow-cyan-500/10' : 'shadow-cyan-500/5'
            }`}>
              <img
                src={showcaseItems[activeFeature].image || "/placeholder.svg"}
                alt={showcaseItems[activeFeature].title}
                className="rounded-2xl w-full h-96 object-cover transition-all duration-500"
              />
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${
                  // @ts-ignore
                  theme === 'dark' ? showcaseItems[activeFeature].darkColor : showcaseItems[activeFeature].color
                } opacity-10 mix-blend-overlay transition-opacity duration-500`}
              ></div>

              <div className="absolute top-4 right-4 flex gap-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  theme === 'dark' ? 'bg-cyan-400' : 'bg-cyan-500'
                }`}></div>
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'
                }`}></div>
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  theme === 'dark' ? 'bg-indigo-400' : 'bg-indigo-500'
                }`}></div>
              </div>

              <div className={`absolute bottom-4 left-4 right-4 p-4 rounded-xl backdrop-blur-sm ${
                theme === 'dark' ? 'bg-black/50' : 'bg-white/80'
              }`}>
                <h4 className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>{showcaseItems[activeFeature].title}</h4>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                }`}>{showcaseItems[activeFeature].description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const PricingSection = () => {
  const { theme } = useTheme();
  
  const plans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for individuals and small projects",
      features: ["Up to 5 workflows", "Basic visual editor", "Community support", "1GB storage", "OpenAI integration"],
      cta: "Get Started",
      popular: false,
      gradient: "from-gray-600 to-gray-800",
      darkGradient: "from-gray-400 to-gray-600",
    },
    {
      name: "Pro",
      price: "$49",
      description: "For growing teams and businesses",
      features: [
        "Unlimited workflows",
        "Advanced visual editor",
        "Priority support",
        "50GB storage",
        "All LLM providers",
        "API access",
        "Custom domains",
      ],
      cta: "Start Free Trial",
      popular: true,
      gradient: "from-blue-500 to-cyan-500",
      darkGradient: "from-blue-600 to-cyan-600",
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with custom needs",
      features: [
        "Everything in Pro",
        "Dedicated instance",
        "SLA guarantee",
        "Custom integrations",
        "On-premise deployment",
        "Dedicated support",
        "Training & onboarding",
      ],
      cta: "Contact Sales",
      popular: false,
      gradient: "from-indigo-500 to-blue-500",
      darkGradient: "from-indigo-600 to-blue-600",
    },
  ]

  return (
    <section id="pricing" className="relative z-10 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-white/80 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-6 text-xl text-gray-600 dark:text-white/70 max-w-3xl mx-auto">
            Start free and scale as you grow. No hidden fees, no surprise charges.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-3xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? `border-cyan-500 ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-b from-cyan-500/10 to-blue-500/5 shadow-2xl shadow-cyan-500/20' 
                        : 'bg-gradient-to-b from-cyan-50 to-blue-50 shadow-2xl shadow-cyan-500/10'
                    }`
                  : `border-gray-200 dark:border-white/10 ${
                      theme === 'dark' ? 'bg-white/5' : 'bg-white'
                    }`
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-8">
                <h3 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{plan.price}</span>
                  {plan.price !== "Free" && plan.price !== "Custom" && (
                    <span className={theme === 'dark' ? 'text-white/60' : 'text-gray-600'}>/month</span>
                  )}
                </div>
                <p className={`mt-2 ${
                  theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                }`}>{plan.description}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className={`flex items-center gap-3 ${
                      theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                    }`}>
                      <BadgeCheck className="w-5 h-5 text-cyan-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-8 w-full py-4 rounded-2xl font-semibold transition-all duration-300 ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/30"
                      : `${
                          theme === 'dark' 
                            ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20' 
                            : 'bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200'
                        }`
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={`text-center mt-12 ${
          theme === 'dark' ? 'text-white/60' : 'text-gray-600'
        }`}>
          <p>All plans include 14-day free trial • No credit card required • Cancel anytime</p>
        </div>
      </div>
    </section>
  )
}

const InteractiveImageSection = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const sectionRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme();

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 20
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 20
        setMousePosition({ x, y })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <section ref={sectionRef} className="relative z-10 py-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-16 items-center">
        <div className="text-center md:text-left">
          <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-white/80 bg-clip-text text-transparent">
            Visualize Intelligence in Motion
          </h2>
          <p className={`mt-6 text-lg ${
            theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          }`}>
            Our platform brings clarity to complex AI systems. See your multi-LLM RAG pipelines come to life, allowing
            for intuitive design and instant feedback.
          </p>

          <div className="mt-8 space-y-4">
            {[
              "Real-time pipeline visualization",
              "Interactive node debugging",
              "Performance metrics overlay",
              "Collaborative editing features",
            ].map((feature, index) => (
              <div key={index} className={`flex items-center gap-3 ${
                theme === 'dark' ? 'text-white/80' : 'text-gray-700'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  theme === 'dark' ? 'bg-cyan-500' : 'bg-cyan-400'
                }`}></div>
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center items-center py-10">
          <div
            className={`relative rounded-2xl border ${
              theme === 'dark' ? 'border-cyan-500/30 bg-black/30' : 'border-cyan-300 bg-white/80'
            } p-8 backdrop-blur-sm transition-transform duration-200`}
            style={{
              transform: `perspective(1000px) rotateX(${mousePosition.y * 0.5}deg) rotateY(${mousePosition.x * 0.5}deg)`,
            }}
          >
            <img
              src="/ai-workflow-visualization-dashboard.jpg"
              alt="AI workflow visualization"
              className="rounded-xl shadow-2xl border border-white/10 opacity-90 transition-opacity hover:opacity-100"
              style={{ maxWidth: "600px" }}
            />

            <div className={`absolute top-1/4 left-1/4 w-4 h-4 rounded-full animate-pulse shadow-lg ${
              theme === 'dark' ? 'bg-cyan-500 shadow-cyan-500/50' : 'bg-cyan-400 shadow-cyan-400/50'
            }`}></div>
            <div className={`absolute top-1/2 right-1/3 w-3 h-3 rounded-full animate-pulse shadow-lg ${
              theme === 'dark' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-blue-400 shadow-blue-400/50'
            }`}></div>
            <div className={`absolute bottom-1/3 left-1/3 w-5 h-5 rounded-full animate-pulse shadow-lg ${
              theme === 'dark' ? 'bg-cyan-500 shadow-cyan-500/50' : 'bg-cyan-400 shadow-cyan-400/50'
            }`}></div>

            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${
              theme === 'dark' ? 'from-cyan-500/10 to-blue-500/10' : 'from-cyan-400/10 to-blue-400/10'
            } opacity-0 hover:opacity-100 transition-opacity duration-300`}></div>
          </div>
        </div>
      </div>
    </section>
  )
}

const DemoVideoSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { theme } = useTheme();

  return (
    <section id="demo" className="relative z-10 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-white/80 bg-clip-text text-transparent">
            See It in Action
          </h2>
          <p className={`mt-4 text-lg ${
            theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          } max-w-2xl mx-auto`}>
            Watch how easily you can build, test, and deploy complex RAG workflows
          </p>
        </div>

        <div className={`relative rounded-3xl border ${
          theme === 'dark' ? 'border-white/10 bg-gradient-to-br from-black/40 to-black/20' : 'border-gray-200 bg-gradient-to-br from-white to-gray-50'
        } p-1 shadow-2xl ${
          theme === 'dark' ? 'shadow-black/60 ring-1 ring-cyan-500/30' : 'shadow-gray-200 ring-1 ring-cyan-300'
        } transition-all duration-500 hover:scale-[1.02] ${
          theme === 'dark' ? 'hover:ring-cyan-500/50' : 'hover:ring-cyan-400'
        } backdrop-blur-sm group`}>
          <div className={`absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300`}></div>
          <video
            ref={videoRef}
            className="h-full w-full rounded-2xl object-cover relative z-10"
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/RAG_Workflow_API_Creation-zInmkL7O9vdvnTSkrUiQLtPpkFLSNN.mp4"
            autoPlay
            muted
            loop
            playsInline
            poster="/demo-video-poster.jpg"
            aria-label="Demo: RAG Workflow API creation"
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/50 to-transparent z-20 pointer-events-none"></div>

          <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className={`${
              theme === 'dark' ? 'bg-white/20' : 'bg-black/20'
            } backdrop-blur-sm rounded-full p-6 border ${
              theme === 'dark' ? 'border-white/30' : 'border-gray-300'
            }`}>
              <Play className="w-12 h-12 text-white" fill="white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const NewsletterSection = () => {
  const [email, setEmail] = useState("")
  const { theme } = useTheme();

  return (
    <section className="relative z-10 py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className={`relative rounded-3xl border ${
          theme === 'dark' 
            ? 'border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5' 
            : 'border-cyan-300 bg-gradient-to-br from-cyan-50 to-blue-50'
        } p-12 backdrop-blur-sm`}>
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${
            theme === 'dark' ? 'from-cyan-500/10 to-blue-500/10' : 'from-cyan-400/10 to-blue-400/10'
          } opacity-0 hover:opacity-100 transition-opacity duration-300`}></div>

          <Heart className="w-12 h-12 text-cyan-500 mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-white/80 bg-clip-text text-transparent">
            Stay in the Loop
          </h2>
          <p className={`mt-4 text-lg ${
            theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          } max-w-2xl mx-auto`}>
            Get the latest updates on new features, tutorials, and AI workflow best practices.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`flex-1 px-4 py-3 rounded-2xl border ${
                theme === 'dark' 
                  ? 'border-cyan-500/30 bg-cyan-500/5 text-white placeholder-white/50' 
                  : 'border-cyan-300 bg-white text-gray-900 placeholder-gray-500'
              } backdrop-blur-sm focus:outline-none focus:border-cyan-500`}
            />
            <button className="px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300">
              Subscribe
            </button>
          </div>

          <p className={`mt-4 text-sm ${
            theme === 'dark' ? 'text-white/50' : 'text-gray-500'
          }`}>No spam, unsubscribe at any time. We respect your privacy.</p>
        </div>
      </div>
    </section>
  )
}

const LandingPageContent = () => {
  const [isClient, setIsClient] = useState(false)
  const { theme } = useTheme();

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <>
      <style jsx global>{`
        :root {
          --brand-bg: #0a0a0a;
          --brand-contrast: #ffffff;
        }

        .dark {
          --brand-bg: #0a0a0a;
          --brand-contrast: #ffffff;
        }

        .light {
          --brand-bg: #ffffff;
          --brand-contrast: #0a0a0a;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33% { transform: translateY(-15px) translateX(10px) rotate(3deg); }
          66% { transform: translateY(10px) translateX(-10px) rotate(-3deg); }
        }

        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.05); }
        }

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

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }

        .animate-dash {
          stroke-dasharray: 10;
          animation: dash 60s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
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
          background: radial-gradient(circle, #0284c7, transparent 65%);
          animation: glowMove3 20s infinite alternate ease-in-out;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .shimmer-text {
          background: linear-gradient(90deg, #0ea5e9 0%, #06b6d4 50%, #0ea5e9 100%);
          background-size: 1000px 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s infinite linear;
        }

        .grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .dark .grid-pattern {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        }
      `}</style>

      <main className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${
        theme === 'dark' ? 'text-white bg-black' : 'text-gray-900 bg-white'
      }`}>
        <AnimatedBackground />
        <MovingParticles />
        <CircuitLines />
        <FloatingElements />

        {theme === 'dark' && (
          <>
            <div className="background-glow glow-1"></div>
            <div className="background-glow glow-2"></div>
            <div className="background-glow glow-3"></div>
          </>
        )}

        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background: theme === 'dark' 
              ? "radial-gradient(circle at center, #0ea5e9, rgba(0,0,0,0) 75%)"
              : "radial-gradient(circle at center, #bae6fd, rgba(255,255,255,0) 75%)",
          }}
          aria-hidden
        />

        {isClient && theme === 'dark' && <CursorGlow size={1000} opacity={0.15} hoverOnly />}

        <header className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${
          theme === 'dark' 
            ? 'border-white/10 bg-black/40 hover:bg-black/50' 
            : 'border-gray-200 bg-white/80 hover:bg-white'
        }`}>
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

            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className={`transition-colors ${
                theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                Features
              </Link>
              <Link href="#pricing" className={`transition-colors ${
                theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                Pricing
              </Link>
              <Link href="#demo" className={`transition-colors ${
                theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                Demo
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                href="/login"
                className={`px-6 py-2 text-sm font-medium transition-colors duration-200 ${
                  theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30"
              >
                <span className="relative z-10">Get Started</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          </div>
        </header>

        <section className="relative z-10 pt-28 pb-20 md:pt-36 md:pb-28">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <div className={`inline-flex items-center gap-2 rounded-full border ${
              theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'
            } px-4 py-2 mb-8`}>
              <Rocket className="h-4 w-4 text-cyan-500" />
              <span className={`text-sm font-medium ${
                theme === 'dark' ? 'text-white/80' : 'text-gray-700'
              }`}>Next Generation RAG Platform Released</span>
              <div className="h-1 w-1 rounded-full bg-cyan-500 animate-pulse"></div>
            </div>

            <h1 className="text-balance bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-white dark:to-white/70 bg-clip-text text-5xl font-extrabold tracking-tighter text-transparent sm:text-6xl md:text-8xl lg:text-9xl">
              Ignite Your
              <span className="shimmer-text block">AI Workflows</span>
            </h1>

            <p className={`mt-8 text-balance text-xl leading-relaxed md:text-2xl max-w-3xl mx-auto ${
              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
            }`}>
              Go from conceptualization to a robust, production-ready RAG API in minutes with our intuitive,
              <span className="text-transparent bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text font-semibold">
                {" "}
                zero-friction visual editor
              </span>
              .
            </p>

            <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                className="group relative overflow-hidden inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-10 py-5 font-bold text-white transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/40 transform"
              >
                <Sparkles className="h-5 w-5" />
                Start Building for Free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>

              <Link
                href="#demo"
                className={`group inline-flex items-center justify-center gap-3 rounded-2xl border ${
                  theme === 'dark' 
                    ? 'border-white/20 bg-white/5 text-white/90 hover:bg-white/10' 
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                } px-10 py-5 font-semibold transition-all duration-300 ease-in-out hover:scale-105 backdrop-blur-sm`}
              >
                <Play className="h-5 w-5" />
                Watch Demo
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                { number: "10x", label: "Faster Development", icon: Zap },
                { number: "99.9%", label: "Uptime SLA", icon: ShieldCheck },
                { number: "5min", label: "Average Setup", icon: Clock },
                { number: "24/7", label: "Expert Support", icon: Users },
              ].map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 transition-colors ${
                    theme === 'dark' ? 'bg-white/5 group-hover:bg-white/10' : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <stat.icon className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div className={`text-2xl lg:text-3xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{stat.number}</div>
                  <div className={`text-sm mt-1 ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <DemoVideoSection />
        <InteractiveFeatureShowcase />
        <InteractiveImageSection />

        <section className="relative z-10 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <h3 className={`text-center text-sm font-semibold uppercase tracking-widest ${
              theme === 'dark' ? 'text-white/50' : 'text-gray-500'
            } mb-12`}>
              Trusted by innovative teams worldwide
            </h3>
            <div className="relative">
              <div className="flex animate-marquee space-x-16 whitespace-nowrap">
                {[
                  "Acme Corp",
                  "Globex Inc.",
                  "Cyberdyne",
                  "OmniCorp",
                  "Stark Industries",
                  "Wayne Enterprises",
                  "Umbrella Corp",
                  "Oscorp",
                ].map((company, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <span className="text-xl font-semibold">{company}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="relative z-10 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-white/80 bg-clip-text text-transparent">
                Powering the Next Generation of AI
              </h2>
              <p className={`mx-auto mt-6 max-w-3xl text-lg ${
                theme === 'dark' ? 'text-white/70' : 'text-gray-600'
              }`}>
                A comprehensive suite of tools designed for the modern AI developer, from visual orchestration to
                one-click deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-3xl border ${
                    theme === 'dark' 
                      ? 'border-white/10 bg-gradient-to-br from-white/5 to-white/10 shadow-2xl shadow-black/20 hover:border-cyan-500/40' 
                      : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-2xl shadow-gray-200/20 hover:border-cyan-300'
                  } p-8 transition-all duration-500 hover:scale-105 backdrop-blur-sm`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${
                      theme === 'dark' ? feature.darkGradient : feature.gradient
                    } opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                  ></div>

                  <div className="relative z-10">
                    <div
                      className={`mb-5 inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br ${
                        theme === 'dark' ? feature.darkGradient : feature.gradient
                      } p-2 shadow-lg`}
                    >
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className={`text-xl font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{feature.title}</h3>
                    <p className={`mt-3 text-base ${
                      theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                    }`}>{feature.description}</p>

                    {feature.highlights && (
                      <div className="mt-4 space-y-2">
                        {feature.highlights.map((highlight, i) => (
                          <div key={i} className={`flex items-center gap-2 text-sm ${
                            theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                          }`}>
                            <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                            {highlight}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10">
                    <div className={`absolute inset-[2px] rounded-3xl ${
                      theme === 'dark' ? 'bg-black' : 'bg-white'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {advancedFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`text-center p-6 rounded-2xl border ${
                    theme === 'dark' 
                      ? 'border-white/10 bg-white/5 hover:bg-white/10' 
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  } backdrop-blur-sm transition-all duration-300`}
                >
                  <feature.icon className={`w-8 h-8 ${
                    theme === 'dark' ? feature.darkColor : feature.color
                  } mx-auto mb-4`} />
                  <h4 className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{feature.title}</h4>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                  }`}>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />

        <section className="relative z-10 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-white/80 bg-clip-text text-transparent">
                Loved by Developers
              </h2>
              <p className={`mt-4 text-lg ${
                theme === 'dark' ? 'text-white/70' : 'text-gray-600'
              } max-w-2xl mx-auto`}>
                Join thousands of developers and teams who have transformed their AI workflow development
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`relative rounded-2xl border ${
                    theme === 'dark' 
                      ? 'border-white/10 bg-white/5 hover:bg-white/10' 
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  } p-8 backdrop-blur-sm transition-all duration-300 group`}
                >
                  <div className="absolute -top-3 -right-3 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Quote className="w-3 h-3 text-white" />
                  </div>

                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  <p className={`text-lg mb-6 ${
                    theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                  }`}>"{testimonial.quote}"</p>

                  <div className="flex items-center gap-4">
                    <img
                      src={testimonial.avatar || "/placeholder.svg"}
                      alt={testimonial.author}
                      className="w-12 h-12 rounded-full border-2 border-white/20"
                    />
                    <div>
                      <div className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>{testimonial.author}</div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                      }`}>{testimonial.role}</div>
                      <div className="text-sm text-cyan-500">{testimonial.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "10K+", label: "Active Developers" },
                { value: "50M+", label: "API Calls/Month" },
                { value: "99.9%", label: "Uptime" },
                { value: "4.9/5", label: "Customer Rating" },
              ].map((metric, index) => (
                <div key={index} className={`p-6 rounded-2xl border ${
                  theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                } backdrop-blur-sm`}>
                  <div className={`text-2xl md:text-3xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{metric.value}</div>
                  <div className={`mt-2 ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <NewsletterSection />

        <section className="relative z-10 py-24">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <div className="relative">
              <h2 className="text-4xl font-bold tracking-tighter md:text-6xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-white/80 bg-clip-text text-transparent">
                Ready to Transform Your AI Development?
              </h2>
              <p className={`mx-auto mt-6 max-w-3xl text-xl ${
                theme === 'dark' ? 'text-white/70' : 'text-gray-600'
              }`}>
                Join thousands of developers building the future of AI with R8R. Start free today with no credit card
                required.
              </p>

              <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center">
                <Link
                  href="/signup"
                  className="group relative overflow-hidden inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-12 py-6 text-lg font-bold text-white shadow-2xl shadow-cyan-500/30 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-blue-500/50"
                >
                  <Rocket className="h-6 w-6" />
                  Get Started for Free
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-2" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>

                <Link
                  href="/demo"
                  className={`group inline-flex items-center justify-center gap-3 rounded-2xl border ${
                    theme === 'dark' 
                      ? 'border-white/20 bg-white/5 text-white/90 hover:bg-white/10' 
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  } px-12 py-6 text-lg font-semibold transition-all duration-300 ease-in-out hover:scale-105 backdrop-blur-sm`}
                >
                  <Play className="h-6 w-6" />
                  Book a Demo
                </Link>
              </div>

              <div className={`mt-8 text-sm ${
                theme === 'dark' ? 'text-white/50' : 'text-gray-500'
              }`}>
                No credit card required • Free forever plan • 24/7 support
              </div>
            </div>
          </div>
        </section>

        <footer className={`relative z-10 border-t ${
          theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'
        } backdrop-blur-lg`}>
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
              <div className="flex flex-col items-start gap-4 max-w-sm">
                <Link href="/" className="flex items-center gap-3 group">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    R8R
                  </span>
                </Link>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/50' : 'text-gray-600'
                }`}>
                  Building the future of AI workflow development with cutting-edge visual tools and seamless
                  integration.
                </p>
                <div className="flex gap-4">
                  {[
                    { name: "Twitter", icon: "𝕏", url: "#" },
                    { name: "GitHub", icon: "⚙️", url: "#" },
                    { name: "LinkedIn", icon: "💼", url: "#" },
                    { name: "Discord", icon: "💬", url: "#" },
                  ].map((social) => (
                    <a
                      key={social.name}
                      href={social.url}
                      className={`transition-colors duration-200 text-lg ${
                        theme === 'dark' ? 'text-white/50 hover:text-cyan-500' : 'text-gray-500 hover:text-cyan-600'
                      }`}
                      title={social.name}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>

              <nav className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
                <div>
                  <h4 className={`font-semibold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Product</h4>
                  <div className={`space-y-2 text-sm ${
                    theme === 'dark' ? 'text-white/50' : 'text-gray-600'
                  }`}>
                    <Link href="/features" className="block hover:text-cyan-500 transition-colors">
                      Features
                    </Link>
                    <Link href="/pricing" className="block hover:text-cyan-500 transition-colors">
                      Pricing
                    </Link>
                    <Link href="/use-cases" className="block hover:text-cyan-500 transition-colors">
                      Use Cases
                    </Link>
                    <Link href="/integrations" className="block hover:text-cyan-500 transition-colors">
                      Integrations
                    </Link>
                  </div>
                </div>

                <div>
                  <h4 className={`font-semibold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Resources</h4>
                  <div className={`space-y-2 text-sm ${
                    theme === 'dark' ? 'text-white/50' : 'text-gray-600'
                  }`}>
                    <Link href="/docs" className="block hover:text-cyan-500 transition-colors">
                      Documentation
                    </Link>
                    <Link href="/blog" className="block hover:text-cyan-500 transition-colors">
                      Blog
                    </Link>
                    <Link href="/tutorials" className="block hover:text-cyan-500 transition-colors">
                      Tutorials
                    </Link>
                    <Link href="/community" className="block hover:text-cyan-500 transition-colors">
                      Community
                    </Link>
                  </div>
                </div>

                <div>
                  <h4 className={`font-semibold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Company</h4>
                  <div className={`space-y-2 text-sm ${
                    theme === 'dark' ? 'text-white/50' : 'text-gray-600'
                  }`}>
                    <Link href="/about" className="block hover:text-cyan-500 transition-colors">
                      About
                    </Link>
                    <Link href="/careers" className="block hover:text-cyan-500 transition-colors">
                      Careers
                    </Link>
                    <Link href="/contact" className="block hover:text-cyan-500 transition-colors">
                      Contact
                    </Link>
                    <Link href="/privacy" className="block hover:text-cyan-500 transition-colors">
                      Privacy
                    </Link>
                  </div>
                </div>

                <div>
                  <h4 className={`font-semibold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Support</h4>
                  <div className={`space-y-2 text-sm ${
                    theme === 'dark' ? 'text-white/50' : 'text-gray-600'
                  }`}>
                    <Link href="/help" className="block hover:text-cyan-500 transition-colors">
                      Help Center
                    </Link>
                    <Link href="/status" className="block hover:text-cyan-500 transition-colors">
                      System Status
                    </Link>
                    <Link href="/contact" className="block hover:text-cyan-500 transition-colors">
                      Contact Support
                    </Link>
                    <Link href="/feedback" className="block hover:text-cyan-500 transition-colors">
                      Feedback
                    </Link>
                  </div>
                </div>
              </nav>
            </div>

            <div className={`mt-12 border-t ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            } pt-8 text-center text-sm ${
              theme === 'dark' ? 'text-white/40' : 'text-gray-500'
            }`}>
              <p>&copy; {new Date().getFullYear()} R8R Labs, Inc. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}

export default function LandingPage() {
  return (
    <ThemeProvider>
      <LandingPageContent />
    </ThemeProvider>
  )
}

const Quote = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
  </svg>
)
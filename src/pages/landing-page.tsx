import { useEffect, useRef, useState } from "react";
import { 
  ShieldCheck, 
  TrendingUp, 
  Building2, 
  Zap, 
  MessageCircle,
  Search,
  History as HistoryIcon,
  CheckCircle2,
  BarChart3
} from "lucide-react";
import { motion, useMotionValue, useTransform, animate, useSpring } from "framer-motion";
import Lenis from "lenis";
import logo from "@assets/logo_1775622739371.png";

const WA = "https://wa.me/5500000000000?text=Olá!%20Gostaria%20de%20uma%20análise%20gratuita%20do%20meu%20crédito.";

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

/* ─── Hooks ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(target: number, duration = 1600, inView = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const interval = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(interval); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(interval);
  }, [inView, target, duration]);
  return count;
}

/* ─── Speedometer SVG ─── */
function Speedometer({ size = 220, dashboardVisible = false }: { size?: number, dashboardVisible?: boolean }) {
  // cx, cy is the logical center-pivot. It's placed at 60% down.
  // The SVG height is size*0.82 so we show the arc + ticks but cut below center.
  const cx = size / 2;
  const cy = size * 0.60;
  const r  = size * 0.40;

  // Convert angle (0°=top, clockwise) to SVG x,y
  function polarPoint(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  // Arc from -135° to +135° (270° sweep, gap at bottom)
  const arcFrom = -135, arcTo = 135;
  const arcSpan = arcTo - arcFrom; // 270

  function describeArc(from: number, to: number, ri: number) {
    const s = polarPoint(from, ri), e = polarPoint(to, ri);
    const large = to - from > 180 ? 1 : 0;
    return `M${s.x},${s.y} A${ri},${ri},0,${large},1,${e.x},${e.y}`;
  }

  const scoreValue = useMotionValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  // Sync the raw motion value to the displayed state for the text
  useEffect(() => {
    return scoreValue.on("change", (v) => setDisplayScore(Math.floor(v)));
  }, [scoreValue]);

  useEffect(() => {
    if (!dashboardVisible) return;

    // Stage 1: Jump to 850 with a strong overshoot and a small delay for visibility
    const controls = animate(scoreValue, 850, {
      type: "spring",
      stiffness: 70,
      damping: 14,
      mass: 1.2,
      delay: 0.6, // Wait for container to settle
      onComplete: () => {
        // Stage 2: Passive fluctuation
        const interval = setInterval(() => {
          const nextVal = 850 + Math.floor(Math.random() * 151);
          animate(scoreValue, nextVal, {
            duration: 2.5,
            ease: "easeInOut"
          });
        }, 5000);
        return () => clearInterval(interval);
      }
    });

    return () => controls.stop();
  }, [dashboardVisible, scoreValue]);

  // Derived rotation directly from the motion value
  const needleRotation = useTransform(scoreValue, [0, 1000], [arcFrom, arcTo]);

  const strokeW = size * 0.085; // thick arc stroke

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <svg
        width={size}
        height={size * 0.95}
        viewBox={`0 0 ${size} ${size * 0.95}`}
        overflow="visible"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#FF3333" />
            <stop offset="25%"  stopColor="#FF9500" />
            <stop offset="50%"  stopColor="#FFCC00" />
            <stop offset="100%" stopColor="#34C759" />
          </linearGradient>
          
          <clipPath id="gauge-clip">
            <rect x="0" y="0" width={size} height={size * 0.82} />
          </clipPath>
        </defs>

        {/* ── Track (dim background arc) ── */}
        <path
          d={describeArc(arcFrom, arcTo, r)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* ── Colored gradient arc ── */}
        <path
          d={describeArc(arcFrom, arcTo, r)}
          fill="none"
          stroke="url(#gauge-gradient)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* ── Tick marks (outside the arc, only 7) ── */}
        {[...Array(7)].map((_, i) => {
          const pct  = i / 6;
          const angle = arcFrom + pct * arcSpan;
          const outerR = r + strokeW / 2 + size * 0.035;
          const tickLen = size * 0.015;
          const p1 = polarPoint(angle, outerR);
          const p2 = polarPoint(angle, outerR + tickLen);
          return (
            <line
              key={i}
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
              strokeLinecap="round"
            />
          );
        })}

        {/* ── Needle ── */}
        <motion.g
          style={{ 
            rotate: needleRotation,
            originX: "50%",
            originY: "50%" 
          }}
        >
          {/* Hidden circle to normalize bounding box to exactly center on cx, cy */}
          <circle cx={cx} cy={cy} r={r} fill="transparent" pointerEvents="none" />
          
          {/* Robust tapered needle body extending from circle */}
          <path
            d={`
              M ${cx - size * 0.012} ${cy - size * 0.03}
              L ${cx - size * 0.003} ${cy - r * 0.88}
              A ${size * 0.003} ${size * 0.003} 0 0 1 ${cx + size * 0.003} ${cy - r * 0.88}
              L ${cx + size * 0.012} ${cy - size * 0.03}
              Z
            `}
            fill="#ffffff"
            style={{ filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.4))" }}
          />
          {/* Base hollow circle (thicker to match) */}
          <circle 
            cx={cx} cy={cy} 
            r={size * 0.034} 
            fill="#080B1A" 
            stroke="#ffffff" 
            strokeWidth={size * 0.01} 
            style={{ filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.4))" }} 
          />
        </motion.g>

        {/* ── Score number ── */}
        <foreignObject
          x={cx - size * 0.40}
          y={cy + size * 0.08}
          width={size * 0.80}
          height={size * 0.40}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: `${size * 0.175}px`,
              color: "#ffffff",
              margin: 0,
              lineHeight: 1,
              letterSpacing: "0em",
            }}>
              {displayScore}
            </p>
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: `${size * 0.045}px`,
              color: "rgba(255,255,255,0.3)",
              margin: `${size * 0.014}px 0 0`,
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}>/1000 SCORE</p>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}


function Counter({ initialValue, peakValue }: { initialValue: number, peakValue: number }) {
  const { ref, inView } = useInView();
  const baseCount = useCounter(initialValue, 2000, inView);
  const [displayCount, setDisplayCount] = useState(0);
  const [hasHitInitial, setHasHitInitial] = useState(false);

  useEffect(() => {
    setDisplayCount(baseCount);
    if (baseCount >= initialValue) setHasHitInitial(true);
  }, [baseCount, initialValue]);

  // Secondary optimization loop after hitting 850
  useEffect(() => {
    if (!hasHitInitial) return;
    const interval = setInterval(() => {
      // Fluctuate between 850 and peakValue (1000)
      const target = 850 + Math.floor(Math.random() * (peakValue - 850 + 1));
      setDisplayCount(target);
    }, 2000 + Math.random() * 1000);
    return () => clearInterval(interval);
  }, [hasHitInitial, peakValue, initialValue]);

  return <span ref={ref}>{displayCount}</span>;
}

/* ─── Spotlight Card (SaaS Interaction) ─── */
function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove} 
      onMouseEnter={() => setOpacity(1)} 
      onMouseLeave={() => setOpacity(0)} 
      className={`relative overflow-hidden ${className}`}
    >
      <div 
        style={{ 
          position: "absolute", 
          inset: 0, 
          background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(42, 196, 109, 0.12), transparent 40%)`, 
          opacity, 
          transition: "opacity 0.3s",
          pointerEvents: "none",
          zIndex: 1
        }} 
      />
      {children}
    </div>
  );
}

/* ─── Stat item ─── */
interface StatProps { value: number; suffix?: string; label: string; inView: boolean; }
function StatItem({ value, suffix = "", label, inView }: StatProps) {
  const count = useCounter(value, 1600, inView);
  return (
    <div className="flex flex-col items-center text-center">
      <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: "clamp(2rem,4vw,3rem)", color: "#fff", lineHeight: 1 }}>
        {count.toLocaleString("pt-BR")}{suffix}
      </span>
      <span style={{ fontFamily: "Inter", fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>{label}</span>
    </div>
  );
}

/* ─── FAQ item ─── */
function FaqItem({ q, a, isOpen, toggle }: { q: string; a: string; isOpen: boolean; toggle: () => void }) {
  return (
    <div style={{ borderRadius: "1rem", border: "1px solid", borderColor: isOpen ? "rgba(34,197,94,0.25)" : "var(--border-card)", background: isOpen ? "rgba(34,197,94,0.04)" : "var(--bg-card)", transition: "all 0.3s ease", overflow: "hidden" }}>
      <button
        onClick={toggle}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", gap: "1.5rem" }}
      >
        <span style={{ fontFamily: "Sora", fontWeight: 600, fontSize: "1.125rem", color: "white", flex: 1 }}>{q}</span>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: isOpen ? "rgba(42, 196, 109, 0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ transition: "transform 0.3s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path d="M6 9l6 6 6-6" stroke={isOpen ? "var(--brand-green)" : "rgba(255,255,255,0.4)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      <div className={`faq-content ${isOpen ? "open" : ""}`}>
        <p style={{ padding: "0 1.5rem 1.25rem", fontFamily: "Inter", fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.7, borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>{a}</p>
      </div>
    </div>
  );
}

/* ─── Bento card (Zaeom Style) ─── */
interface BentoCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  className?: string;
  num: string;
  total: number;
  badge: string;
}
function BentoCard({ icon, title, desc, className = "", num, total, badge }: BentoCardProps) {
  const stepIdx = parseInt(num, 10);
  
  return (
    <SpotlightCard className={`rounded-[2rem] h-full ${className}`}>
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }}
      className={`card-glass flex flex-col justify-between h-full`} 
      style={{ 
        minHeight: "340px", 
        padding: "2rem",
        borderRadius: "2rem",
        transition: "all 0.3s ease", 
        cursor: "default",
        background: "var(--bg-card)",
        border: "1px solid var(--border-card)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="flex justify-between items-start w-full">
          {/* Top Left Icon Square */}
          <div style={{ 
            width: "3.5rem", 
            height: "3.5rem", 
            borderRadius: "1rem", 
            background: "rgba(42, 196, 109, 0.05)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "var(--brand-green)",
            border: "1px solid rgba(42, 196, 109, 0.15)"
          }}>
            {icon}
          </div>
          
          {/* Top Right Step Index */}
          <span style={{ fontFamily: "Inter", fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", opacity: 0.8, letterSpacing: "0.15em", marginTop: "0.5rem" }}>
            STEP_{num}
          </span>
        </div>

        <div>
          {/* Micro Badge */}
          <div style={{ display: "inline-block", background: "rgba(42, 196, 109, 0.1)", border: "1px solid rgba(42, 196, 109, 0.2)", padding: "0.2rem 0.6rem", borderRadius: "0.25rem", marginBottom: "1rem" }}>
            <span style={{ fontFamily: "Inter", fontSize: "0.55rem", fontWeight: 800, color: "var(--brand-green)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{badge}</span>
          </div>

          <h3 style={{ fontFamily: "Sora", fontWeight: 700, fontSize: "1.25rem", color: "white", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>{title}</h3>
          <p style={{ fontFamily: "Inter", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{desc}</p>
        </div>
      </div>

      {/* Segmented Progress Bar at the bottom */}
      <div style={{ display: "flex", gap: "4px", width: "100%", marginTop: "2.5rem" }}>
        {[...Array(total)].map((_, i) => (
          <div 
            key={i} 
            style={{ 
              height: "3px", 
              flex: 1, 
              borderRadius: "999px",
              background: i < stepIdx ? "var(--brand-green)" : "rgba(255,255,255,0.05)",
              boxShadow: i < stepIdx ? "0 0 8px var(--green-glow)" : "none",
              transition: "all 0.3s ease"
            }} 
          />
        ))}
      </div>
    </motion.div>
    </SpotlightCard>
  );
}

/* ─── Testimonial ─── */
interface TestimonialProps { text: string; name: string; role: string; stars?: number; }
function TestimonialCard({ text, name, role, stars = 5 }: TestimonialProps) {
  return (
    <SpotlightCard className="rounded-[0.5rem] h-full">
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: "0.5rem", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem", transition: "all 0.3s ease", height: "100%" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-card)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
      <div style={{ display: "flex", gap: "2px" }}>
        {[...Array(stars)].map((_, i) => (
          <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="var(--green)"><path d="M8 1l1.9 3.8L14 5.7l-3 2.9.7 4.1L8 10.8l-3.7 1.9.7-4.1-3-2.9 4.1-.9L8 1z" /></svg>
        ))}
      </div>
      <p style={{ fontFamily: "Inter", fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.75, fontStyle: "italic", flex: 1 }}>"{text}"</p>
      <div style={{ borderTop: "1px solid var(--border-card)", paddingTop: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "999px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter", fontWeight: 700, fontSize: "0.9rem", color: "white", flexShrink: 0 }}>
          {name[0]}
        </div>
        <div>
          <p style={{ fontFamily: "Sora", fontWeight: 600, fontSize: "0.875rem", color: "white" }}>{name}</p>
          <p style={{ fontFamily: "Inter", fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{role}</p>
        </div>
      </div>
    </div>
    </SpotlightCard>
  );
}

/* ─── Custom Cursor ─── */
function CustomCursor() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  // Spring settings for the halo (smooth delay)
  const springConfig = { damping: 25, stiffness: 200 };
  const haloX = useSpring(cursorX, springConfig);
  const haloY = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      
      const target = e.target as HTMLElement;
      const isInteractive = !!target.closest('button, a, .clickable');
      const isGreenBtn = !!target.closest('.btn-primary, .btn-green');
      
      setIsHovered(isInteractive);
      setIsPrimaryHovered(isGreenBtn);
    };

    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY]);

  // Only show custom cursor on non-touch devices
  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;

  return (
    <>
      <style>{`
        body, a, button { cursor: none !important; }
      `}</style>

      {/* Halo - Lagging Circle */}
      <motion.div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: isHovered ? 60 : 36,
          height: isHovered ? 60 : 36,
          borderRadius: "50%",
          border: isPrimaryHovered ? "1px solid rgba(255, 255, 255, 0.4)" : (isHovered ? "1px solid rgba(42, 196, 109, 0.4)" : "1px solid rgba(42, 196, 109, 0.15)"),
          background: isPrimaryHovered ? "rgba(255, 255, 255, 0.1)" : (isHovered ? "rgba(42, 196, 109, 0.05)" : "transparent"),
          boxShadow: isPrimaryHovered ? "0 0 15px rgba(255, 255, 255, 0.1)" : (isHovered ? "0 0 15px rgba(42, 196, 109, 0.1)" : "none"),
          x: haloX,
          y: haloY,
          translateX: "-50%",
          translateY: "-50%",
          pointerEvents: "none",
          zIndex: 9999,
          transition: "width 0.3s, height 0.3s, border 0.3s, background 0.3s"
        }}
      />

      {/* Dot - Precise Center */}
      <motion.div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          backgroundColor: isPrimaryHovered ? "#ffffff" : "#2AC46D",
          borderRadius: "50%",
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%",
          pointerEvents: "none",
          zIndex: 10000,
          boxShadow: isPrimaryHovered ? "0 0 10px #ffffff" : "0 0 10px #2AC46D",
          transition: "background-color 0.2s"
        }}
      />
    </>
  );
}

/* ─── Reveal wrapper ─── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(28px)", transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
      {children}
    </div>
  );
}

/* ─── Main ─── */
export default function LandingPage() {
  const windowWidth = useWindowWidth();
  const { ref: dashboardRef, inView: dashboardVisible } = useInView(0.2);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const lenisRef = useRef<Lenis | null>(null);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (lenisRef.current) {
      lenisRef.current.scrollTo(id, {
        offset: -80,
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const navLinks = [
    { label: "Garantia", href: "#garantia" },
    { label: "Soluções", href: "#solucoes" },
    { label: "Depoimentos", href: "#depoimentos" },
    { label: "FAQ", href: "#faq" },
  ];

  const services = [
    { num: "01", badge: "Remoção", icon: <ShieldCheck size={26} />, title: "Blindagem de CPF/CNPJ", desc: "Baixa definitiva em apontamentos do Serasa, SPC e BoaVista com liminares ativas." },
    { num: "02", badge: "Evolução", icon: <TrendingUp size={26} />, title: "Alavancagem de Score", desc: "Forçamos o algoritmo a recalcular seu rating, restaurando a confiança dos bancos." },
    { num: "03", badge: "BACEN", icon: <Search size={26} />, title: "Mapeamento SCR", desc: "Auditoria no Banco Central para revelar dívidas ocultas que travam seu crédito." },
    { num: "04", badge: "Empresarial", icon: <Building2 size={26} />, title: "Intervenção Corporativa", desc: "Protegemos linhas de crédito do seu CNPJ reestruturando passivos e bacen." }
  ];

  const faqs = [
    { q: "Como tenho certeza de que não é golpe?", a: "Trabalhamos com total transparência e processos rastreáveis. Prestamos contas de cada etapa administrativa e jurídica do seu caso. Você acompanha tudo em tempo real." },
    { q: "Isso funciona mesmo? Meu nome fica limpo?", a: "Sim. Utilizamos brechas legais, revisões contratuais e negociações diretas que obrigam a remoção ou redução dos apontamentos junto aos órgãos de proteção ao crédito." },
    { q: "Em quanto tempo vejo resultados?", a: "Cada caso é único. Após nossa análise técnica inicial, damos um prazo realista de acordo com seu perfil de endividamento e os órgãos envolvidos. Transparência total desde o início." },
    { q: "Quanto custa o serviço?", a: "A análise inicial é gratuita. Para revisão contratual, cobramos apenas uma porcentagem sobre o valor da dívida que conseguirmos reduzir. Sem cobranças antecipadas." },
  ];

  const partners = ["SERASA", "SPC BRASIL", "BOA VISTA", "BANCO CENTRAL", "CVM"];

  return (
    <div style={{ minHeight: "100vh", background: "transparent", color: "var(--text-primary)", overflowX: "hidden", position: "relative" }} className="selection:bg-green/20 selection:text-green">
      <CustomCursor />
      
      {/* Floating Animated Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 80, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{ position: "absolute", top: "10%", left: "10%", width: "40vw", height: "40vw", background: "radial-gradient(circle, rgba(34, 97, 212, 0.08) 0%, transparent 70%)", filter: "blur(60px)" }} 
        />
        <motion.div 
          animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ position: "absolute", bottom: "10%", right: "10%", width: "45vw", height: "45vw", background: "radial-gradient(circle, rgba(42, 196, 109, 0.05) 0%, transparent 70%)", filter: "blur(60px)" }} 
        />
      </div>

      {/* ── Background Elite Layers ── */}
      <div className="bg-mesh" />
      <div className="bg-grid" />
      <div className="bg-dots" style={{ maskImage: "radial-gradient(circle at center, black 10%, transparent 90%)" }} />
      
      {/* Top light glow for the header area */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", height: "400px", background: "radial-gradient(ellipse at top, rgba(34, 97, 212, 0.1), transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Floating WhatsApp ── */}
      <motion.a 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        href={WA} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="fixed bottom-8 right-8 z-[999] w-14 h-14 rounded-full bg-[#22C55E] flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-pulse-green"
      >
        <MessageCircle size={28} color="white" fill="white" />
      </motion.a>

      {/* ── NAV ── */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: scrolled ? "0.75rem 0" : "1.25rem 0", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", ...(scrolled ? { background: "rgba(6,7,26,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 4px 30px rgba(0,0,0,0.3)" } : {}) }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src={logo} alt="ScorePontoCom" style={{ height: "2.25rem", objectFit: "contain" }} />

          <nav style={{ alignItems: "center", gap: "0.25rem" }} className="hidden md:flex">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={(e) => scrollToSection(e, l.href)} style={{ fontFamily: "Inter", fontSize: "0.9rem", fontWeight: 500, color: "var(--text-secondary)", padding: "0.4rem 0.85rem", borderRadius: "0.5rem", transition: "all 0.2s", textDecoration: "none" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = "#fff"; (e.target as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-secondary)"; (e.target as HTMLElement).style.background = "transparent"; }}>
                {l.label}
              </a>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <a href={WA} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-[0.75rem]" style={{ fontSize: "0.8125rem", padding: "0.5rem 1.05rem", height: "auto" }}>
              Fale Conosco
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col items-center justify-center gap-[5px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: "0.5rem", width: "2.5rem", height: "2.5rem", cursor: "pointer" }}>
              <span style={{ width: "18px", height: "2px", background: "#fff", borderRadius: "1px", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
              <span style={{ width: "18px", height: "2px", background: "#fff", borderRadius: "1px", transition: "all 0.2s", opacity: menuOpen ? 0 : 1 }} />
              <span style={{ width: "18px", height: "2px", background: "#fff", borderRadius: "1px", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div style={{ background: "rgba(6,7,26,0.97)", backdropFilter: "blur(24px)", borderRadius: "1.5rem", border: "1px solid var(--border-subtle)", margin: "1rem 1.5rem", padding: "1.5rem" }}>
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={(e) => { setMenuOpen(false); scrollToSection(e, l.href); }} style={{ display: "block", fontFamily: "Inter", fontSize: "1rem", color: "var(--text-secondary)", padding: "0.75rem 0", borderBottom: "1px solid var(--border-subtle)", textDecoration: "none" }}>{l.label}</a>
            ))}
          </div>
        )}
      </header>

      {/* ──────────────────────────────────────────
          SECTION 1 — HERO
      ────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "12rem", position: "relative", overflow: "hidden" }}>
        
        {/* ── Text Content ── */}
        <div style={{ maxWidth: "900px", margin: "0 auto", width: "100%", padding: "0 1.5rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", zIndex: 10 }}>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ marginBottom: "2rem" }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.75rem", background: "rgba(42, 196, 109, 0.08)", border: "1px solid rgba(42, 196, 109, 0.2)", borderRadius: "999px" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--brand-green)" }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--brand-green)" }}></span>
              </span>
              <motion.span 
                animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1, 0.98] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontFamily: "Inter", fontSize: "0.65rem", fontWeight: 700, color: "var(--brand-green)", letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                ScorePontoCom Operating System
              </motion.span>
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontFamily: "Sora", fontWeight: 800, fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1.1, letterSpacing: "-0.04em", marginBottom: "1.5rem", maxWidth: "800px", textWrap: "balance" }}
            className="text-white mx-auto"
          >
            O controle do seu crédito. De volta às <span style={{ color: "var(--brand-green)" }}>suas mãos.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontFamily: "Inter", fontSize: "1.125rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "600px", marginBottom: "2.5rem" }}
          >
            Utilize inteligência técnica e estratégica para blindar seu perfil financeiro, remover apontamentos e resgatar sua dignidade <br className="hidden md:block" /> no mercado.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}
          >
            <a href={WA} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-[0.75rem] h-16 px-10 text-lg">
              Iniciar Análise Gratuita
              <Zap size={20} fill="currentColor" />
            </a>
            <a href="#solucoes" onClick={(e) => scrollToSection(e, "#solucoes")} className="btn-secondary h-16 px-10 flex items-center justify-center text-sm tracking-widest uppercase font-semibold text-white rounded-full transition-all">
              Explorar Plataforma
            </a>
          </motion.div>
        </div>

        {/* ── Dashboard Full Container ── */}
        <motion.div 
          ref={dashboardRef}
          initial={{ opacity: 0, y: 40 }}
          animate={dashboardVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0, type: "spring", stiffness: 60, damping: 20 }}
          whileHover={{ boxShadow: "0 50px 100px -20px rgba(0,0,0,0.9), 0 0 40px -10px rgba(42, 196, 109, 0.15)" }}
          style={{ 
            width: windowWidth < 1100 ? "calc(100% - 32px)" : "100%",
            maxWidth: "1050px", 
            margin: "5rem auto 0", 
            position: "relative", 
            zIndex: 10, 
            background: "rgba(8, 11, 26, 0.8)", 
            backdropFilter: "blur(20px)",
            borderRadius: "24px", 
            border: "1px solid rgba(255,255,255,0.08)", 
            boxShadow: "0 40px 100px -20px rgba(0,0,0,0.7), 0 0 20px rgba(42, 196, 109, 0.05)"
          }}
        >
          {/* Header Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FF5F56", opacity: 0.9 }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FFBD2E", opacity: 0.9 }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27C93F", opacity: 0.9 }} />
            </div>
            <div style={{ width: "60px", height: "16px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }} />
          </div>

          {/* Main Grid Content */}
          <div style={{ 
            padding: windowWidth < 768 ? "24px" : "48px 40px 56px", 
            display: "grid", 
            gridTemplateColumns: windowWidth < 1024 ? "1fr" : "1fr auto 1fr", 
            gap: "40px", 
            alignItems: "center" 
          }}>
            
            {/* Lado Esquerdo - Show 1 card on Mobile, all on Desktop */}
            {(windowWidth >= 768 || true) && (
              <div style={{ display: windowWidth < 768 ? "none" : "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  animate={dashboardVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                  transition={{ duration: 0.7, delay: 0.6, type: "spring" }}
                  whileHover={{ scale: 1.03, borderColor: "rgba(42, 196, 109, 0.4)", backgroundColor: "rgba(42, 196, 109, 0.04)", y: -2 }}
                  style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "16px", padding: "20px", cursor: "default" }}
                >
                  <HistoryIcon size={20} color="#2AC46D" style={{ marginBottom: "12px", opacity: 0.8 }} />
                  <div style={{ fontFamily: "Inter", fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>Histórico Mensal</div>
                  <div style={{ fontFamily: "Sora", fontSize: "1.25rem", color: "#fff", fontWeight: 700 }}>+240 pts</div>
                </motion.div>
                {windowWidth >= 768 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={dashboardVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                    transition={{ duration: 0.7, delay: 0.7, type: "spring" }}
                    whileHover={{ scale: 1.03, borderColor: "rgba(42, 196, 109, 0.4)", backgroundColor: "rgba(42, 196, 109, 0.04)", y: -2 }}
                    style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "16px", padding: "20px", cursor: "default" }}
                  >
                    <CheckCircle2 size={20} color="#2AC46D" style={{ marginBottom: "12px", opacity: 0.8 }} />
                    <div style={{ fontFamily: "Inter", fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>Status Ativo</div>
                    <div style={{ fontFamily: "Sora", fontSize: "1.25rem", color: "#fff", fontWeight: 700 }}>Score Blindado</div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Floating Mobile Card 1 */}
            {windowWidth < 768 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={dashboardVisible ? { 
                  opacity: 1, 
                  scale: 1, 
                  x: 0,
                  y: [0, -8, 0] // Floating effect
                } : { opacity: 0, scale: 0.8, x: -20 }}
                transition={dashboardVisible ? { 
                  opacity: { duration: 0.5 },
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                } : {}}
                style={{ 
                  position: "absolute", top: "45%", left: "5%", width: "120px",
                  background: "rgba(42, 196, 109, 0.1)", border: "1px solid rgba(42, 196, 109, 0.2)",
                  borderRadius: "12px", padding: "12px", zIndex: 20, backdropFilter: "blur(8px)"
                }}
              >
                 <HistoryIcon size={14} color="#2AC46D" style={{ marginBottom: "4px" }} />
                 <div style={{ fontSize: "10px", color: "#fff", fontWeight: 600 }}>+240 pts</div>
              </motion.div>
            )}

            {/* Floating Mobile Card 2 */}
            {windowWidth < 768 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={dashboardVisible ? { 
                  opacity: 1, 
                  scale: 1, 
                  x: 0,
                  y: [0, 8, 0] // Floating effect (offset)
                } : { opacity: 0, scale: 0.8, x: 20 }}
                transition={dashboardVisible ? { 
                  opacity: { duration: 0.5 },
                  y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                } : {}}
                style={{ 
                  position: "absolute", top: "55%", right: "5%", width: "120px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px", padding: "12px", zIndex: 20, backdropFilter: "blur(8px)"
                }}
              >
                 <CheckCircle2 size={14} color="#2AC46D" style={{ marginBottom: "4px" }} />
                 <div style={{ fontSize: "10px", color: "#fff", fontWeight: 600 }}>Aprovação 98%</div>
              </motion.div>
            )}

            {/* Centro - Gauge */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={dashboardVisible ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.5, type: "spring", bounce: 0.3 }}
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center",
                marginTop: "-24px" // Harmoniza o peso visual do arco
              }}
            >
              <Speedometer size={windowWidth < 640 ? 260 : 360} dashboardVisible={dashboardVisible} />
              
              <motion.div 
                whileHover={{ scale: 1.05, backgroundColor: "rgba(10, 40, 20, 0.8)" }}
                style={{ 
                  background: "rgba(10, 30, 20, 0.6)", 
                  border: "1px solid rgba(25, 80, 45, 0.4)", 
                  borderRadius: "2rem", 
                  padding: "10px 24px", 
                  marginTop: "8px", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}
              >
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2AC46D", boxShadow: "0 0 8px #2AC46D" }} className="animate-pulse" />
                <motion.span 
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ 
                    fontFamily: "Inter", 
                    fontWeight: 700, 
                    fontSize: "0.7rem", 
                    color: "rgba(255,255,255,0.9)", 
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}
                >
                  Verificação Sistêmica Prioritária
                </motion.span>
              </motion.div>
            </motion.div>

            {/* Lado Direito - Hidden on Mobile */}
            {windowWidth >= 768 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <motion.div 
                    initial={{ opacity: 0, x: 30 }}
                    animate={dashboardVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                    transition={{ duration: 0.7, delay: 0.8, type: "spring" }}
                    whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.03)", y: -2 }}
                    style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "16px", padding: "20px", textAlign: "center", cursor: "default" }}
                  >
                    <div style={{ fontFamily: "Inter", fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>Aprovação</div>
                    <div style={{ fontFamily: "Sora", fontSize: "1.25rem", color: "#fff", fontWeight: 700 }}>98%</div>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, x: 30 }}
                    animate={dashboardVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                    transition={{ duration: 0.7, delay: 0.9, type: "spring" }}
                    whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.03)", y: -2 }}
                    style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "16px", padding: "20px", textAlign: "center", cursor: "default" }}
                  >
                    <div style={{ fontFamily: "Inter", fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>Confiança</div>
                    <div style={{ fontFamily: "Sora", fontSize: "1.25rem", color: "#fff", fontWeight: 700 }}>A1</div>
                  </motion.div>
                </div>
                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  animate={dashboardVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                  transition={{ duration: 0.7, delay: 1.0, type: "spring" }}
                  whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.03)", y: -2 }}
                  style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "16px", padding: "20px", cursor: "default" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                    <BarChart3 size={16} color="rgba(255,255,255,0.4)" />
                    <div style={{ fontFamily: "Inter", fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>Performance</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "50px" }}>
                    {[30, 45, 20, 60, 40, 90, 50].map((h, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ height: 0 }}
                        animate={dashboardVisible ? { 
                          height: [ `${h}%`, `${Math.max(10, h - 15)}%`, `${Math.min(100, h + 15)}%`, `${h}%` ] 
                        } : { height: 0 }}
                        transition={dashboardVisible ? { 
                          height: {
                            duration: 2.5 + (i * 0.2), 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            delay: 1.1 + (i * 0.1)
                          }
                        } : { duration: 0.8 }}
                        style={{ 
                          flex: 1, 
                          background: i === 5 ? "#2AC46D" : "rgba(255,255,255,0.1)",
                          borderRadius: "4px"
                        }} 
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

          </div>
        </motion.div>

        {/* ── Partners / Authority Signals ── */}
        <Reveal delay={1} className="w-full mt-24">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}>
            <p style={{ fontFamily: "Inter", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6 }}>
              Especialistas em Protocolos de Auditoria
            </p>
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap", 
              justifyContent: "center", 
              alignItems: "center", 
              gap: windowWidth < 768 ? "2rem" : "4rem", 
              opacity: 0.4, 
              filter: "grayscale(1) brightness(2)" 
            }}>
              {partners.map(p => (
                <span key={p} style={{ fontFamily: "Sora", fontWeight: 800, fontSize: "clamp(0.875rem, 2vw, 1.25rem)", letterSpacing: "-0.02em" }}>{p}</span>
              ))}
            </div>
          </div>
        </Reveal>

      </section>

      {/* ──────────────────────────────────────────
          STATS BAR
      ────────────────────────────────────────── */}
      <div className="divider-tech scan-line" style={{ margin: windowWidth < 768 ? "2rem 0" : "3rem 0" }} />
      <section ref={statsRef} style={{ padding: windowWidth < 768 ? "2rem 1.5rem" : "4rem 1.5rem", position: "relative" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: windowWidth < 640 ? "repeat(1, 1fr)" : windowWidth < 1024 ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: windowWidth < 640 ? "1.5rem" : "2rem" }}>
          <StatItem value={98} suffix="%" label="Taxa de aprovações" inView={statsVisible} />
          <StatItem value={5000} suffix="+" label="Clientes atendidos" inView={statsVisible} />
          <StatItem value={72} suffix="h" label="Tempo médio de resultado" inView={statsVisible} />
          <StatItem value={100} suffix="%" label="Sigilo garantido" inView={statsVisible} />
        </div>
      </section>
      <div className="divider-grad scan-line" />

      {/* ──────────────────────────────────────────
          SECTION 2 — GARANTIA
      ────────────────────────────────────────── */}
      <section id="garantia" style={{ padding: windowWidth < 768 ? "4rem 1.5rem" : "7rem 1.5rem", position: "relative" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <span className="section-label group cursor-default" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", marginBottom: "1.25rem", display: "inline-flex" }}>
                <span style={{ opacity: 0.5, marginRight: "0.5rem" }}>[ SC-01 ]</span> NOSSA GARANTIA
              </span>
              <h2 style={{ fontFamily: "Sora", fontWeight: 800, fontSize: "clamp(1.875rem,4vw,3rem)", letterSpacing: "-0.025em", maxWidth: "640px", margin: "0 auto 1rem", lineHeight: 1.15 }}>
                Por que somos a sua escolha{" "}
                <span className="grad-text">mais segura?</span>
              </h2>
              <p style={{ fontFamily: "Inter", color: "var(--text-secondary)", fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "520px", margin: "0 auto" }}>
                O mercado está cheio de aproveitadores. Nós nascemos para ser o inimigo número 1 dessas fraudes.
              </p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: windowWidth < 768 ? "1fr" : "repeat(3, 1fr)", gap: windowWidth < 768 ? "1.5rem" : "1.25rem" }}>
            {[
              {
                icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 2L4 6v8c0 6.627 4.31 12.82 10 15 5.69-2.18 10-8.373 10-15V6L14 2z" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 14l3 3 7-7" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
                color: "rgba(34,197,94,0.12)",
                title: "Legalidade Absoluta",
                desc: "Atuamos dentro da lei, usando recursos jurídicos e administrativos reconhecidos pelos órgãos de proteção ao crédito."
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="10" stroke="#F7EC2E" strokeWidth="2" /><path d="M14 8v6l4 2" stroke="#F7EC2E" strokeWidth="2" strokeLinecap="round" /></svg>,
                color: "rgba(247,236,46,0.1)",
                title: "Transparência Total",
                desc: "Você acompanha cada passo em tempo real. Nenhuma etapa do processo fica escondida — do início ao resultado."
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="10" stroke="#F58F20" strokeWidth="2" /><circle cx="14" cy="14" r="4" stroke="#F58F20" strokeWidth="2" /><path d="M14 4V2M14 26v-2M4 14H2M26 14h-2" stroke="#F58F20" strokeWidth="2" strokeLinecap="round" /></svg>,
                color: "rgba(245,143,32,0.1)",
                title: "Foco no Resultado",
                desc: "Não vendemos ilusão. Vendemos execução técnica real que devolve sua paz financeira e seu poder de compra."
              }
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <SpotlightCard className="h-full rounded-[1.5rem]">
                  <div className="card-glass" style={{ padding: "2.5rem", height: "100%", borderRadius: "1.5rem" }}>
                    <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "1rem", background: item.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                      {item.icon}
                    </div>
                    <h3 style={{ fontFamily: "Sora", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.75rem", letterSpacing: "-0.01em", color: "white" }}>{item.title}</h3>
                    <p style={{ fontFamily: "Inter", fontSize: "1rem", color: "var(--text-secondary)", lineHeight: 1.75 }}>{item.desc}</p>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          SECTION 3 — PROBLEMA
      ────────────────────────────────────────── */}
      <section id="realidade" style={{ padding: "4rem 1.5rem 6rem", position: "relative", background: "linear-gradient(180deg, transparent, rgba(211,56,72,0.04) 50%, transparent)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: windowWidth < 768 ? "1fr" : "1fr 1fr", gap: windowWidth < 768 ? "3rem" : "5rem", alignItems: "center" }}>
          
          {/* Visual */}
          <Reveal className="order-2 md:order-1">
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: "-20px", background: "radial-gradient(circle, rgba(211,56,72,0.08) 0%, transparent 70%)", borderRadius: "999px", pointerEvents: "none" }} />
              
              <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {/* Before card */}
                <div style={{ background: "rgba(211,56,72,0.06)", border: "1px solid rgba(211,56,72,0.2)", borderRadius: "1.125rem", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontFamily: "Inter", fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.25rem" }}>ANTES</p>
                    <p style={{ fontFamily: "Sora", fontWeight: 700, fontSize: "1.5rem", color: "#D33848" }}>Score 250</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(211,56,72,0.15)", border: "1px solid rgba(211,56,72,0.3)", borderRadius: "999px", padding: "0.35rem 0.75rem" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="#D33848" opacity="0.3" /><path d="M3 6h6M6 3v6" stroke="#D33848" strokeWidth="1.5" strokeLinecap="round" style={{ transform: "rotate(45deg)", transformOrigin: "6px 6px" }} /></svg>
                    <span style={{ fontFamily: "Sora", fontWeight: 700, fontSize: "0.8rem", color: "#D33848" }}>NEGADO</span>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ width: "2px", height: "2rem", background: "linear-gradient(180deg, #D33848, #22C55E)" }} />
                </div>

                {/* After card */}
                <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "1.125rem", padding: "1.5rem 1.75rem", display: "flex", flexDirection: windowWidth < 480 ? "column" : "row", justifyContent: "space-between", alignItems: "center", boxShadow: "0 0 50px rgba(34,197,94,0.12)", gap: "1rem" }}>
                  <div>
                    <p style={{ fontFamily: "Inter", fontSize: "0.7rem", fontWeight: 800, color: "var(--brand-green)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>AFTER_PROTOCOLO</p>
                    <p style={{ fontFamily: "Sora", fontWeight: 800, fontSize: "2rem", color: "#fff" }}>850 <span style={{ fontSize: "1rem", color: "var(--brand-green)" }}>SCORE</span></p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(42, 196, 109, 0.15)", border: "1px solid rgba(42, 196, 109, 0.3)", borderRadius: "999px", padding: "0.5rem 1rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "999px", background: "var(--brand-green)", boxShadow: "0 0 8px var(--brand-green)" }} className="animate-ping" />
                    <span style={{ fontFamily: "Sora", fontWeight: 700, fontSize: "0.85rem", color: "var(--brand-green)" }}>APROVADO</span>
                  </div>
                </div>

                {/* Mini stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.5rem" }}>
                  {[{ label: "Serasa limpo", icon: "✓" }, { label: "SPC removido", icon: "✓" }, { label: "Crédito aprovado", icon: "✓" }, { label: "Score em alta", icon: "↑" }].map(item => (
                    <div key={item.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: "0.75rem", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#22C55E", fontWeight: 700 }}>{item.icon}</span>
                      <span style={{ fontFamily: "Inter", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Text */}
          <Reveal delay={0.15} className="order-1 md:order-2">
            <span className="section-label" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>Sua Realidade</span>
            <h2 style={{ fontFamily: "Sora", fontWeight: 800, fontSize: "clamp(1.875rem,4vw,2.875rem)", letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: "1.5rem" }}>
              O crédito negado está{" "}
              <span style={{ color: "#D33848" }}>travando</span>{" "}
              sua vida?
            </h2>
            <p style={{ fontFamily: "Inter", color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.75, marginBottom: "1.75rem" }}>
              Ter o nome restrito não é só um problema financeiro. É um peso emocional que afeta sua família, seus planos e seu negócio.
            </p>
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "2rem" }}>
              {[
                "Portas fechadas para financiamentos de veículos ou imóveis.",
                "Vergonha ao ter o cartão recusado na frente de todos.",
                "Limites zerados e impossibilidade de expandir seu negócio."
              ].map((pain, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontFamily: "Inter", fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <circle cx="9" cy="9" r="9" fill="rgba(211,56,72,0.15)" />
                    <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#D33848" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "none" }} />
                    <path d="M6 6l6 6M12 6l-6 6" stroke="#D33848" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {pain}
                </li>
              ))}
            </ul>
            <div style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "1rem", padding: "1.25rem 1.5rem" }}>
              <p style={{ fontFamily: "Inter", fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Você não precisa aceitar esse "não". Existe um{" "}
                <span style={{ color: "#22C55E", fontWeight: 600 }}>caminho legal e comprovado</span>{" "}
                para virar esse jogo.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          SECTION 4 — SOLUÇÕES (bento)
      ────────────────────────────────────────── */}
      <section id="solucoes" style={{ padding: windowWidth < 768 ? "4rem 1.5rem" : "7rem 1.5rem", background: "linear-gradient(180deg, transparent, rgba(6,7,26,0.8))", position: "relative" }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto", width: "100%", position: "relative", zIndex: 10 }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <span className="section-label cursor-default" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)" }}>
                SOLUÇÕES DA PLATAFORMA
              </span>
              <h2 style={{ fontFamily: "Sora", fontWeight: 700, fontSize: "clamp(2rem, 4vw, 3.5rem)", color: "white", marginTop: "1.5rem", letterSpacing: "-0.03em" }}>
                Simples, Rápido e<br />
                <span style={{ color: "var(--brand-green)" }}>Eficiente</span>
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {services.map((service, index) => (
              <Reveal key={index} delay={index * 0.1}>
                <BentoCard 
                  num={service.num}
                  total={services.length}
                  badge={service.badge}
                  icon={service.icon}
                  title={service.title}
                  desc={service.desc}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          SECTION 5 — DEPOIMENTOS
      ────────────────────────────────────────── */}
      <section id="depoimentos" style={{ padding: windowWidth < 768 ? "4rem 1.5rem" : "7rem 1.5rem", position: "relative" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 10 }}>
          <Reveal>
            <div style={{ textAlign: "left", marginBottom: "4rem", maxWidth: "700px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.75rem", background: "rgba(42, 196, 109, 0.08)", border: "1px solid rgba(42, 196, 109, 0.2)", borderRadius: "999px", marginBottom: "1.5rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "var(--brand-green)" }} />
                <span style={{ fontFamily: "Inter", fontSize: "0.6rem", fontWeight: 700, color: "var(--brand-green)", letterSpacing: "0.15em", textTransform: "uppercase" }}>SOCIAL PROOF / SP-1</span>
              </div>
              <h2 style={{ fontFamily: "Sora", fontWeight: 700, fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "white", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1.5rem" }}>
                A Prova na <span style={{ color: "var(--brand-green)" }}>Prática</span>
              </h2>
              <p style={{ fontFamily: "Inter", fontSize: "1.125rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.6, maxWidth: "500px" }}>
                Resultados reais contados por clientes que recuperaram o controle de suas vidas financeiras.
              </p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: windowWidth < 768 ? "1fr" : "repeat(3, 1fr)", gap: windowWidth < 768 ? "1.5rem" : "1.25rem", textAlign: "left" }}>
            {[
              { text: "Eu estava com muito medo de ser mais um golpe da internet, porque já tinha caído em um antes. A equipe da SCOREPONTOCOM me atendeu com extremo profissionalismo, mostrou tudo de forma transparente e em poucas semanas meu nome estava limpo. Consegui financiar meu carro no mês seguinte!", name: "Cliente Satisfeito", role: "Nome oculto por privacidade" },
              { text: "Meu CNPJ estava travado por uma dívida antiga que virou uma bola de neve. Os bancos fecharam as portas. A consultoria revisou meus contratos e reduziu a dívida em quase 70%. Hoje minha empresa voltou a operar com limite de crédito.", name: "Empresário", role: "Setor de Logística" },
              { text: "Sempre paguei minhas contas, mas meu score não subia de jeito nenhum. O trabalho deles no Serasa Concentre mudou meu perfil completamente. Fui aprovada em um financiamento imobiliário que tentava há 2 anos.", name: "Cliente Satisfeita", role: "Nome oculto por privacidade" },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <TestimonialCard {...t} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          SECTION 6 — FAQ
      ────────────────────────────────────────── */}
      <section id="faq" style={{ padding: windowWidth < 768 ? "4rem 1.5rem" : "7rem 1.5rem", position: "relative" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <span className="section-label group cursor-default" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", marginBottom: "1.25rem", display: "inline-flex" }}>
                <span style={{ opacity: 0.5, marginRight: "0.5rem" }}>[ SC-04 ]</span> FAQ
              </span>
              <h2 style={{ fontFamily: "Sora", fontWeight: 800, fontSize: "clamp(1.875rem,4vw,3rem)", letterSpacing: "-0.025em", lineHeight: 1.15 }}>
                Suas dúvidas, <span className="grad-text">respondidas.</span>
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <FaqItem 
                  q={faq.q} 
                  a={faq.a} 
                  isOpen={activeFaq === i} 
                  toggle={() => setActiveFaq(activeFaq === i ? null : i)} 
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          SECTION 7 — CTA FINAL (SAAS OS STYLE)
      ────────────────────────────────────────── */}
      <section style={{ padding: windowWidth < 768 ? "4rem 1.5rem" : "8rem 1.5rem", position: "relative", overflow: "hidden" }}>
        {/* Deep Background Map/Dots */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "80px 80px", pointerEvents: "none", maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)" }} />

        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
          <Reveal>
            
            {/* The Huge SaaS Container */}
            <div style={{ position: "relative", padding: windowWidth < 768 ? "3rem 1.5rem" : "6rem 4rem", background: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\"), rgba(10, 11, 26, 0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "2rem", overflow: "hidden" }}>
              
              {/* Corner Accents (Crosshairs) */}
              <div style={{ position: "absolute", top: "1rem", left: "1rem", width: "12px", height: "12px", background: "url('data:image/svg+xml;utf8,<svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M6 0v12M0 6h12\" stroke=\"rgba(255,255,255,0.2)\" stroke-width=\"1\"/></svg>') no-repeat" }} />
              <div style={{ position: "absolute", top: "1rem", right: "1rem", width: "12px", height: "12px", background: "url('data:image/svg+xml;utf8,<svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M6 0v12M0 6h12\" stroke=\"rgba(255,255,255,0.2)\" stroke-width=\"1\"/></svg>') no-repeat" }} />
              <div style={{ position: "absolute", bottom: "1rem", left: "1rem", width: "12px", height: "12px", background: "url('data:image/svg+xml;utf8,<svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M6 0v12M0 6h12\" stroke=\"rgba(255,255,255,0.2)\" stroke-width=\"1\"/></svg>') no-repeat" }} />
              <div style={{ position: "absolute", bottom: "1rem", right: "1rem", width: "12px", height: "12px", background: "url('data:image/svg+xml;utf8,<svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M6 0v12M0 6h12\" stroke=\"rgba(255,255,255,0.2)\" stroke-width=\"1\"/></svg>') no-repeat" }} />

              {/* Top Fake Controls / Telemetry */}
              <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "1px", background: "linear-gradient(90deg, transparent, rgba(42, 196, 109, 0.5), transparent)" }} />
              <div style={{ position: "absolute", top: "1.5rem", left: "0", right: "0", display: "flex", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: "100px", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", position: "relative" }}>
                   <div style={{ position: "absolute", top: 0, left: "20%", right: "40%", height: "100%", background: "var(--brand-green)", borderRadius: "2px", boxShadow: "0 0 10px var(--brand-green)" }} />
                </div>
              </div>

              {/* Glowing Background Core behind the text */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "400px", height: "200px", background: "radial-gradient(ellipse, rgba(42,196,109,0.15), transparent 70%)", filter: "blur(40px)", zIndex: 0, pointerEvents: "none" }} />

              {/* Inner Content Component */}
              <div style={{ position: "relative", zIndex: 10, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span className="section-label group cursor-default" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "2rem", display: "inline-flex" }}>
                  <span className="relative flex h-1.5 w-1.5 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--brand-green)" }}></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--brand-green)" }}></span>
                  </span>
                  PRONTOS PARA AGIR // V.2026
                </span>
                
                <h2 style={{ fontFamily: "Sora", fontWeight: 800, fontSize: "clamp(2.5rem,6vw,5rem)", letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: "1.5rem", textWrap: "balance" }}>
                  O próximo <span style={{ color: "var(--brand-green)" }}>"Crédito Aprovado"</span> pode ser o seu.
                </h2>
                
                <p style={{ fontFamily: "Inter", color: "var(--text-secondary)", fontSize: "1.125rem", lineHeight: 1.75, maxWidth: "720px", margin: "0 auto 3.5rem", textWrap: "balance" }}>
                  Não deixe que o passado continue ditando até onde você pode chegar. Execute seu desbloqueio financeiro agora com segurança e inteligência sistêmica.
                </p>

                <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                  {/* Surrounding tech lines to frame the button */}
                  <div className="hidden sm:block" style={{ position: "absolute", top: "50%", left: "-60px", width: "40px", height: "1px", background: "rgba(255,255,255,0.2)" }} />
                  <div className="hidden sm:block" style={{ position: "absolute", top: "50%", right: "-60px", width: "40px", height: "1px", background: "rgba(255,255,255,0.2)" }} />

                  <a href={WA} target="_blank" rel="noopener noreferrer" className="btn-green flex items-center gap-[0.75rem] h-16 px-10 flex items-center justify-center text-lg font-bold text-[#06071A] rounded-full transition-all hover:scale-105" style={{ background: "var(--brand-green)", gap: "0.75rem", boxShadow: "0 0 0 1px rgba(42,196,109,0.3), 0 0 24px -4px rgba(42,196,109,0.4)" }}>
                    <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor"><path d="M16 2C8.27 2 2 8.27 2 16c0 2.48.65 4.81 1.79 6.83L2 30l7.38-1.77A13.94 13.94 0 0016 30c7.73 0 14-6.27 14-14S23.73 2 16 2zm0 25.5c-2.18 0-4.23-.6-5.99-1.63l-.43-.26-4.38 1.05 1.07-4.26-.28-.45A11.45 11.45 0 014.5 16c0-6.34 5.16-11.5 11.5-11.5S27.5 9.66 27.5 16 22.34 27.5 16 27.5zm6.29-8.66c-.34-.17-2.03-1-2.35-1.11-.32-.12-.55-.17-.78.17-.23.34-.9 1.11-1.1 1.34-.2.23-.4.26-.74.09-.34-.17-1.43-.53-2.72-1.68-1-.9-1.68-2.01-1.88-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.12-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.57-.28-.68-.57-.59-.78-.6h-.66c-.23 0-.6.09-.91.43-.32.34-1.21 1.18-1.21 2.88s1.24 3.34 1.41 3.57c.17.23 2.44 3.72 5.91 5.22.83.36 1.47.57 1.97.73.83.26 1.58.22 2.17.13.66-.1 2.03-.83 2.32-1.63.28-.8.28-1.49.2-1.63-.1-.14-.32-.23-.66-.4z" /></svg>
                    Quero Limpar Meu Nome Agora
                  </a>

                  <p style={{ fontFamily: "Inter", fontSize: "0.8125rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "rgba(0,0,0,0.3)", borderRadius: "99px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1L9.8 5.5H14.5L10.6 8.2L12 13L8 10.3L4 13L5.4 8.2L1.5 5.5H6.2L8 1Z" fill="#22C55E" /></svg>
                    Processamento seguro via WhatsApp Oficial 
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.3)", padding: windowWidth < 768 ? "2rem 1.5rem" : "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: windowWidth < 768 ? "column" : "row", justifyContent: windowWidth < 768 ? "center" : "space-between", alignItems: "center", gap: "1.5rem" }}>
            <img src={logo} alt="ScorePontoCom" style={{ height: "1.875rem", objectFit: "contain", opacity: 0.7, filter: "grayscale(0.3)" }} />
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyItems: "center", justifyContent: "center" }}>
              {navLinks.map(l => (
                <a key={l.href} href={l.href} onClick={(e) => scrollToSection(e, l.href)} style={{ fontFamily: "Inter", fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = "var(--text-secondary)"}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "var(--text-muted)"}>{l.label}</a>
              ))}
            </div>
            <a href={WA} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "Inter", fontSize: "0.875rem", color: "#22C55E", display: "flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}>
              <svg viewBox="0 0 20 20" width="16" height="16" fill="#22C55E"><path d="M10 1C5.03 1 1 5.03 1 10c0 1.55.4 3 1.12 4.27L1 19l4.83-1.1A8.96 8.96 0 0010 19c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16.5c-1.36 0-2.63-.37-3.72-1.02l-.27-.16-2.73.65.67-2.66-.17-.28A7.5 7.5 0 012.5 10c0-4.14 3.36-7.5 7.5-7.5S17.5 5.86 17.5 10 14.14 17.5 10 17.5z" /></svg>
              (00) 00000-0000
            </a>
          </div>
          <div className="divider-tech" />
          <div style={{ display: "flex", flexDirection: windowWidth < 768 ? "column" : "row", alignItems: windowWidth < 768 ? "center" : "flex-start", justifyContent: "space-between", gap: "0.75rem", textAlign: windowWidth < 768 ? "center" : "left" }}>
            <p style={{ fontFamily: "Inter", fontSize: "0.8125rem", color: "var(--text-muted)" }}>SCOREPONTOCOM © 2026 — Todos os direitos reservados.</p>
            <p style={{ fontFamily: "Inter", fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "480px", textAlign: windowWidth < 768 ? "center" : "right" }}>Os resultados podem variar de acordo com a situação de cada CPF/CNPJ.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

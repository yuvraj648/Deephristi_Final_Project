import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ScanLine } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BrandMark } from '../components/common/BrandMark';
import './HeroPage.css';

gsap.registerPlugin(ScrollTrigger);

interface HeroPageProps {
  onEnterPlatform: () => void;
}

interface HeroScene {
  eyebrow: string;
  title: string;
  emphasis?: string;
  description: string;
}

const SCENES: HeroScene[] = [
  {
    eyebrow: 'A DEEPDRISHTI EXPLORATION',
    title: 'THE OCEAN IS NOT EMPTY.',
    emphasis: 'IT IS UNEXPLORED.',
    description: 'AI-powered deep-sea biodiversity intelligence.',
  },
  {
    eyebrow: 'DESCENDING INTO THE UNKNOWN',
    title: 'A NEW FRONTIER',
    emphasis: 'OF DISCOVERY.',
    description: 'Every descent brings a hidden world into focus.',
  },
  {
    eyebrow: 'THE LIVING DEEP',
    title: 'LIFE EXISTS BEYOND',
    emphasis: 'WHAT WE CAN SEE.',
    description: 'Read the signals beneath the surface.',
  },
  {
    eyebrow: 'ENVIRONMENTAL DNA',
    title: 'EVERY SAMPLE',
    emphasis: 'TELLS A STORY.',
    description: 'Trace the evidence. Reveal the ecosystem.',
  },
  {
    eyebrow: 'FROM OBSERVATION TO INSIGHT',
    title: 'DISCOVER.',
    emphasis: 'ANALYZE. UNDERSTAND.',
    description: 'One connected platform for marine discovery.',
  },
  {
    eyebrow: 'THE OCEAN, IN A NEW LIGHT',
    title: 'THE NEXT FRONTIER',
    emphasis: 'IS YOURS.',
    description: 'Enter the DeepDrishti research platform.',
  },
];

const VIDEO_SCRUB_STOPS = [
  { scroll: 0, video: 0 },
  { scroll: 0.15, video: 0.18 },
  { scroll: 0.3, video: 0.45 },
  { scroll: 0.5, video: 0.61 },
  { scroll: 0.7, video: 0.77 },
  { scroll: 0.85, video: 0.87 },
  { scroll: 1, video: 1 },
];

const VIDEO_SEEK_INTERVAL_MS = 1000 / 30;
const VIDEO_SEEK_THRESHOLD_SECONDS = 1 / 60;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function getSceneIndex(progress: number): number {
  if (progress < 0.15) return 0;
  if (progress < 0.3) return 1;
  if (progress < 0.5) return 2;
  if (progress < 0.7) return 3;
  if (progress < 0.85) return 4;
  return 5;
}

function getVideoProgress(progress: number): number {
  for (let index = 1; index < VIDEO_SCRUB_STOPS.length; index += 1) {
    const previous = VIDEO_SCRUB_STOPS[index - 1];
    const next = VIDEO_SCRUB_STOPS[index];
    if (progress <= next.scroll) {
      const segmentProgress = (progress - previous.scroll) / (next.scroll - previous.scroll);
      return previous.video + segmentProgress * (next.video - previous.video);
    }
  }
  return 1;
}

function prefersStaticExperience(): boolean {
  if (typeof window === 'undefined') return false;
  const compact = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const lowPower = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2;
  return compact || lowPower;
}

export const HeroPage: React.FC<HeroPageProps> = ({ onEnterPlatform }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const pendingProgressRef = useRef(0);
  const lastVideoSeekRef = useRef(0);
  const [activeScene, setActiveScene] = useState(0);
  const [depthMeters, setDepthMeters] = useState(0);
  const [isStaticExperience, setIsStaticExperience] = useState(prefersStaticExperience);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const staticExperience = isStaticExperience || prefersReducedMotion;

  const updateScrollProgress = useCallback((scrollProgress: number) => {
    pendingProgressRef.current = clamp(scrollProgress, 0, 1);
    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const progress = pendingProgressRef.current;
      const sceneIndex = getSceneIndex(progress);
      const roundedDepth = Math.round((progress * 4800) / 100) * 100;

      stageRef.current?.style.setProperty('--hero-progress', String(progress));
      progressBarRef.current?.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
      progressFillRef.current?.style.setProperty('transform', `scaleY(${progress})`);
      setActiveScene((previous) => (previous === sceneIndex ? previous : sceneIndex));
      setDepthMeters((previous) => (previous === roundedDepth ? previous : roundedDepth));

      const video = videoRef.current;
      const now = performance.now();
      if (
        !staticExperience &&
        video &&
        video.readyState >= HTMLMediaElement.HAVE_METADATA &&
        !video.seeking &&
        now - lastVideoSeekRef.current >= VIDEO_SEEK_INTERVAL_MS
      ) {
        const targetTime = getVideoProgress(progress) * video.duration;
        if (Math.abs(video.currentTime - targetTime) > VIDEO_SEEK_THRESHOLD_SECONDS) {
          video.currentTime = targetTime;
          lastVideoSeekRef.current = now;
        }
      }
    });
  }, [staticExperience]);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => setPrefersReducedMotion(reducedMotionQuery.matches);
    const updateExperienceSize = () => setIsStaticExperience(prefersStaticExperience());
    const track = trackRef.current;
    const progressProxy = { value: 0 };
    const smoothProgress = gsap.quickTo(progressProxy, 'value', {
      duration: 0.24,
      ease: 'power2.out',
      onUpdate: () => updateScrollProgress(progressProxy.value),
    });

    updateReducedMotion();
    window.addEventListener('resize', updateExperienceSize);
    reducedMotionQuery.addEventListener('change', updateReducedMotion);

    const scrollTrigger = track
      ? ScrollTrigger.create({
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => smoothProgress(self.progress),
          onRefresh: (self) => {
            progressProxy.value = self.progress;
            updateScrollProgress(self.progress);
          },
        })
      : null;

    return () => {
      window.removeEventListener('resize', updateExperienceSize);
      reducedMotionQuery.removeEventListener('change', updateReducedMotion);
      scrollTrigger?.kill();
      gsap.killTweensOf(progressProxy);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [updateScrollProgress]);

  const scrollToProgress = (targetProgress: number) => {
    const track = trackRef.current;
    if (!track) return;

    const scrollRange = Math.max(track.offsetHeight - window.innerHeight, 0);
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: trackTop + scrollRange * targetProgress,
      behavior: staticExperience ? 'auto' : 'smooth',
    });
  };

  const enterPlatform = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    onEnterPlatform();
  };

  const scene = SCENES[activeScene];

  return (
    <div
      ref={trackRef}
      className={`hero-page${isStaticExperience ? ' hero-page--compact' : ''}${prefersReducedMotion ? ' hero-page--reduced-motion' : ''}`}
    >
      <main
        ref={stageRef}
        className="hero-stage"
        data-scene={activeScene}
        aria-label="DeepDrishti cinematic introduction"
      >
        {!staticExperience && (
          <video
            ref={videoRef}
            className="hero-video"
            src="/videos/deepdrishti-exploration-60fps.mp4"
            poster="/images/deepdrishti-exploration-poster.jpg"
            preload="metadata"
            muted
            playsInline
            tabIndex={-1}
            aria-hidden="true"
          />
        )}
        <div className="hero-video-shade" aria-hidden="true" />
        <div className="hero-chart-grid" aria-hidden="true" />

        <header className="hero-topbar">
          <div className="hero-wordmark" aria-label="DeepDrishti">
            <BrandMark size={30} inverted />
            <span>DEEPDRISHTI</span>
          </div>
          <div className="hero-topbar-meta">MARINE INTELLIGENCE / 01</div>
          <button type="button" className="hero-skip" onClick={enterPlatform}>
            Skip introduction <ArrowRight size={14} aria-hidden="true" />
          </button>
        </header>

        <div className="hero-frame-mark hero-frame-mark--top-left" aria-hidden="true">
          DD / 01
        </div>
        <div className="hero-frame-mark hero-frame-mark--top-right" aria-hidden="true">
          OCEAN EXPLORATION
        </div>

        <section className={`hero-copy${activeScene === 0 ? ' hero-copy--intro' : ''}${activeScene === 5 ? ' hero-copy--final' : ''}`}>
          <div key={activeScene} className="hero-copy-inner" aria-live="polite" aria-atomic="true">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-mark" aria-hidden="true" />
              {scene.eyebrow}
            </div>
            <h1 className="hero-title">
              {scene.title}
              {scene.emphasis && <span>{scene.emphasis}</span>}
            </h1>
            <p className="hero-description">{scene.description}</p>

            {activeScene === 0 && (
              <div className="hero-actions">
                <button
                  type="button"
                  className="hero-button hero-button--primary"
                  onClick={() => scrollToProgress(0.16)}
                >
                  BEGIN EXPLORATION <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="hero-button hero-button--secondary"
                  onClick={() => scrollToProgress(0.86)}
                >
                  EXPLORE THE PLATFORM <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            )}

            {activeScene === 5 && (
              <div className="hero-actions hero-actions--final">
                <button
                  type="button"
                  className="hero-button hero-button--primary"
                  onClick={enterPlatform}
                >
                  ENTER DEEPDRISHTI <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="hero-button hero-button--secondary"
                  onClick={() => scrollToProgress(0)}
                >
                  REPLAY DESCENT
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="hero-telemetry" aria-label="Illustrative cinematic information">
          <div className="hero-telemetry-heading">
            <ScanLine size={13} aria-hidden="true" />
            CINEMATIC SEQUENCE
          </div>
          <div className="hero-telemetry-warning">ILLUSTRATIVE ONLY · NOT LIVE DATA</div>
          <div className="hero-telemetry-row">
            <span>DEPTH / ILLUSTRATIVE</span>
            <strong>{depthMeters.toLocaleString()} M</strong>
          </div>
          <div className="hero-telemetry-row">
            <span>COORDINATES / ILLUSTRATIVE</span>
            <strong>18°55′N · 72°49′E</strong>
          </div>
          <div className="hero-telemetry-row">
            <span>EXPEDITION / ILLUSTRATIVE</span>
            <strong>DD-CINEMA-01</strong>
          </div>
          <div className="hero-telemetry-status">
            <span className="hero-status-dot" aria-hidden="true" />
            VISUAL SEQUENCE · NO SENSOR FEED
          </div>
        </aside>

        {activeScene === 2 && (
          <div className="hero-science-note hero-science-note--life" aria-hidden="true">
            <span>PELAGIC ZONE</span>
            <i />
            <span>HIDDEN BIODIVERSITY</span>
          </div>
        )}

        {activeScene === 3 && (
          <div className="hero-dna-motif" aria-hidden="true">
            <div className="hero-dna-label">eDNA / SEQUENCE TRACE</div>
            <div className="hero-dna-helix">
              {['A', 'T', 'C', 'G', 'T', 'A', 'G'].map((base, index) => (
                <span key={`${base}-${index}`} style={{ '--base-index': index } as React.CSSProperties}>
                  {base}
                </span>
              ))}
            </div>
            <div className="hero-dna-caption">VISUAL MOTIF · NOT SAMPLE DATA</div>
          </div>
        )}

        {activeScene < 5 && (
          <div className="hero-scroll-cue" aria-hidden="true">
            <span>SCROLL TO DESCEND</span>
            <ArrowDown size={14} />
          </div>
        )}

        <div
          ref={progressBarRef}
          className="hero-progress"
          role="progressbar"
          aria-label="Cinematic sequence progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
        >
          <div ref={progressFillRef} className="hero-progress-fill" />
          <div className="hero-progress-ticks" aria-hidden="true">
            <span>00</span>
            <span>30</span>
            <span>70</span>
            <span>100</span>
          </div>
        </div>

        <footer className="hero-footer">
          <span>DEEPDRISHTI / MARINE BIODIVERSITY INTELLIGENCE</span>
          <span>SCROLL SEQUENCE {String(activeScene + 1).padStart(2, '0')} / 06</span>
        </footer>
      </main>
    </div>
  );
};

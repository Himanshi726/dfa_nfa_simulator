import React from 'react';
import { CircuitBoard, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="landing-page">
      <div className="landing-background">
        {/* Animated ambient orbs */}
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      
      <div className="landing-content">
        <div className="landing-logo-container">
          <div className="landing-logo-bg"></div>
          <CircuitBoard size={48} className="landing-logo" />
        </div>
        
        <h1 className="landing-title">Finite Automata Simulator</h1>
        <p className="landing-subtitle">
          An elegant, interactive environment for exploring DFA, NFA, ε-NFA, and Regular Expressions with real-time trace tables and formal mathematical definitions.
        </p>
        
        <button className="landing-button" onClick={onStart}>
          <span className="button-text">Enter Simulator</span>
          <ArrowRight size={20} className="button-icon" />
          <div className="button-glow"></div>
        </button>

        <div className="landing-features">
          <div className="feature">
            <h3>Visual Design</h3>
            <p>Drag, drop, and connect states effortlessly.</p>
          </div>
          <div className="feature">
            <h3>Simulation Engine</h3>
            <p>Step-by-step playback with active state lighting.</p>
          </div>
          <div className="feature">
            <h3>Formal Definitions</h3>
            <p>Live 5-tuple updates and academic rigor.</p>
          </div>
          <div className="feature">
            <h3>Regular Expressions</h3>
            <p>Convert regex to ε-NFA via Thompson's Construction.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

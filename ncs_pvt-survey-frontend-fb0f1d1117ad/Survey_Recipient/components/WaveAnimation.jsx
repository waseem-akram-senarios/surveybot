"use client";
import { useState, useEffect } from "react";
import { Box } from "@mui/material";

const WaveAnimation = ({ audioLevel = 0 }) => {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase((prev) => prev + 0.1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const amplitude = 10 + (audioLevel / 255) * 40;
  const baseAmplitude = 15;

  const generateWavePath = (baseY, amplitudeMultiplier, phaseOffset = 0) => {
    const currentAmplitude = baseAmplitude + amplitude * amplitudeMultiplier;
    const phase = animationPhase + phaseOffset;

    return `M0,${baseY} 
            Q${150 + Math.sin(phase) * currentAmplitude},${
      baseY - currentAmplitude + Math.cos(phase * 1.2) * 8
    } 
            ${300},${baseY + Math.sin(phase * 0.8) * (currentAmplitude * 0.5)} 
            T${600 + Math.cos(phase * 0.6) * 20},${
      baseY + Math.sin(phase * 1.1) * currentAmplitude * 0.3
    } 
            T${900 + Math.sin(phase * 0.9) * 15},${
      baseY + Math.cos(phase * 1.3) * currentAmplitude * 0.4
    } 
            T${1200},${baseY + Math.sin(phase * 0.7) * currentAmplitude * 0.2} 
            V60 H0 Z`;
  };

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60px",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        style={{ position: "absolute", bottom: 0 }}
      >
        <path d={generateWavePath(30, 0.8, 0)} fill="rgba(25, 88, 247, 0.1)" />
        <path
          d={generateWavePath(35, 1.0, 0.5)}
          fill="rgba(25, 88, 247, 0.15)"
        />
        <path
          d={generateWavePath(40, 1.2, 1.0)}
          fill="rgba(25, 88, 247, 0.2)"
        />
      </svg>
    </Box>
  );
};

export default WaveAnimation;

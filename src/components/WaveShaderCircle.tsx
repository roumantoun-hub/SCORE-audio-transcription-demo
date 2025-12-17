import { useEffect, useRef, useState } from 'react';

interface WaveShaderCircleProps {
  size?: string;
}

export function WaveShaderCircle({ size = '800px' }: WaveShaderCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const mouseMoveTrigger = useRef(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    // Trigger animation on mouse move
    mouseMoveTrigger.current = Date.now();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const pixelSize = parseInt(size);
    canvas.width = pixelSize;
    canvas.height = pixelSize;

    const centerX = pixelSize / 2;
    const centerY = pixelSize / 2;
    const radius = pixelSize / 2;

    // Wave configuration
    const numberOfWaves = 30;
    let time = 0;
    let brownianOffsets: number[] = new Array(numberOfWaves).fill(0);
    let brownianVelocities: number[] = new Array(numberOfWaves).fill(0);
    
    // Each line has its own random properties
    const lineProperties = Array.from({ length: numberOfWaves }, () => ({
      frequency: 0.015 + Math.random() * 0.015,
      amplitude: 5 + Math.random() * 8,
      speed: 0.3 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    }));
    
    // Electric pulse points for each line
    const electricPulses: Array<Array<{ x: number; offset: number; life: number }>> = Array.from({ length: numberOfWaves }, () => []);
    
    // Water ripple waves
    const waterRipples: Array<{ x: number; y: number; radius: number; maxRadius: number; opacity: number }> = [];
    
    // Low frame rate control
    let frameCounter = 0;
    const lowFpsInterval = 6; // Update water ripples and big changes every 6 frames
    let lastLowFpsOffsets: number[] = new Array(numberOfWaves).fill(0);
    let targetLowFpsOffsets: number[] = new Array(numberOfWaves).fill(0);

    const drawWaves = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      frameCounter++;
      const isLowFpsFrame = frameCounter % lowFpsInterval === 0;
      
      // Create circular clipping mask
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw horizontal parallel wavy lines
      const spacing = pixelSize / numberOfWaves;
      
      // Check if mouse moved recently (within last 100ms)
      const timeSinceMouseMove = Date.now() - mouseMoveTrigger.current;
      const isMouseMoving = timeSinceMouseMove < 100;
      
      for (let i = 0; i < numberOfWaves; i++) {
        const baseY = i * spacing;
        const props = lineProperties[i];
        
        // Calculate distance from center for radial fade
        const distanceFromCenter = Math.abs(baseY - centerY);
        const normalizedDistance = distanceFromCenter / (pixelSize / 2);
        // Much darker at center (donut/black hole effect), brighter at edges
        const radialBrightness = 0.05 + Math.pow(normalizedDistance, 2) * 0.95;
        
        // Apply Brownian motion only when mouse is moving on the circle
        if (isMouseMoving && isHovered) {
          brownianVelocities[i] += (Math.random() - 0.5) * 2.0; // Increased from 1.2
          brownianVelocities[i] *= 0.93; // Damping
          brownianOffsets[i] += brownianVelocities[i];
          brownianOffsets[i] *= 0.97; // Slow return to origin
          
          // Update low FPS offset targets on low FPS frames
          if (isLowFpsFrame) {
            targetLowFpsOffsets[i] = (Math.random() - 0.5) * 50; // Big jumps
          }
          
          // Randomly spawn electric pulses (more frequent)
          if (Math.random() < 0.15) {
            electricPulses[i].push({
              x: Math.random() * pixelSize,
              offset: (Math.random() - 0.5) * 50, // Increased from 35
              life: 1.0
            });
          }
        } else {
          brownianOffsets[i] *= 0.92; // Reset slowly
          brownianVelocities[i] *= 0.88;
          
          if (isLowFpsFrame) {
            targetLowFpsOffsets[i] *= 0.8; // Decay
          }
        }
        
        // Interpolate low FPS offsets for choppy effect
        lastLowFpsOffsets[i] += (targetLowFpsOffsets[i] - lastLowFpsOffsets[i]) * 0.2;
        
        // Update electric pulses
        electricPulses[i] = electricPulses[i].filter(pulse => {
          pulse.life -= 0.05;
          return pulse.life > 0;
        });
        
        // Calculate glow intensity based on motion
        const glowIntensity = Math.abs(brownianVelocities[i]) * 3;
        
        // Draw glow layers (4 layers now - added extra bright thick layer)
        for (let layer = 0; layer < 4; layer++) {
          ctx.beginPath();
          
          if (layer === 0) {
            // Extra bright and thick layer
            ctx.strokeStyle = `rgba(255, 255, 255, ${(0.6 + glowIntensity * 0.3) * radialBrightness})`;
            ctx.lineWidth = 5;
            ctx.shadowBlur = 20;
            ctx.shadowColor = `rgba(255, 255, 255, ${0.9 * radialBrightness})`;
          } else if (layer === 1) {
            // Outer glow
            ctx.strokeStyle = `rgba(255, 255, 255, ${(0.05 + glowIntensity * 0.05) * radialBrightness})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = `rgba(255, 255, 255, ${0.6 * radialBrightness})`;
          } else if (layer === 2) {
            // Mid glow
            ctx.strokeStyle = `rgba(255, 255, 255, ${(0.15 + glowIntensity * 0.1) * radialBrightness})`;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(255, 255, 255, ${0.4 * radialBrightness})`;
          } else {
            // Core line
            ctx.strokeStyle = `rgba(255, 255, 255, ${(0.4 + glowIntensity * 0.2) * radialBrightness})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 3;
            ctx.shadowColor = `rgba(255, 255, 255, ${0.8 * radialBrightness})`;
          }
          
          // Draw horizontal wavy line with unique properties for each line
          for (let x = 0; x < pixelSize; x += 2) {
            // Each line has its own wave pattern
            const wave1 = Math.sin(x * props.frequency + time * props.speed + props.phase) * props.amplitude;
            const wave2 = Math.sin(x * props.frequency * 1.3 - time * props.speed * 0.7 + props.phase * 1.5) * props.amplitude * 0.5;
            const wave3 = Math.cos(x * props.frequency * 0.6 + time * props.speed * 0.4 + props.phase * 0.8) * props.amplitude * 0.4;
            
            // Add stronger electric noise
            const electricNoise = (Math.random() - 0.5) * 3;
            
            // Add electric pulses effect
            let pulseOffset = 0;
            electricPulses[i].forEach(pulse => {
              const distance = Math.abs(x - pulse.x);
              if (distance < 80) {
                const influence = (1 - distance / 80) * pulse.life;
                pulseOffset += pulse.offset * influence;
              }
            });
            
            const y = baseY + wave1 + wave2 + wave3 + brownianOffsets[i] + electricNoise + pulseOffset + lastLowFpsOffsets[i];
            
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.stroke();
        }
        
        // Reset shadow for next line
        ctx.shadowBlur = 0;
      }
      
      // Generate new water ripples on mouse move
      if (isMouseMoving && isHovered && Math.random() < 0.1) {
        waterRipples.push({
          x: mousePos.current.x * (pixelSize / parseInt(size)),
          y: mousePos.current.y * (pixelSize / parseInt(size)),
          radius: 0,
          maxRadius: 150 + Math.random() * 100,
          opacity: 0.4 + Math.random() * 0.3
        });
      }
      
      // Draw and update water ripples (only on low FPS frames for choppy effect)
      if (isLowFpsFrame) {
        waterRipples.forEach((ripple, index) => {
          ripple.radius += 12; // Bigger jumps instead of smooth
          ripple.opacity *= 0.85; // Faster fade
          
          if (ripple.opacity < 0.01 || ripple.radius > ripple.maxRadius) {
            waterRipples.splice(index, 1);
          }
        });
      }
      
      // Draw water ripples every frame but with choppy positions
      waterRipples.forEach((ripple) => {
        // Draw ripple circles
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const offset = i * 15;
          ctx.arc(ripple.x, ripple.y, ripple.radius + offset, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.opacity * (0.3 - i * 0.1)})`;
          ctx.lineWidth = 2 - i * 0.5;
          ctx.stroke();
        }
      });
      
      ctx.restore();
      
      time += 0.05;
      requestAnimationFrame(drawWaves);
    };

    drawWaves();
  }, [isHovered, size]);

  return (
    <canvas 
      ref={canvasRef} 
      className="rounded-full transition-transform duration-300" 
      style={{ 
        width: size, 
        height: size,
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
        cursor: 'pointer',
        boxShadow: isHovered ? '0 0 30px rgba(255, 255, 255, 0.2)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    />
  );
}
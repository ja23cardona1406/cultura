import React, { useState, useEffect } from 'react';
import { Skull, Flame, Eye, Zap } from 'lucide-react';

interface FloatingIconProps {
  Icon: React.ComponentType<any>;
  delay: number;
  duration: number;
  startX: number;
  startY: number;
}

const FloatingIcon: React.FC<FloatingIconProps> = ({ Icon, delay, duration, startX, startY }) => {
  return (
    <div
      className="absolute opacity-20 text-red-500"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        animation: `float ${duration}s infinite ease-in-out`,
        animationDelay: `${delay}s`
      }}
    >
      <Icon size={24} />
    </div>
  );
};

const MaintenancePage: React.FC = () => {
  const [glitchText, setGlitchText] = useState<string>('MANTENIMIENTO');
  const [timeLeft, setTimeLeft] = useState<number>(666);

  useEffect(() => {
    // Añadir estilos CSS al head del documento
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float {
        0%, 100% {
          transform: translateY(0px) rotate(0deg);
        }
        50% {
          transform: translateY(-20px) rotate(10deg);
        }
      }
      
      @keyframes glitch {
        0% { transform: translate(0); }
        20% { transform: translate(-2px, 2px); }
        40% { transform: translate(-2px, -2px); }
        60% { transform: translate(2px, 2px); }
        80% { transform: translate(2px, -2px); }
        100% { transform: translate(0); }
      }
      
      .glitch-text {
        animation: glitch 0.3s infinite;
      }
      
      .animate-spin-slow {
        animation: spin 8s linear infinite;
      }
      
      @keyframes pulse-glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(239, 68, 68, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
        }
      }
    `;
    document.head.appendChild(style);

    const glitchInterval = setInterval(() => {
      const glitchChars = ['M', 'A', 'N', 'T', 'E', 'N', 'I', 'M', 'I', 'E', 'N', 'T', 'O', '█', '▓', '▒', '░'];
      const originalText = 'MANTENIMIENTO';
      
      // Aplicar glitch random
      let newText = originalText.split('').map((char, index) => {
        return Math.random() < 0.1 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char;
      }).join('');
      
      setGlitchText(newText);
      
      // Restaurar texto original después de 100ms
      setTimeout(() => setGlitchText(originalText), 100);
    }, 2000);

    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 666);
    }, 1000);

    return () => {
      clearInterval(glitchInterval);
      clearInterval(countdownInterval);
      // Limpiar el estilo cuando el componente se desmonte
      document.head.removeChild(style);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black to-purple-900/20"></div>
      
      {/* Floating icons */}
      <FloatingIcon Icon={Skull} delay={0} duration={6} startX={10} startY={20} />
      <FloatingIcon Icon={Flame} delay={1} duration={8} startX={80} startY={30} />
      <FloatingIcon Icon={Eye} delay={2} duration={7} startX={20} startY={70} />
      <FloatingIcon Icon={Zap} delay={3} duration={5} startX={90} startY={60} />
      <FloatingIcon Icon={Skull} delay={4} duration={9} startX={60} startY={10} />
      <FloatingIcon Icon={Flame} delay={5} duration={6} startX={40} startY={80} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        
        {/* Pulsating pentagram */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 animate-pulse">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-red-600 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <polygon points="50,5 61,35 85,35 67,53 78,82 50,65 22,82 33,53 15,35 39,35" />
            </svg>
          </div>
          <div className="absolute inset-0 w-32 h-32 animate-spin-slow">
            <div className="w-full h-full border-2 border-red-500/30 rounded-full"></div>
          </div>
        </div>

        {/* Error title with glitch effect */}
        <h1 className="text-6xl md:text-8xl font-black mb-4 text-center">
          <span className="bg-gradient-to-r from-red-500 via-purple-500 to-red-500 bg-clip-text text-transparent animate-pulse">
            ERROR
          </span>
        </h1>

        {/* Glitch maintenance text */}
        <h2 className="text-2xl md:text-4xl font-bold mb-8 text-center tracking-wider">
          <span className="text-red-400 font-mono glitch-text">
            {glitchText}
          </span>
        </h2>

        {/* Spooky message */}
        <div className="text-center mb-8 max-w-2xl">
          <p className="text-lg md:text-xl text-gray-300 mb-4 leading-relaxed">
            Las fuerzas oscuras están trabajando en las sombras...
          </p>
          <p className="text-md text-gray-400 mb-6">
            La aplicación se encuentra temporalmente en el inframundo. 
            Los demonios del código están realizando rituales de optimización.
          </p>
        </div>

        {/* Countdown timer */}
        <div className="bg-red-900/20 border-2 border-red-500/30 rounded-lg p-6 mb-8 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-red-400 mb-2 font-semibold">Tiempo estimado para la resurrección:</p>
            <div className="text-4xl font-mono text-red-300 font-bold">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Animated flames */}
        <div className="flex space-x-4 mb-8">
          {[...Array(5)].map((_, i) => (
            <Flame 
              key={i}
              className="text-red-500 animate-bounce" 
              size={32}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '2s'
              }}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 
                     border border-red-500 rounded-lg font-semibold transition-all duration-300 
                     hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95"
            onClick={() => window.location.reload()}
          >
            Invocar Actualización
          </button>
          <button 
            className="px-8 py-3 bg-transparent border-2 border-red-500 text-red-400 hover:bg-red-500/10 
                     rounded-lg font-semibold transition-all duration-300 hover:text-red-300 
                     hover:border-red-400 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]"
            onClick={() => window.history.back()}
          >
            Regresar al Plano Mortal
          </button>
        </div>

        {/* Footer with skulls */}
        <div className="mt-16 flex items-center space-x-4 text-gray-500">
          <Skull size={20} />
          <span className="text-sm font-mono">Sistema poseído temporalmente</span>
          <Skull size={20} />
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
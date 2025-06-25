import React, { useState, useEffect } from 'react';
import { Settings, Shield, FileText, Clock } from 'lucide-react';

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
      className="absolute opacity-30 text-blue-600"
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
  const [timeLeft, setTimeLeft] = useState<number>(3600); // 1 hora
  const [pulseState, setPulseState] = useState<boolean>(true);

  useEffect(() => {
    // Añadir estilos CSS al head del documento
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float {
        0%, 100% {
          transform: translateY(0px) rotate(0deg);
        }
        50% {
          transform: translateY(-15px) rotate(5deg);
        }
      }
      
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      .gradient-bg {
        background: linear-gradient(-45deg, #1e3a8a, #3b82f6, #1d4ed8, #2563eb);
        background-size: 400% 400%;
        animation: gradientShift 15s ease infinite;
      }
      
      .institutional-glow {
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
      }
      
      .pulse-border {
        animation: pulse-border 2s infinite;
      }
      
      @keyframes pulse-border {
        0%, 100% {
          border-color: rgba(59, 130, 246, 0.5);
        }
        50% {
          border-color: rgba(59, 130, 246, 1);
        }
      }
    `;
    document.head.appendChild(style);

    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 3600);
    }, 1000);

    const pulseInterval = setInterval(() => {
      setPulseState(prev => !prev);
    }, 1500);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(pulseInterval);
      // Limpiar el estilo cuando el componente se desmonte
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-slate-800 overflow-hidden relative">
      {/* Animated background overlay */}
      <div className="absolute inset-0 gradient-bg opacity-5"></div>
      
      {/* Floating institutional icons */}
      <FloatingIcon Icon={Shield} delay={0} duration={8} startX={15} startY={25} />
      <FloatingIcon Icon={FileText} delay={2} duration={10} startX={85} startY={20} />
      <FloatingIcon Icon={Settings} delay={4} duration={9} startX={10} startY={75} />
      <FloatingIcon Icon={Clock} delay={6} duration={7} startX={90} startY={70} />
      <FloatingIcon Icon={Shield} delay={8} duration={11} startX={70} startY={15} />
      <FloatingIcon Icon={FileText} delay={10} duration={6} startX={30} startY={80} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        
        {/* Colombian flag colors accent */}
        <div className="mb-8 flex space-x-2">
          <div className="w-16 h-2 bg-yellow-400 rounded"></div>
          <div className="w-16 h-2 bg-blue-600 rounded"></div>
          <div className="w-16 h-2 bg-red-500 rounded"></div>
        </div>

        {/* Institutional emblem placeholder */}
        <div className="mb-8 relative">
          <div className={`w-24 h-24 transition-all duration-1000 ${pulseState ? 'scale-105' : 'scale-100'}`}>
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center institutional-glow">
              <Shield size={48} className="text-white" />
            </div>
          </div>
        </div>

        {/* Main title */}
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-center">
          <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 bg-clip-text text-transparent">
            ERROR
          </span>
        </h1>

        {/* Subtitle */}
        <h2 className="text-xl md:text-2xl font-semibold mb-8 text-center text-blue-700">
          Sistema deshabilitado por falta de permisos
        </h2>

        {/* Professional message */}
        <div className="text-center mb-8 max-w-3xl">
          <p className="text-lg md:text-xl text-slate-600 mb-4 leading-relaxed">
            Estimado contribuyente, nuestros sistemas se encuentran en mantenimiento para brindarle un mejor servicio.
          </p>
          <p className="text-md text-slate-500 mb-6">
            Estamos realizando actualizaciones técnicas para optimizar la plataforma y garantizar 
            la seguridad de sus operaciones tributarias. Agradecemos su comprensión.
          </p>
        </div>

        {/* Service status */}
        <div className="bg-white/80 backdrop-blur-sm border-2 pulse-border rounded-lg p-6 mb-8 institutional-glow">
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <Settings className="text-blue-600 mr-2 animate-spin" size={24} />
              <p className="text-blue-700 font-semibold text-lg">Tiempo estimado de finalización:</p>
            </div>
            <div className="text-3xl font-mono text-blue-800 font-bold mb-2">
              {formatTime(timeLeft)}
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Servicios siendo restaurados</span>
            </div>
          </div>
        </div>

        {/* Available services info */}
        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-lg p-6 mb-8 max-w-2xl">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 text-center">Servicios Disponibles Durante el Mantenimiento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
            <div className="flex items-center">
              <FileText size={16} className="text-blue-600 mr-2" />
              <span>Consulta de información general</span>
            </div>
            <div className="flex items-center">
              <Shield size={16} className="text-blue-600 mr-2" />
              <span>Línea de atención telefónica</span>
            </div>
            <div className="flex items-center">
              <Clock size={16} className="text-blue-600 mr-2" />
              <span>Horarios de atención presencial</span>
            </div>
            <div className="flex items-center">
              <Settings size={16} className="text-blue-600 mr-2" />
              <span>Formularios descargables</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button 
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                     text-white border border-blue-500 rounded-lg font-semibold transition-all duration-300 
                     hover:shadow-lg hover:scale-105 active:scale-95 institutional-glow"
            onClick={() => window.location.reload()}
          >
            Verificar Estado
          </button>
          <button 
            className="px-8 py-3 bg-transparent border-2 border-blue-600 text-blue-700 hover:bg-blue-50 
                     rounded-lg font-semibold transition-all duration-300 hover:text-blue-800 
                     hover:border-blue-700"
            onClick={() => window.history.back()}
          >
            Volver
          </button>
        </div>

        

        {/* Footer */}
        <div className="mt-12 flex items-center space-x-3 text-slate-400 text-sm">
          <Shield size={16} />
          <span>Sistema seguro y confiable</span>
          <Shield size={16} />
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
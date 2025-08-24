import { useState, useEffect } from 'react';
import App from '../App';

// Servizi essenziali del sistema
interface SystemService {
  name: string;
  status: 'loading' | 'ready' | 'error';
  progress: number;
}

const ESSENTIAL_SERVICES: SystemService[] = [
  { name: 'Database Connection', status: 'loading', progress: 0 },
  { name: 'Authentication Service', status: 'loading', progress: 0 },
  { name: 'User Interface', status: 'loading', progress: 0 },
  { name: 'Data Models', status: 'loading', progress: 0 },
  { name: 'Core Components', status: 'loading', progress: 0 },
];

const Index = () => {
  const [services, setServices] = useState<SystemService[]>(ESSENTIAL_SERVICES);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [currentService, setCurrentService] = useState(0);

  useEffect(() => {
    const loadServices = async () => {
      for (let i = 0; i < services.length; i++) {
        setCurrentService(i);
        
        // Simula il caricamento progressivo di ogni servizio
        await new Promise(resolve => {
          const updateProgress = () => {
            setServices(prev => 
              prev.map((service, index) => 
                index === i 
                  ? { ...service, progress: Math.min(service.progress + 20, 100) }
                  : service
              )
            );
          };

          const interval = setInterval(updateProgress, 200);
          
          setTimeout(() => {
            clearInterval(interval);
            setServices(prev => 
              prev.map((service, index) => 
                index === i 
                  ? { ...service, status: 'ready', progress: 100 }
                  : service
              )
            );
            resolve(void 0);
          }, 1000);
        });
      }

      // Sistema pronto
      setTimeout(() => {
        setIsSystemReady(true);
      }, 500);
    };

    loadServices();
  }, []);

  if (isSystemReady) {
    return <App />;
  }

  const overallProgress = services.reduce((acc, service) => acc + service.progress, 0) / services.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 w-full max-w-md shadow-2xl border border-white/20">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i className="fas fa-truck-fast text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Sistema RM</h1>
          <p className="text-blue-200">Inizializzazione servizi essenziali...</p>
        </div>

        {/* Progress Bar Generale */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-blue-200 mb-2">
            <span>Progresso generale</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 shadow-lg"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Lista servizi */}
        <div className="space-y-3">
          {services.map((service, index) => (
            <div key={service.name} className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
              service.status === 'ready' 
                ? 'bg-green-500/20 border border-green-400/30' 
                : index === currentService 
                  ? 'bg-blue-500/20 border border-blue-400/30 scale-105' 
                  : 'bg-white/10 border border-white/10'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  service.status === 'ready' 
                    ? 'bg-green-400 shadow-lg shadow-green-400/50' 
                    : service.status === 'loading' 
                      ? 'bg-blue-400 animate-pulse shadow-lg shadow-blue-400/50' 
                      : 'bg-red-400'
                }`}></div>
                <span className="text-white text-sm font-medium">{service.name}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {service.status === 'ready' ? (
                  <i className="fas fa-check text-green-400"></i>
                ) : service.status === 'loading' ? (
                  <i className="fas fa-spinner animate-spin text-blue-400"></i>
                ) : (
                  <i className="fas fa-exclamation-triangle text-red-400"></i>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status attuale */}
        <div className="mt-6 text-center">
          <p className="text-blue-200 text-sm">
            {currentService < services.length 
              ? `Caricamento: ${services[currentService]?.name}...`
              : 'Finalizzazione sistema...'
            }
          </p>
        </div>
      </div>

      {/* Particles/Animation Background */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
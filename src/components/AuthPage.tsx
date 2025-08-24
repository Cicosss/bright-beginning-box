import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { generateAvatarUrl, AVATAR_STYLES, AVATAR_SEEDS } from '../utils/avatarGenerator';

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState(AVATAR_STYLES[0].id);
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(AVATAR_SEEDS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const avatarUrl = generateAvatarUrl(selectedAvatarStyle, selectedAvatarSeed);
        const { error } = await signUp(email, password, name, avatarUrl);
        if (error) throw error;
        setError('Controlla la tua email per completare la registrazione');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="card w-full max-w-md animate-scale-in">
        <div className="card-header text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
            <i className="fas fa-truck-fast text-primary-foreground text-2xl"></i>
          </div>
          <h1 className="card-title text-primary">Sistema RM</h1>
          <p className="card-description">
            {isSignUp ? 'Crea il tuo account' : 'Accedi al sistema'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-content space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Il tuo nome"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Scegli il tuo Avatar</label>
                
                {/* Avatar Preview */}
                <div className="flex justify-center mb-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary shadow-lg">
                    <img 
                      src={generateAvatarUrl(selectedAvatarStyle, selectedAvatarSeed)} 
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Style Selector */}
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1">Stile</label>
                  <select
                    value={selectedAvatarStyle}
                    onChange={(e) => setSelectedAvatarStyle(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {AVATAR_STYLES.map(style => (
                      <option key={style.id} value={style.id}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Avatar Variations */}
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_SEEDS.slice(0, 12).map(seed => (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setSelectedAvatarSeed(seed)}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                        selectedAvatarSeed === seed 
                          ? 'border-primary scale-110 shadow-md' 
                          : 'border-gray-300 hover:border-primary/50 hover:scale-105'
                      }`}
                    >
                      <img 
                        src={generateAvatarUrl(selectedAvatarStyle, seed)} 
                        alt={`Avatar ${seed}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="email@esempio.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3"
          >
            {loading ? (
              <i className="fas fa-spinner animate-spin mr-2"></i>
            ) : null}
            {isSignUp ? 'Registrati' : 'Accedi'}
          </button>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline text-sm"
            >
              {isSignUp 
                ? 'Hai già un account? Accedi'
                : 'Non hai un account? Registrati'
              }
            </button>
          </div>
        </form>
      </div>

      {/* Particles/Animation Background */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary-glow/30 rounded-full animate-pulse"
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

export default AuthPage;
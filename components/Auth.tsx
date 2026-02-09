
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset-password';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

useEffect(() => {
  const flagged = sessionStorage.getItem('sb-recovery') === '1';
  if (flagged) {
    setMode('reset-password');
    sessionStorage.removeItem('sb-recovery');
  }

  supabase.auth.getSession().catch(console.error);

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      setMode('reset-password');
    }
  });

  return () => subscription.unsubscribe();
}, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === 'register') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: name,
              phone: phone
            }
          }
        });
        
        if (signUpError) throw signUpError;

        if (signUpData.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            full_name: name,
            phone: phone
          });
          if (profileError) console.error("Erro ao salvar perfil:", profileError);
        }
        setShowSuccessModal(true);
      } 
      else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('E-mail ou senha inválidos.');
          }
          throw error;
        }
      }
      else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${APP_URL}/`,
        });
        
        if (resetError) throw resetError;
        setSuccessMessage('Se este e-mail estiver cadastrado, você receberá um link de recuperação em instantes.');
      }
      else if (mode === 'reset-password') {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        
        setSuccessMessage('Senha atualizada com sucesso! Você já pode entrar.');
        // Remove os tokens da URL após o sucesso
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => setMode('login'), 2000);
      }
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: { redirectTo: `${APP_URL}/` },
      });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl transform animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Quase lá!</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Enviamos um link de confirmação para <span className="font-bold text-indigo-600">{email}</span>. Verifique sua caixa de entrada e spam.
            </p>
            <button 
              onClick={() => {
                setShowSuccessModal(false);
                setMode('login');
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100"
            >
              Ir para Login
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md w-full glass p-8 rounded-2xl shadow-xl border border-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900 tracking-tight">Copa 2026</h1>
          <p className="text-slate-500 text-sm mt-2">
            {mode === 'register' ? 'Crie sua conta para participar' : 
             mode === 'forgot' ? 'Recupere o acesso à sua conta' : 
             mode === 'reset-password' ? 'Defina sua nova senha' :
             'Entre para palpitar nos jogos'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errorMessage}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl animate-in slide-in-from-top-2">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">WhatsApp</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
            </>
          )}
          
          {(mode !== 'reset-password' && mode !== 'forgot') && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>
          )}

          {mode === 'forgot' && (
             <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Seu E-mail de cadastro</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-slate-700">
                  {mode === 'reset-password' ? 'Nova Senha' : 'Senha'}
                </label>
                {mode === 'login' && (
                  <button 
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMessage(null); setSuccessMessage(null); }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  data-testid="password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  data-testid="password-toggle"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l2.1 2.1A10.86 10.86 0 0 0 1.5 12c1.64 3.05 5.06 6.75 10.5 6.75 2.2 0 4.1-.6 5.7-1.5l3.76 3.76a.75.75 0 1 0 1.06-1.06l-18-18ZM12 17.25c-3.54 0-6.13-2.14-7.6-5.25.7-1.37 1.74-2.71 3.28-3.64l2.08 2.08a3.75 3.75 0 0 0 4.8 4.8l1.94 1.94c-.98.44-2.09.67-3.5.67Zm3.02-4.45-5.82-5.82a3.75 3.75 0 0 1 5.82 5.82Z" />
                      <path d="M12 6.75c3.54 0 6.13 2.14 7.6 5.25-.5.98-1.17 1.95-2.03 2.8a.75.75 0 0 0 1.06 1.06c1.1-1.1 1.95-2.32 2.6-3.49C20.86 8.32 17.44 4.5 12 4.5c-1.28 0-2.47.2-3.56.54a.75.75 0 1 0 .46 1.43c.93-.3 1.98-.47 3.1-.47Z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5c5.44 0 8.86 3.82 10.5 7.5-1.64 3.68-5.06 7.5-10.5 7.5S3.14 15.68 1.5 12C3.14 8.32 6.56 4.5 12 4.5Zm0 12.75a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Zm0-2.25a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {mode === 'reset-password' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  data-testid="confirm-password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  data-testid="confirm-password-toggle"
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l2.1 2.1A10.86 10.86 0 0 0 1.5 12c1.64 3.05 5.06 6.75 10.5 6.75 2.2 0 4.1-.6 5.7-1.5l3.76 3.76a.75.75 0 1 0 1.06-1.06l-18-18ZM12 17.25c-3.54 0-6.13-2.14-7.6-5.25.7-1.37 1.74-2.71 3.28-3.64l2.08 2.08a3.75 3.75 0 0 0 4.8 4.8l1.94 1.94c-.98.44-2.09.67-3.5.67Zm3.02-4.45-5.82-5.82a3.75 3.75 0 0 1 5.82 5.82Z" />
                      <path d="M12 6.75c3.54 0 6.13 2.14 7.6 5.25-.5.98-1.17 1.95-2.03 2.8a.75.75 0 0 0 1.06 1.06c1.1-1.1 1.95-2.32 2.6-3.49C20.86 8.32 17.44 4.5 12 4.5c-1.28 0-2.47.2-3.56.54a.75.75 0 1 0 .46 1.43c.93-.3 1.98-.47 3.1-.47Z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5c5.44 0 8.86 3.82 10.5 7.5-1.64 3.68-5.06 7.5-10.5 7.5S3.14 15.68 1.5 12C3.14 8.32 6.56 4.5 12 4.5Zm0 12.75a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Zm0-2.25a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {loading ? 'Processando...' : 
             mode === 'register' ? 'Criar Conta' : 
             mode === 'forgot' ? 'Enviar Link de Recuperação' : 
             mode === 'reset-password' ? 'Atualizar Senha' :
             'Entrar'}
          </button>
        </form>

        {mode !== 'forgot' && mode !== 'reset-password' && (
          <div className="mt-6">
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-sm">Ou entre com</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleSocialLogin('google')} className="flex items-center justify-center py-2 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors gap-2">
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                <span className="text-sm font-bold text-slate-700">Google</span>
              </button>
              <button onClick={() => handleSocialLogin('facebook')} className="flex items-center justify-center py-2 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors gap-2">
                <img src="https://www.facebook.com/favicon.ico" className="w-4 h-4" alt="FB" />
                <span className="text-sm font-bold text-slate-700">Facebook</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          {(mode === 'forgot' || mode === 'reset-password') ? (
            <button
              onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMessage(null); }}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center justify-center gap-1 mx-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar para o Login
            </button>
          ) : (
            <button
              onClick={() => { 
                setMode(mode === 'login' ? 'register' : 'login'); 
                setErrorMessage(null); 
                setSuccessMessage(null); 
              }}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
            >
              {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem uma conta? Entrar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

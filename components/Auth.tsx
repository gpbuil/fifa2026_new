
import React, { useState } from 'react';
import { supabase } from '../supabase';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        // 1. Criar o usuário no Auth
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

        // 2. Se o usuário foi criado, salvar na tabela profiles
        if (signUpData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            full_name: name,
            phone: phone
          });
          // Se houver erro no profile, não trava o processo, mas logamos
          if (profileError) console.error("Erro ao salvar perfil:", profileError);
        }

        setShowSuccessModal(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'github' | 'linkedin') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      {/* Modal de Sucesso */}
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
              Enviamos um link de confirmação para <span className="font-bold text-indigo-600">{email}</span>. Verifique sua caixa de entrada para ativar sua conta.
            </p>
            <button 
              onClick={() => {
                setShowSuccessModal(false);
                setIsRegistering(false);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md w-full glass p-8 rounded-2xl shadow-xl border border-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900 tracking-tight">Copa 2026</h1>
          <p className="text-slate-500 text-sm mt-2">
            {isRegistering ? 'Crie sua conta para participar' : 'Entre para palpitar nos jogos'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Seu nome"
                  required={isRegistering}
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
                  required={isRegistering}
                />
              </div>
            </>
          )}
          
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
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {loading ? 'Processando...' : isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-sm">Ou entre com</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleSocialLogin('google')} className="flex items-center justify-center py-2 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-sm font-medium">Google</span>
            </button>
            <button onClick={() => handleSocialLogin('facebook')} className="flex items-center justify-center py-2 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-sm font-medium">Facebook</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
          >
            {isRegistering ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;

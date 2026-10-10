import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  ensureUserDocuments,
} from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const translateFirebaseAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'E-mail ou senha incorretos. Verifique seus dados ou entre com o Google.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'Este e-mail já está cadastrado. Acesse a aba Entrar.';
    }
    if (code === 'auth/weak-password') {
      return 'A senha deve conter pelo menos 6 caracteres.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'O provedor E-mail/Senha ainda não foi ativado no console do Firebase deste projeto. Utilize o botão "Continuar com Google" ou ative Email/Password em Authentication > Sign-in method no Firebase Console.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'A janela de login com Google foi fechada antes da conclusão.';
    }
    return err?.message || 'Não foi possível concluir a autenticação. Tente novamente.';
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureUserDocuments(cred.user);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(translateFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Informe um endereço de e-mail válido.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, trimmedEmail);
        setInfoMsg('Enviamos um link de redefinição de senha para o seu e-mail.');
      } catch (err: any) {
        setErrorMsg(translateFirebaseAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        if (name.trim().length < 2) {
          setErrorMsg('Informe seu nome ou nome do canal (mínimo 2 caracteres).');
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(cred.user, { displayName: name.trim().slice(0, 80) });
        await ensureUserDocuments(cred.user, name.trim());
        onSuccess();
        onClose();
      } else {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        await ensureUserDocuments(cred.user);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(translateFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0B1024] border border-slate-800 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'login' && 'Entrar no NEXUS AI STUDIO'}
              {mode === 'register' && 'Criar Conta Gratuita'}
              {mode === 'reset' && 'Recuperar Senha'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Autenticação protegida via Firebase Authentication
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Fechar janela de login"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {mode !== 'reset' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white text-slate-900 font-semibold text-sm rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2.5 min-h-[44px] disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Continuar com Google (Recomendado)</span>
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="h-px bg-slate-800 flex-1" />
                <span>ou use seu e-mail</span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>
            </>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Seu Nome ou Canal
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Lucas Criador"
                    className="w-full pl-9 pr-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  maxLength={140}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="w-full pl-9 pr-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Senha</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setErrorMsg(null);
                        setInfoMsg(null);
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold text-sm rounded-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'Processando...'
                  : mode === 'login'
                  ? 'Entrar na Conta'
                  : mode === 'register'
                  ? 'Cadastrar Conta'
                  : 'Enviar Link de Recuperação'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800/80 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <p>
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="text-cyan-400 font-semibold hover:underline"
                >
                  Começar grátis
                </button>
              </p>
            ) : (
              <p>
                Já possui cadastro?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="text-cyan-400 font-semibold hover:underline"
                >
                  Fazer login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

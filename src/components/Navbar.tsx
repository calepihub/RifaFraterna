import React, { useState } from 'react';
import { Shield, LogOut, User, Menu, X, Truck, MapPin } from 'lucide-react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';

interface NavbarProps {
  user: FirebaseUser | null;
  profile?: UserProfile | null;
  currentView: 'public' | 'admin';
  setView: (view: 'public' | 'admin') => void;
  onOpenProfile?: () => void;
  selectedRaffleTitle?: string | null;
  onBackToLanding?: () => void;
}

export default function Navbar({ 
  user, 
  profile,
  currentView, 
  setView,
  onOpenProfile,
  selectedRaffleTitle,
  onBackToLanding
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // The admin email from additional metadata is: tazmaniacrvg@gmail.com
  const isAdminUser = user && user.email === 'tazmaniacrvg@gmail.com';

  const handleLogin = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Erro de autenticação:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('public');
      if (onBackToLanding) onBackToLanding();
    } catch (err) {
      console.error('Erro de logout:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm">
      
      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        {onBackToLanding && selectedRaffleTitle && (
          <button
            onClick={onBackToLanding}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors mr-1 cursor-pointer"
            title="Voltar para a Lista de Rifas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="w-10 h-10 bg-slate-950 border-2 border-amber-500/40 rounded-lg flex items-center justify-center text-amber-500 font-serif font-black text-lg shadow-inner">
          G
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-none uppercase">
            Rifa Maçônica
          </h1>
          <p className="text-[10px] sm:text-xs text-amber-600 uppercase tracking-widest font-black leading-none mt-1">
            {selectedRaffleTitle ? selectedRaffleTitle : "Campanhas do Gestor"}
          </p>
        </div>
      </div>

      {/* Desktop Actions */}
      <div className="hidden md:flex items-center gap-3">
        {isAdminUser && (
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              id="nav-view-public"
              onClick={() => setView('public')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                currentView === 'public'
                  ? 'bg-slate-950 text-white shadow-md border border-slate-800/50'
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              Página de Vendas
            </button>
            <button
              id="nav-view-admin"
              onClick={() => setView('admin')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-600 hover:text-amber-600 hover:bg-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              Painel do Gestor
            </button>
          </div>
        )}

        {user ? (
          <div className="flex items-center gap-2">
            {/* Delivery Profile Button */}
            <button
              id="nav-delivery-profile-btn"
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer text-slate-700 hover:text-amber-700"
              title="Cadastro de Endereço de Entrega"
            >
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <div className="flex flex-col text-left">
                <span className="font-bold leading-none">
                  {profile?.city ? `${profile.city} - ${profile.state}` : 'Meu Endereço'}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  {profile?.fullAddress ? 'Entrega Cadastrada ✓' : 'Completar Cadastro ⚠️'}
                </span>
              </div>
            </button>

            {/* User Details */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700">
              <img
                src={user.photoURL || ''}
                alt={user.displayName || 'User'}
                className="w-6 h-6 rounded-full border border-amber-300 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col text-left">
                <span className="text-xs text-slate-800 font-bold leading-none max-w-[120px] truncate">
                  {isAdminUser ? 'Carlos Alexandre Pinheiro' : (profile?.name?.split(' ')[0] || user.displayName?.split(' ')[0])}
                </span>
                <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                  {isAdminUser ? 'Owner / Gestor' : 'Participante'}
                </span>
              </div>
              <button
                id="nav-logout-btn"
                onClick={handleLogout}
                title="Sair da Conta"
                className="p-1 text-slate-400 hover:text-red-600 transition-colors ml-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          selectedRaffleTitle && (
            <button
              id="nav-login-btn"
              onClick={handleLogin}
              disabled={authLoading}
              className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm border border-slate-700/30 hover:border-amber-500/20"
            >
              <User className="w-3.5 h-3.5 text-amber-500" />
              {authLoading ? 'Conectando...' : 'Entrar com Google'}
            </button>
          )
        )}
      </div>

      {/* Mobile Menu Toggler */}
      <div className="flex md:hidden">
        <button
          id="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-amber-600 hover:bg-slate-50 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 space-y-3 shadow-lg">
          {isAdminUser && (
            <div className="flex flex-col gap-1">
              <button
                id="mobile-nav-public"
                onClick={() => {
                  setView('public');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg ${
                  currentView === 'public'
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Página de Vendas
              </button>
              <button
                id="mobile-nav-admin"
                onClick={() => {
                  setView('admin');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${
                  currentView === 'admin'
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                Painel do Gestor (Carlos Alexandre)
              </button>
            </div>
          )}

          {user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenProfile) onOpenProfile();
              }}
              className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded-lg text-xs text-left"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="font-bold text-slate-800">Endereço de Entrega do Prêmio</p>
                  <p className="text-[10px] text-slate-400">
                    {profile?.city ? `${profile.city} - ${profile.state}` : 'Completar Cadastro'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-amber-600 font-bold">Editar ›</span>
            </button>
          )}

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            {user ? (
              <div className="flex items-center gap-2.5">
                <img
                  src={user.photoURL || ''}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-amber-300"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-xs text-slate-800 font-bold">{profile?.name || user.displayName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                </div>
              </div>
            ) : null}

            {user ? (
              <button
                id="mobile-logout-btn"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-bold px-2 py-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair
              </button>
            ) : (
              selectedRaffleTitle && (
                <button
                  id="mobile-login-btn"
                  onClick={() => {
                    handleLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm border border-slate-800"
                >
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  Entrar com Google
                </button>
              )
            )}
          </div>
        </div>
      )}

    </header>
  );
}

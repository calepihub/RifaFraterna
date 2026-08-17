/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  seedDatabaseIfEmpty, 
  listenToRaffleConfig, 
  listenToRaffleNumbers, 
  listenToReservations, 
  listenToUserProfile,
  calculateStats,
  listenToRaffles
} from './services/raffleService';
import { RaffleNumber, Reservation, RaffleConfig, RaffleStats, UserProfile, RaffleItem } from './types';
import Navbar from './components/Navbar';
import PublicView from './components/PublicView';
import AdminView from './components/AdminView';
import PaymentDialog from './components/PaymentDialog';
import ProfileModal from './components/ProfileModal';
import LandingPage from './components/LandingPage';
import AddressOnboarding from './components/AddressOnboarding';
import { DEFAULT_ACTIVE_NUMBERS, ONGOING_RAFFLES, OWNER_DETAILS } from './data';
import { Compass } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentView, setView] = useState<'public' | 'admin'>('public');

  // Multi-Raffle selected state (null means landing page)
  const [selectedRaffleId, setSelectedRaffleId] = useState<string | null>(null);

  // Database States
  const [config, setConfig] = useState<RaffleConfig | null>(null);
  const [numbers, setNumbers] = useState<RaffleNumber[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Modal / Success Checkout state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [checkoutSummary, setCheckoutSummary] = useState<{
    numbers: string[];
    totalValue: number;
    name: string;
    phone: string;
  } | null>(null);

  const isAdminUser = user && user.email === OWNER_DETAILS.email;

  // Multi-Raffle dynamic state list
  const [raffles, setRaffles] = useState<RaffleItem[]>([]);

  // 0. Dynamic Raffles Tracker
  useEffect(() => {
    const unsubscribe = listenToRaffles((loadedRaffles) => {
      setRaffles(loadedRaffles);
    });
    return () => unsubscribe();
  }, [user]);

  // 1. Authentication & User Profile Tracker
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        if (currentUser.email === OWNER_DETAILS.email) {
          seedDatabaseIfEmpty();
        }

        // Attach listener to member profile
        if (unsubscribeProfile) unsubscribeProfile();
        unsubscribeProfile = listenToUserProfile(currentUser.uid, (userProf) => {
          setProfile(userProf);
        });
      } else {
        setProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // 2. Dynamic Listeners based on selectedRaffleId
  useEffect(() => {
    if (!selectedRaffleId) {
      setConfig(null);
      setNumbers([]);
      return;
    }

    const unsubscribeConfig = listenToRaffleConfig(selectedRaffleId, (updatedConfig) => {
      setConfig(updatedConfig);
    });

    const unsubscribeNumbers = listenToRaffleNumbers(selectedRaffleId, (updatedNumbers) => {
      setNumbers(updatedNumbers);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeNumbers();
    };
  }, [selectedRaffleId]);

  // 3. Conditional Admin-Only Reservations Listener
  useEffect(() => {
    if (!isAdminUser || !selectedRaffleId) {
      setReservations([]);
      return;
    }

    const unsubscribeReservations = listenToReservations(selectedRaffleId, (updatedReservations) => {
      setReservations(updatedReservations);
    });

    return () => unsubscribeReservations();
  }, [user, isAdminUser, selectedRaffleId]);

  // Handle successful reservation checkout callback
  const handleReservationSuccess = (
    reservationId: string,
    reservedNumbers: string[],
    totalValue: number,
    name: string,
    phone: string
  ) => {
    setCheckoutSummary({
      numbers: reservedNumbers,
      totalValue,
      name,
      phone
    });
    setPaymentOpen(true);
  };

  // Compile real-time numbers statistics
  const stats: RaffleStats = config 
    ? calculateStats(numbers, config.pricePerNumber)
    : { total: 100, sold: 0, reserved: 0, available: 100, percentSold: 0, totalEarnings: 0, pendingEarnings: 0 };

  // Loading Screen
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4 text-slate-800">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-xl bg-white border border-slate-200 shadow-sm shadow-indigo-100">
          <Compass className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
        <p className="font-sans text-xs uppercase tracking-widest text-indigo-600 font-bold">
          Carregando...
        </p>
      </div>
    );
  }

  // Active numbers board loading screen when inside a raffle
  if (selectedRaffleId && numbers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4 text-slate-800">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-xl bg-white border border-slate-200 shadow-sm shadow-indigo-100">
          <Compass className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
        <p className="font-sans text-xs uppercase tracking-widest text-indigo-600 font-bold">
          Carregando Cartela...
        </p>
      </div>
    );
  }

  // Find currently selected raffle information
  const selectedRaffle = ONGOING_RAFFLES.find(r => r.id === selectedRaffleId);

  // Verification if logged-in member has complete shipping/delivery registration details
  const isAddressComplete = profile && 
    profile.name && 
    profile.phone && 
    profile.city && 
    profile.state && 
    profile.fullAddress;

  const needsAddressOnboarding = user && !isAdminUser && !isAddressComplete && selectedRaffleId;
  const needsLoginGate = !user && selectedRaffleId && !isAdminUser;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* 1. Header Navigation */}
      <Navbar 
        user={user} 
        profile={profile}
        currentView={currentView} 
        setView={setView} 
        onOpenProfile={() => setProfileModalOpen(true)}
        selectedRaffleTitle={selectedRaffle ? selectedRaffle.title : null}
        onBackToLanding={() => setSelectedRaffleId(null)}
      />

      {/* 2. Main Content Board */}
      <main className="flex-1 pb-16">
        {!selectedRaffleId ? (
          /* Landing Page: Show all ongoing raffles */
          <LandingPage
            user={user}
            raffles={raffles}
            onSelectRaffle={(raffleId) => {
              setSelectedRaffleId(raffleId);
              setView('public');
            }}
            onViewAdmin={() => {
              // Set the default to whatever the first raffle is or 'picanheira'
              setSelectedRaffleId(raffles[0]?.id || 'picanheira');
              setView('admin');
            }}
          />
        ) : needsLoginGate ? (
          /* Login Gate: User must authenticate with Google first */
          <div className="max-w-md mx-auto my-12 px-4">
            {/* Back button */}
            <button
              onClick={() => setSelectedRaffleId(null)}
              className="mb-6 flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-bold transition-all cursor-pointer"
            >
              &larr; Voltar para o Início
            </button>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-6 text-center space-y-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.185 15.44 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.55-4.46 10.55-10.74 0-.72-.08-1.275-.175-1.83H12.24z"/>
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800">Identificação Necessária</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Para selecionar as dezenas e participar da rifa <strong className="text-slate-800 font-bold">{selectedRaffle?.title}</strong>, é necessário entrar com sua conta Google e preencher seu cadastro de entrega.
                </p>
              </div>

              <button
                onClick={async () => {
                  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
                  const provider = new GoogleAuthProvider();
                  try {
                    await signInWithPopup(auth, provider);
                  } catch (err) {
                    console.error('Erro de login Google:', err);
                  }
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer uppercase tracking-wider"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.185 15.44 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.55-4.46 10.55-10.74 0-.72-.08-1.275-.175-1.83H12.24z"/>
                </svg>
                Entrar com Conta Google
              </button>

              <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto">
                🔒 Seus dados são confidenciais e protegidos, utilizados estritamente pelo organizador para o envio do prêmio.
              </p>
            </div>
          </div>
        ) : needsAddressOnboarding ? (
          /* Onboarding Form: Mandatory address & phone registration before selecting numbers */
          <AddressOnboarding
            user={user}
            raffleTitle={selectedRaffle.title}
            onSuccess={(updatedProfile) => {
              setProfile(updatedProfile);
            }}
            onCancel={() => setSelectedRaffleId(null)}
          />
        ) : currentView === 'admin' ? (
          /* Admin dashboard */
          isAdminUser ? (
            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {/* Selector to switch between which raffle to manage in the Admin View */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Selecione a Rifa para Gerenciar</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Altere os status e configs de cada campanha de prêmios separadamente.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {raffles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRaffleId(r.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        selectedRaffleId === r.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {r.title}
                    </button>
                  ))}
                </div>
              </div>

              {config && (
                <AdminView
                  raffleId={selectedRaffleId}
                  numbers={numbers}
                  reservations={reservations}
                  config={config}
                  stats={stats}
                  raffles={raffles}
                  onSelectRaffle={setSelectedRaffleId}
                />
              )}
            </div>
          ) : (
            <div className="max-w-md mx-auto my-16 bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto border border-amber-200">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Acesso Restrito ao Gestor
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Este painel de alteração e controle de status das cotas é exclusivo do organizador da rifa: <br/>
                <strong className="text-slate-800 font-semibold">Carlos Alexandre Pinheiro</strong> <br/>
                <span className="font-mono text-[11px] text-slate-400">({OWNER_DETAILS.email})</span>
              </p>
              <button
                onClick={() => setView('public')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs transition cursor-pointer"
              >
                Voltar para a Página de Vendas
              </button>
            </div>
          )
        ) : (
          /* Public sales board for selected raffle */
          config && (
            <PublicView
              numbers={numbers}
              config={config}
              stats={stats}
              user={user}
              profile={profile}
              onOpenProfile={() => setProfileModalOpen(true)}
              onReservationSuccess={handleReservationSuccess}
            />
          )
        )}
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p>© 2026 Rifa Digital Pro. Todos os direitos reservados.</p>
          <p className="text-[10px] text-slate-400 font-medium">
            Organizado por Carlos Alexandre Pinheiro • Apoio cultural e filantrópico. Sorteio de acordo com os resultados oficiais da Loteria Federal.
          </p>
        </div>
      </footer>

      {/* 4. Delivery Address Registration Modal */}
      {user && (
        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          user={user}
          profile={profile}
          onProfileSaved={(updatedProf) => setProfile(updatedProf)}
        />
      )}

      {/* 5. Simple Reservation Success Dialog with a clean OK button */}
      {checkoutSummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center space-y-6 animate-scale-up">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Reserva Realizada!
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                As suas dezenas <strong className="text-indigo-600 font-bold">{checkoutSummary.numbers.map(n => `#${n}`).join(', ')}</strong> foram reservadas com sucesso!
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 font-medium leading-normal mt-2 text-left">
                ⚠️ <strong>Aviso Importante:</strong> Nenhum pagamento deverá ser feito agora. Por favor, aguarde a solicitação direta do dono da Rifa para realizar o PIX.
              </div>
            </div>

            <button
              onClick={() => {
                setPaymentOpen(false);
                setCheckoutSummary(null);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer transition-all active:scale-95"
            >
              Ok, Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Compass, Coins, Truck, Calendar, CheckCircle2, 
  Clock, ShieldCheck, AlertCircle, ShoppingCart, 
  ChevronRight, Sparkles, User, MapPin, Edit3, LogIn
} from 'lucide-react';
import { RaffleNumber, RaffleConfig, RaffleStats, UserProfile } from '../types';
import { reserveNumbers } from '../services/raffleService';
import { User as FirebaseUser, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import MemberCard from './MemberCard';

interface PublicViewProps {
  numbers: RaffleNumber[];
  config: RaffleConfig;
  stats: RaffleStats;
  user: FirebaseUser | null;
  profile: UserProfile | null;
  onOpenProfile: () => void;
  onReservationSuccess: (reservationId: string, reservedNumbers: string[], totalValue: number, name: string, phone: string) => void;
}

export default function PublicView({
  numbers,
  config,
  stats,
  user,
  profile,
  onOpenProfile,
  onReservationSuccess
}: PublicViewProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronize input fields with user profile if available
  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.phone) setPhone(profile.phone);
      if (profile.email) setEmail(profile.email);
    } else if (user) {
      if (user.displayName) setName(user.displayName);
      if (user.email) setEmail(user.email);
    }
  }, [profile, user]);

  // Numbers belonging to current user
  const userNumbers = numbers.filter(
    (n) => (n.buyerEmail && user?.email && n.buyerEmail.toLowerCase() === user.email.toLowerCase()) ||
           (n.buyerName && profile?.name && n.buyerName.toLowerCase() === profile.name.toLowerCase())
  );

  // Format currency helper
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Auto format Brazilian Phone number mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Formatting: (XX) XXXXX-XXXX
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  // Handle number click selection
  const handleNumberClick = (numId: string, status: 'available' | 'reserved' | 'sold') => {
    if (status !== 'available') return;

    setSelected((prev) => {
      if (prev.includes(numId)) {
        return prev.filter((id) => id !== numId);
      } else {
        return [...prev, numId];
      }
    });
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Erro de login Google:', err);
    }
  };

  // Form Submission for Reservation
  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (selected.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos um número.');
      return;
    }
    if (!name.trim() || name.trim().length < 3) {
      setErrorMessage('Por favor, insira o seu nome completo (mínimo 3 letras).');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Por favor, insira um número de telefone/WhatsApp válido.');
      return;
    }

    setLoading(true);
    try {
      const totalVal = selected.length * config.pricePerNumber;
      
      // Save in Firestore with member delivery details
      const resId = await reserveNumbers(
        config.id,
        selected,
        name.trim(),
        phone,
        email.trim(),
        config.pricePerNumber,
        {
          buyerUid: user?.uid || '',
          buyerCity: profile?.city || '',
          buyerState: profile?.state || '',
          buyerAddress: profile?.fullAddress || ''
        }
      );

      // Trigger callback to parent to show Payment modal
      onReservationSuccess(resId, selected, totalVal, name.trim(), phone);
      
      // Reset selections
      setSelected([]);
    } catch (err) {
      console.error(err);
      setErrorMessage('Ocorreu um erro ao registrar sua reserva. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // The numbers board must always be fully visible with all 100 numbers (00-99)
  // Dynamically compile a full 100-number grid, merging real-time database updates
  const displayedNumbers = Array.from({ length: 100 }, (_, i) => {
    const numStr = i.toString().padStart(2, '0');
    const dbNumber = numbers.find(n => n.id === numStr);
    return dbNumber || {
      id: numStr,
      number: numStr,
      raffleId: config.id,
      status: 'available' as const,
      buyerName: '',
      buyerPhone: '',
      buyerEmail: '',
      reservationId: '',
      updatedAt: new Date()
    };
  });

  const isAddressComplete = profile && profile.fullAddress && profile.city && profile.state;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. Hero / Premium Promotion Banner */}
      <section className="relative overflow-hidden bg-slate-900 border border-amber-500/15 rounded-xl shadow-lg p-6 flex flex-col lg:flex-row gap-6 items-center text-white">
        {/* Background visual helpers */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full filter blur-3xl -z-10"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-slate-955/20 rounded-full filter blur-2xl -z-10"></div>

        {/* Real Premium Knife Image */}
        <div className="w-full lg:w-1/3 flex flex-col items-center shrink-0">
          <div className="relative w-full max-w-[280px] aspect-[4/3] rounded-xl border border-amber-500/20 bg-slate-950 flex items-center justify-center overflow-hidden group shadow-md">
            <img
              src="/faca.jpeg"
              alt="Faca Picanheira Artesanal Maçônica"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&q=80&w=400";
              }}
            />

            {/* Badge */}
            <div className="absolute top-2 right-2 bg-slate-950 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
              Aço Inox 420C
            </div>
          </div>
        </div>

        {/* Promotion Details */}
        <div className="w-full lg:w-2/3 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 font-serif uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-400" /> Edição Especial de Colecionador
            </span>
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 uppercase tracking-wider">
              <Truck className="w-3 h-3 text-emerald-400" /> Frete Grátis com Rastreamento
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-amber-400 uppercase tracking-tight">
              Faca Picanheira Artesanal 9" Maçônica
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed font-medium">
              Lâmina em aço cirúrgico forjado com corte a laser do Esquadro & Compasso "G", cabo híbrido em madeira nobre e resina perolizada com moeda comemorativa. Acompanha bainha legítima em couro bovino costurada à mão.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-slate-200">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Lâmina</span>
              <span className="font-bold">9 Polegadas (23cm)</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Empunhadura</span>
              <span className="font-bold">Madeira & Resina</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Sorteio</span>
              <span className="font-bold">Loteria Federal</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Envio</span>
              <span className="font-bold text-emerald-400">Brasil Inteiro</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Metrics Bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-xs">
            {stats.sold}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Cotas Pagas</p>
            <p className="text-xs sm:text-sm font-bold text-slate-800">{stats.percentSold}% Concluído</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold text-xs">
            {stats.reserved}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Reservadas</p>
            <p className="text-xs sm:text-sm font-bold text-slate-800">Aguardando PIX</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-xs">
            {stats.available}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Disponíveis</p>
            <p className="text-xs sm:text-sm font-bold text-slate-800">Escolha a sua</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-xs">
            R$
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Preço Cota</p>
            <p className="text-xs sm:text-sm font-bold text-slate-800">{formatBRL(config.pricePerNumber)}</p>
          </div>
        </div>

        {/* Global Progress Bar row */}
        <div className="col-span-2 lg:col-span-4 bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Arrecadação</span>
          <div className="relative flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div 
              style={{ width: `${stats.percentSold}%` }}
              className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out"
            ></div>
          </div>
          <span className="text-xs font-mono text-slate-600 font-bold shrink-0">{stats.sold}/{stats.total} Cotas</span>
        </div>
      </section>

      {/* 3. Main grid & Purchase basket Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Number Selection Board (Cols span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-tight">
                Visualização de Cotas
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique nos números livres e informe seus dados ao lado para reservar.
              </p>
            </div>
          </div>

          {/* Caption / Legend in exact High Density Format */}
          <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase bg-white border border-slate-200 rounded-xl p-3 justify-center sm:justify-start shadow-sm">
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 bg-slate-100 border border-slate-200 rounded"></span>
              Disponível
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 bg-amber-400 rounded"></span>
              Reservado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 bg-emerald-500 rounded"></span>
              Pago
            </span>
          </div>

          {/* Numbers Board Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 overflow-y-auto pr-1">
              {displayedNumbers.map((num) => {
                const isNumSelected = selected.includes(num.id);
                
                let styleClass = "";
                if (num.status === 'available') {
                  if (isNumSelected) {
                    styleClass = "bg-amber-500 text-slate-950 cursor-pointer ring-2 ring-amber-200 font-extrabold scale-[1.03] border-amber-600";
                  } else {
                    styleClass = "bg-slate-100 text-slate-600 border border-slate-200 hover:border-amber-500 hover:bg-amber-50/20 cursor-pointer";
                  }
                } else if (num.status === 'reserved') {
                  styleClass = "bg-amber-400 text-slate-950 cursor-default font-bold";
                } else if (num.status === 'sold') {
                  styleClass = "bg-emerald-500 text-white cursor-default font-semibold";
                }

                return (
                  <button
                    key={num.id}
                    id={`num-bubble-${num.id}`}
                    onClick={() => handleNumberClick(num.id, num.status)}
                    disabled={num.status !== 'available'}
                    className={`h-9 flex items-center justify-center rounded text-[11px] font-mono font-bold transition-all ${styleClass}`}
                  >
                    {num.id}
                  </button>
                );
              })}
            </div>
            
            {displayedNumbers.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                Nenhum número ativo configurado.
              </div>
            )}
          </div>
        </div>

        {/* Purchase Basket & Member Profile Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Member Card or Login Prompt */}
          {user ? (
            <MemberCard
              user={user}
              profile={profile}
              userNumbers={userNumbers}
              onEditProfile={onOpenProfile}
            />
          ) : (
            <div className="bg-slate-900 border border-amber-500/15 text-white rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Identifique-se como Associado</h4>
                  <p className="text-[10px] text-slate-300 font-medium">Conecte sua conta Google para salvar seu endereço de entrega.</p>
                </div>
              </div>
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-white text-slate-950 hover:bg-slate-100 font-extrabold py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-600" />
                Entrar com Google
              </button>
            </div>
          )}

          {/* Basket Aside */}
          <aside className="bg-white border border-slate-200 rounded-xl shadow-sm sticky top-24 overflow-hidden flex flex-col">
            
            {/* Sidebar header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                Nova Reserva de Cotas
              </h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                Live Sync
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Selected tickets wrapper */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Cotas Selecionadas</label>
                {selected.length === 0 ? (
                  <div className="text-center py-4 px-3 border border-dashed border-slate-200 rounded-lg text-slate-400 text-[11px] font-semibold bg-slate-50">
                    Nenhum número selecionado. Clique na cartela ao lado.
                  </div>
                ) : (
                  <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-bold text-amber-600 uppercase">Confirmados</span>
                      <span className="text-xs font-black text-amber-700">{selected.length} selecionada(s)</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {selected.map((num) => (
                        <span 
                          key={num} 
                          className="px-2 py-0.5 bg-slate-950 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded flex items-center gap-1"
                        >
                          #{num}
                          <button 
                            type="button"
                            onClick={() => setSelected(prev => prev.filter(id => id !== num))}
                            className="hover:text-red-400 font-bold ml-1 text-[9px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Total display */}
              {selected.length > 0 && (
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-500 font-semibold">Valor Total:</span>
                  <span className="text-emerald-600 font-bold text-sm">
                    {formatBRL(selected.length * config.pricePerNumber)}
                  </span>
                </div>
              )}

              {/* Shipping reminder note */}
              {user && !isAddressComplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Endereço de envio pendente</span>
                  </div>
                  <p className="text-[10px] text-amber-700">
                    Cadastre para onde enviaremos o prêmio caso seja contemplado.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="text-[10px] font-bold text-amber-600 hover:underline block pt-0.5 cursor-pointer"
                  >
                    Completar cadastro de entrega ›
                  </button>
                </div>
              )}

              {/* Error Box */}
              {errorMessage && (
                <div className="bg-red-50/80 border border-red-200 rounded-lg p-2.5 flex gap-2 items-start text-[11px] text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Highlight payment instruction: No payment until owner requests */}
              <div className="bg-amber-50 border-2 border-amber-500 rounded-lg p-3 text-[11px] text-amber-900 space-y-2 shadow-sm">
                <p className="font-extrabold text-amber-700 flex items-center gap-1.5 uppercase tracking-wide text-xs">
                  ⚠️ ALERTA DE PAGAMENTO IMPORTANTE:
                </p>
                <p className="font-black text-rose-700 leading-normal bg-white p-2 rounded border border-rose-200 text-center uppercase tracking-wide text-xs">
                  Nenhum pagamento deverá ser feito até a solicitação direta do dono da Rifa!
                </p>
                <p className="leading-relaxed text-[10px] text-slate-600 font-medium">
                  Após o dono autorizar e você realizar o pagamento, o comprovante deve ser enviado via WhatsApp para o número <strong className="text-slate-800 font-bold">(21) 98475-0005</strong> para ativação definitiva das suas cotas.
                </p>
              </div>

              {/* Input Fields */}
              <form onSubmit={handleReserve} className="space-y-3">
                <div>
                  <label htmlFor="buyer-name" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Nome Completo:
                  </label>
                  <input
                    id="buyer-name"
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="buyer-phone" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    WhatsApp para Contato:
                  </label>
                  <input
                    id="buyer-phone"
                    type="text"
                    required
                    placeholder="(21) 98765-4321"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="buyer-email" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    E-mail:
                  </label>
                  <input
                    id="buyer-email"
                    type="email"
                    placeholder="carlos@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-slate-800 font-medium"
                  />
                </div>

                {/* Confirm Sale Submit Button */}
                <button
                  id="submit-reserve-btn"
                  type="submit"
                  disabled={loading || selected.length === 0}
                  className="w-full bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-white font-extrabold py-2.5 rounded-lg text-xs shadow active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase border border-slate-800 hover:border-amber-500 tracking-wider"
                >
                  {loading ? 'Confirmando...' : 'Confirmar Reserva'}
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </form>
            </div>

            {/* Live Sync Status bar */}
            <div className="p-3 bg-slate-900 text-white shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold opacity-50 uppercase">Segurança Firebase</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Online</span>
                </div>
              </div>
            </div>

          </aside>
        </div>

      </div>

    </div>
  );
}

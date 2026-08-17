import React, { useEffect, useState } from 'react';
import { 
  Compass, Coins, Truck, ArrowRight, User, 
  LogIn, CheckCircle, Flame, Shield, Award, Sparkles 
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { OWNER_DETAILS } from '../data';
import { listenToRaffleNumbers, calculateStats } from '../services/raffleService';
import { RaffleNumber, RaffleStats, RaffleItem } from '../types';

interface LandingPageProps {
  user: FirebaseUser | null;
  raffles: RaffleItem[];
  onSelectRaffle: (raffleId: string) => void;
  onViewAdmin: () => void;
}

export default function LandingPage({
  user,
  raffles,
  onSelectRaffle,
  onViewAdmin
}: LandingPageProps) {

  const isAdminUser = user && user.email === OWNER_DETAILS.email;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white rounded-2xl p-8 sm:p-12 shadow-xl overflow-hidden border border-amber-500/15">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-slate-950/20 rounded-full filter blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-md text-amber-400 text-xs font-black uppercase tracking-widest font-serif">
            <Sparkles className="w-3.5 h-3.5" />
            Grande Rifa Maçônica
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none uppercase font-serif">
            Campanhas de Prêmios <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-300">
              Exclusivos de Colecionador
            </span>
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed font-medium">
            Participe das nossas campanhas institucionais e beneficentes organizadas pelo Gestor <strong className="text-white font-bold">{OWNER_DETAILS.name}</strong>. Adquira suas cotas por valores acessíveis, acompanhe os sorteios com total transparência e concorra a itens de altíssima qualidade artesanal.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {user && (
              <div className="flex items-center gap-3 bg-slate-950/50 border border-amber-500/20 px-4 py-2.5 rounded-xl">
                <img
                  src={user.photoURL || ''}
                  alt={user.displayName || 'Membro'}
                  className="w-8 h-8 rounded-full border border-amber-300 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Logado como</p>
                  <p className="text-xs font-black text-white">{user.displayName?.split(' ')[0]}</p>
                </div>
              </div>
            )}

            {isAdminUser && (
              <button
                onClick={onViewAdmin}
                className="bg-slate-950 hover:bg-slate-900 text-amber-400 border border-amber-500/30 hover:border-amber-400 font-extrabold py-3 px-6 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md cursor-pointer uppercase tracking-wider"
              >
                <Shield className="w-4 h-4" />
                Painel do Gestor
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Safety Notice Banner */}
      <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 uppercase tracking-tight">Sorteio Confiável via Loteria Federal</p>
            <p className="text-slate-500 mt-0.5">As dezenas correspondem aos resultados oficiais. Segurança jurídica, entrega garantida e frete cortesia.</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2.5 rounded-lg font-bold max-w-sm">
          ⚠️ O comprovante do PIX deve ser enviado via WhatsApp para o número <strong className="text-amber-950 font-black">{OWNER_DETAILS.receiptWhatsApp}</strong>.
        </div>
      </section>

      {/* Raffles Grid Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Campanhas de Prêmios Ativas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Selecione uma campanha abaixo para escolher suas dezenas e participar.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {raffles.map((raffle) => (
            <RaffleCard 
              key={raffle.id} 
              raffle={raffle} 
              onSelect={onSelectRaffle} 
            />
          ))}
        </div>
      </section>

    </div>
  );
}

// Sub-component to fetch and render stats for each raffle card dynamically in real-time
interface RaffleCardProps {
  key?: string;
  raffle: RaffleItem;
  onSelect: (raffleId: string) => void;
}

function RaffleCard({ raffle, onSelect }: RaffleCardProps) {
  const [numbers, setNumbers] = useState<RaffleNumber[]>([]);
  const [stats, setStats] = useState<RaffleStats | null>(null);

  // Subscribe to numbers for this specific raffle in real-time
  useEffect(() => {
    const unsubscribe = listenToRaffleNumbers(raffle.id, (updatedNumbers) => {
      setNumbers(updatedNumbers);
      const calculated = calculateStats(updatedNumbers, raffle.price);
      setStats(calculated);
    });

    return () => unsubscribe();
  }, [raffle.id, raffle.price]);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div 
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group border-b-4 hover:border-b-amber-500"
    >
      {/* Knife/Item Visual Photo representing the prize */}
      <div className="relative h-44 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-150">
        <img
          src="/faca.jpeg"
          alt={raffle.imageAlt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback if the image fails or hasn't loaded fully
            e.currentTarget.src = "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&q=80&w=400";
          }}
        />

        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-slate-950 text-amber-400 font-mono font-black text-xs px-3 py-1 rounded-md shadow-md border border-amber-500/20">
          Cota: {formatBRL(raffle.price)}
        </div>

        {/* Free Shipping Tag */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-xs border border-amber-500/10 text-emerald-400 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
          <Truck className="w-3 h-3 text-emerald-400" />
          Frete Grátis
        </div>
      </div>

      {/* Card Info */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <p className="text-[9px] uppercase font-bold text-amber-600 tracking-widest">
            {raffle.tagline}
          </p>
          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug uppercase tracking-tight">
            {raffle.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {raffle.prizeDescription}
          </p>
        </div>

        {/* Real-time stats */}
        <div className="space-y-2 border-t border-slate-100 pt-3.5">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-400">Progresso de Vendas</span>
            <span className="text-slate-800 font-bold">{stats ? stats.percentSold : 0}%</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div 
              style={{ width: `${stats ? stats.percentSold : 0}%` }}
              className="h-full bg-amber-500 rounded-full transition-all duration-700 ease-out"
            ></div>
          </div>

          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase pt-0.5 tracking-wider">
            <span>{stats ? stats.available : 100} Livres</span>
            <span>{stats ? stats.sold : 0} Pagas</span>
          </div>
        </div>

        <button
          onClick={() => onSelect(raffle.id)}
          className="w-full mt-2 bg-slate-950 hover:bg-amber-500 hover:text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800 hover:border-amber-500 text-white shadow-sm group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-500"
        >
          <span>Ver Rifa & Comprar</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

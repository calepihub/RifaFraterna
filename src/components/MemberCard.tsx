import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, RaffleNumber } from '../types';
import { MapPin, Phone, Truck, Edit3, ShieldCheck, Ticket, AlertCircle } from 'lucide-react';

interface MemberCardProps {
  user: FirebaseUser;
  profile: UserProfile | null;
  userNumbers: RaffleNumber[];
  onEditProfile: () => void;
}

export default function MemberCard({
  user,
  profile,
  userNumbers,
  onEditProfile
}: MemberCardProps) {
  const isAddressComplete = profile && profile.fullAddress && profile.city && profile.state;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
      
      {/* Header with Photo and Name */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={user.photoURL || profile?.photoURL || ''}
              alt={profile?.name || user.displayName || 'Associado'}
              className="w-12 h-12 rounded-xl border border-amber-200 object-cover shadow-xs"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                {profile?.name || user.displayName}
              </h4>
              <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-200 uppercase">
                Associado
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Edit Button */}
        <button
          id="member-card-edit-btn"
          onClick={onEditProfile}
          className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded-lg transition-colors"
          title="Editar Dados de Entrega"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* City, Phone and Shipping Address Overview */}
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-xs">
        
        {/* City and State */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-500" /> Localidade
          </span>
          <span className="font-bold text-slate-700">
            {profile?.city && profile?.state ? `${profile.city} - ${profile.state}` : (
              <span className="text-amber-600 font-medium text-[11px]">Não informada</span>
            )}
          </span>
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Phone className="w-3 h-3 text-emerald-500" /> WhatsApp
          </span>
          <span className="font-mono text-slate-700 font-semibold">
            {profile?.phone || <span className="text-amber-600 font-medium text-[11px]">Não informado</span>}
          </span>
        </div>

        {/* Full Address */}
        <div className="border-t border-slate-200/60 pt-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-0.5">
            <Truck className="w-3 h-3 text-amber-600" /> Endereço de Entrega
          </span>
          {isAddressComplete ? (
            <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
              {profile?.fullAddress}
            </p>
          ) : (
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" /> Cadastro incompleto
              </span>
              <button
                onClick={onEditProfile}
                className="text-[10px] font-bold text-amber-600 hover:underline"
              >
                Completar agora
              </button>
            </div>
          )}
        </div>

      </div>

      {/* User's Numbers in this Raffle */}
      {userNumbers.length > 0 && (
        <div className="border-t border-slate-100 pt-2.5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Ticket className="w-3 h-3 text-amber-600" /> Minhas Cotas ({userNumbers.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {userNumbers.map((num) => {
              const isPaid = num.status === 'sold';
              return (
                <span
                  key={num.id}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                    isPaid 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  #{num.id} {isPaid ? '✓' : '⏳'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Prize Shipping Security Badge */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span className="flex items-center gap-1 text-emerald-600 font-bold">
          <ShieldCheck className="w-3 h-3 text-emerald-500" /> Prêmio Entregue com Rastreio
        </span>
        <button
          onClick={onEditProfile}
          className="text-amber-600 font-bold hover:underline"
        >
          {isAddressComplete ? 'Alterar Endereço' : 'Cadastrar Endereço'}
        </button>
      </div>

    </div>
  );
}

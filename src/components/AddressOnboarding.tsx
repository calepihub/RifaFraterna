import React, { useState } from 'react';
import { Truck, ShieldCheck, AlertCircle, Phone, User, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';
import { saveUserProfile } from '../services/raffleService';

interface AddressOnboardingProps {
  user: FirebaseUser;
  raffleTitle: string;
  onSuccess: (profile: UserProfile) => void;
  onCancel: () => void;
}

const BRAZILIAN_STATES = [
  'RJ', 'SP', 'MG', 'ES', 'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'GO', 'MA', 
  'MT', 'MS', 'PA', 'PB', 'PR', 'PE', 'PI', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'TO'
];

export default function AddressOnboarding({
  user,
  raffleTitle,
  onSuccess,
  onCancel
}: AddressOnboardingProps) {
  const [name, setName] = useState(user.displayName || '');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('RJ');
  const [fullAddress, setFullAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-format Brazilian phone number mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 3) {
      setError('Por favor, informe seu nome completo.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Por favor, informe um WhatsApp válido com DDD.');
      return;
    }
    if (!city.trim() || city.trim().length < 2) {
      setError('Por favor, informe sua cidade.');
      return;
    }
    if (!fullAddress.trim() || fullAddress.trim().length < 8) {
      setError('Por favor, informe seu endereço completo (Rua, Número, Bairro e CEP) para entrega.');
      return;
    }

    setLoading(true);
    try {
      const newProfile: UserProfile = {
        uid: user.uid,
        name: name.trim(),
        email: user.email || '',
        phone: phone.trim(),
        city: city.trim(),
        state: state.toUpperCase(),
        fullAddress: fullAddress.trim(),
        photoURL: user.photoURL || ''
      };

      await saveUserProfile(newProfile);
      onSuccess(newProfile);
    } catch (err) {
      console.error('Erro no onboarding:', err);
      setError('Ocorreu um erro ao salvar seu cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-12 px-4 sm:px-6">
      
      {/* Back button */}
      <button
        onClick={onCancel}
        className="mb-6 flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-bold transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para o Início
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        
        {/* Header Alert Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-xl pointer-events-none"></div>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 border border-indigo-500/20 shadow-inner">
              <Truck className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Cadastro Obrigatório
              </span>
              <h2 className="text-base font-black text-white leading-tight mt-1">
                Onde entregaremos seu prêmio?
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Você selecionou a rifa: <strong className="text-white font-bold">{raffleTitle}</strong>. Para prosseguir e reservar cotas, informe os seus dados de entrega abaixo.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Connected Identity */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <img
              src={user.photoURL || ''}
              alt={user.displayName || 'Membro'}
              className="w-9 h-9 rounded-full border border-indigo-200 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{user.email}</p>
            </div>
            <span className="ml-auto bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
              Conta Conectada
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label htmlFor="onboard-name" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Nome Completo do Destinatário:
              </label>
              <div className="relative">
                <input
                  id="onboard-name"
                  type="text"
                  required
                  placeholder="Seu nome completo para despacho"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 font-semibold"
                />
                <User className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="onboard-phone" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                WhatsApp / Telefone de Contato:
              </label>
              <div className="relative">
                <input
                  id="onboard-phone"
                  type="text"
                  required
                  placeholder="(21) 98765-4321"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 font-semibold"
                />
                <Phone className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label htmlFor="onboard-city" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Cidade:
                </label>
                <div className="relative">
                  <input
                    id="onboard-city"
                    type="text"
                    required
                    placeholder="Guapimirim"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                  <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div className="col-span-1">
                <label htmlFor="onboard-state" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Estado (UF):
                </label>
                <select
                  id="onboard-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-[38px] px-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold cursor-pointer"
                >
                  {BRAZILIAN_STATES.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="onboard-address" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Endereço de Entrega (Rua, Número, Bairro, CEP e Complemento):
              </label>
              <textarea
                id="onboard-address"
                rows={3}
                required
                placeholder="Ex: Av. Dedo de Deus, 1500, Apto 201 - Centro - CEP 25940-000"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 font-medium leading-relaxed"
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Insira o endereço completo. O prêmio é enviado via Correios ou transportadora com frete grátis e seguro total.
              </p>
            </div>

            <button
              id="confirm-onboard-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
            >
              {loading ? (
                'Salvando dados...'
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Salvar Cadastro & Ver Rifa
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

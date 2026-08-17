import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Truck, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { saveUserProfile } from '../services/raffleService';
import { User as FirebaseUser } from 'firebase/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
  profile: UserProfile | null;
  onProfileSaved?: (updatedProfile: UserProfile) => void;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  profile,
  onProfileSaved
}: ProfileModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('RJ');
  const [fullAddress, setFullAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || user.displayName || '');
      setPhone(profile.phone || '');
      setCity(profile.city || '');
      setState(profile.state || 'RJ');
      setFullAddress(profile.fullAddress || '');
    } else if (user) {
      setName(user.displayName || '');
      setPhone('');
      setCity('');
      setState('RJ');
      setFullAddress('');
    }
  }, [profile, user, isOpen]);

  if (!isOpen) return null;

  // Brazilian Phone mask
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

  const handleSave = async (e: React.FormEvent) => {
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
      const updatedProfileData = {
        uid: user.uid,
        name: name.trim(),
        email: user.email || '',
        phone: phone.trim(),
        city: city.trim(),
        state: state.toUpperCase(),
        fullAddress: fullAddress.trim(),
        photoURL: user.photoURL || ''
      };

      await saveUserProfile(updatedProfileData);
      setSuccess(true);
      if (onProfileSaved) {
        onProfileSaved(updatedProfileData as UserProfile);
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      setError('Ocorreu um erro ao salvar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        id="profile-modal"
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
          <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              Cadastro de Entrega do Associado
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seus dados de entrega para envio da premiação caso seja contemplado.
            </p>
          </div>
        </div>

        {/* Google User Tag */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
          <img
            src={user.photoURL || ''}
            alt={user.displayName || 'Google User'}
            className="w-9 h-9 rounded-full border border-indigo-200 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate">{user.displayName}</p>
            <p className="text-[11px] text-slate-400 font-mono truncate">{user.email}</p>
          </div>
          <span className="ml-auto bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
            Conta Conectada
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs flex items-center gap-2 mb-4 font-bold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Dados de entrega salvos com sucesso!</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSave} className="space-y-4">
          
          <div>
            <label htmlFor="profile-name" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Nome Completo do Destinatário:
            </label>
            <div className="relative">
              <input
                id="profile-name"
                type="text"
                required
                placeholder="Ex: Carlos Eduardo de Oliveira"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 font-medium"
              />
              <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          <div>
            <label htmlFor="profile-phone" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              WhatsApp / Telefone para Contato:
            </label>
            <div className="relative">
              <input
                id="profile-phone"
                type="text"
                required
                placeholder="(21) 98765-4321"
                value={phone}
                onChange={handlePhoneChange}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 font-medium"
              />
              <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="profile-city" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Cidade:
              </label>
              <div className="relative">
                <input
                  id="profile-city"
                  type="text"
                  required
                  placeholder="Guapimirim"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                />
                <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            <div className="col-span-1">
              <label htmlFor="profile-state" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Estado (UF):
              </label>
              <select
                id="profile-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium cursor-pointer"
              >
                {BRAZILIAN_STATES.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="profile-address" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Endereço Completo de Entrega (Rua, Número, Bairro, CEP e Complemento):
            </label>
            <textarea
              id="profile-address"
              rows={3}
              required
              placeholder="Ex: Av. Dedo de Deus, 1500, Apto 201 - Centro - CEP 25940-000"
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 font-medium leading-relaxed"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              O prêmio é despachado com frete grátis e código de rastreamento para este endereço caso seu número seja sorteado.
            </p>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              id="save-profile-btn"
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-lg text-xs shadow hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                'Salvando Dados...'
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Salvar Cadastro de Entrega
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

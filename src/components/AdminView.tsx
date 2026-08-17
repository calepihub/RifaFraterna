import React, { useState, useMemo } from 'react';
import { 
  Check, X, Search, Settings, Phone, Mail, 
  Grid, ShieldCheck, Edit3, HelpCircle, 
  Truck, ArrowRight, User, RefreshCw, Filter, 
  CheckCircle2, Clock, AlertTriangle, Sparkles
} from 'lucide-react';
import { RaffleNumber, Reservation, RaffleConfig, RaffleStats, RaffleItem } from '../types';
import { 
  approveReservation, 
  rejectReservation, 
  manualNumberOverride, 
  batchUpdateNumbersStatus,
  updateRaffleConfig,
  createNewRaffle
} from '../services/raffleService';

interface AdminViewProps {
  raffleId: string;
  numbers: RaffleNumber[];
  reservations: Reservation[];
  config: RaffleConfig;
  stats: RaffleStats;
  raffles: RaffleItem[];
  onSelectRaffle: (id: string) => void;
}

export default function AdminView({
  raffleId,
  numbers,
  reservations,
  config,
  stats,
  raffles,
  onSelectRaffle
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'numbers' | 'approvals' | 'settings'>('numbers');
  
  // Dynamically compile the full 100-number list, merging database real-time updates
  const fullNumbers = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const numStr = i.toString().padStart(2, '0');
      const dbNumber = numbers.find(n => n.id === numStr);
      return dbNumber || {
        id: numStr,
        number: numStr,
        raffleId,
        status: 'available' as const,
        buyerName: '',
        buyerPhone: '',
        buyerEmail: '',
        reservationId: '',
        updatedAt: new Date()
      };
    });
  }, [numbers, raffleId]);
  
  // Search & Filter state for numbers
  const [numberSearch, setNumberSearch] = useState('');
  const [numberStatusFilter, setNumberStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>('all');
  const [selectedNumberIds, setSelectedNumberIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Search & Filter state for reservations
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Manual override modal state
  const [editingNumber, setEditingNumber] = useState<RaffleNumber | null>(null);
  const [manualStatus, setManualStatus] = useState<'available' | 'reserved' | 'sold'>('available');
  const [manualBuyerName, setManualBuyerName] = useState('');
  const [manualBuyerPhone, setManualBuyerPhone] = useState('');
  const [manualBuyerEmail, setManualBuyerEmail] = useState('');
  const [manualOverrideLoading, setManualOverrideLoading] = useState(false);

  // Settings form state
  const [pixKey, setPixKey] = useState(config.pixKey);
  const [pixName, setPixName] = useState(config.pixName || 'Carlos Alexandre Pinheiro');
  const [pricePerNumber, setPricePerNumber] = useState(config.pricePerNumber);
  const [drawDate, setDrawDate] = useState(config.drawDate || '');
  const [drawConcurso, setDrawConcurso] = useState(config.drawConcurso || '');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Dynamic raffle creation form state
  const [isCreatingRaffle, setIsCreatingRaffle] = useState(false);
  const [newRaffleTitle, setNewRaffleTitle] = useState('');
  const [newRaffleTagline, setNewRaffleTagline] = useState('');
  const [newRafflePrizeName, setNewRafflePrizeName] = useState('');
  const [newRafflePrizeDescription, setNewRafflePrizeDescription] = useState('');
  const [newRafflePrice, setNewRafflePrice] = useState(7.33);
  const [newRaffleDrawDetails, setNewRaffleDrawDetails] = useState('Sorteio pela Loteria Federal - Mediante fechamento da cartela');
  const [newRaffleShipping, setNewRaffleShipping] = useState('Frete Grátis com Rastreamento para todo o Brasil!');
  const [creatingRaffleLoading, setCreatingRaffleLoading] = useState(false);

  const handleCreateRaffleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRaffleTitle || !newRafflePrizeName || !newRafflePrice) {
      alert('Por favor, preencha o título, nome do prêmio e o preço.');
      return;
    }
    setCreatingRaffleLoading(true);
    try {
      const generatedId = newRaffleTitle
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const newRaffle: RaffleItem = {
        id: generatedId,
        title: newRaffleTitle,
        tagline: newRaffleTagline || 'Edição Especial de Colecionador',
        prizeName: newRafflePrizeName,
        prizeDescription: newRafflePrizeDescription || 'Descrição detalhada do prêmio.',
        price: Number(newRafflePrice),
        imageAlt: newRaffleTitle,
        status: 'active',
        drawDetails: newRaffleDrawDetails,
        shipping: newRaffleShipping
      };

      await createNewRaffle(newRaffle);
      
      // Reset state and select new raffle
      setIsCreatingRaffle(false);
      setNewRaffleTitle('');
      setNewRaffleTagline('');
      setNewRafflePrizeName('');
      setNewRafflePrizeDescription('');
      setNewRafflePrice(7.33);
      onSelectRaffle(generatedId);
      
      alert('Nova rifa cadastrada com sucesso!');
    } catch (err) {
      console.error('Erro ao cadastrar nova rifa:', err);
      alert('Erro ao cadastrar nova rifa no Firestore.');
    } finally {
      setCreatingRaffleLoading(false);
    }
  };

  // Winner Verification tool state
  const [checkingWinner, setCheckingWinner] = useState(false);
  const [winnerNumberInput, setWinnerNumberInput] = useState('');
  const [checkedWinnerResult, setCheckedWinnerResult] = useState<{
    concurso: string;
    data: string;
    premiacoes: string[]; // Drawn numbers 1o to 5o
    winningCota: string; // last 2 digits of 1o prize
    winnerBuyer?: {
      name: string;
      phone: string;
      email?: string;
    } | null;
  } | null>(null);
  const [checkError, setCheckError] = useState('');

  // Formatting currency helper
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Quick single-click status switcher for a number
  const handleQuickStatusChange = async (numId: string, newStatus: 'available' | 'reserved' | 'sold') => {
    try {
      await manualNumberOverride(raffleId, numId, newStatus);
    } catch (err) {
      console.error('Erro ao alterar status da cota:', err);
      alert('Erro ao atualizar status da cota.');
    }
  };

  // Batch action handler
  const handleBatchStatusChange = async (newStatus: 'available' | 'reserved' | 'sold') => {
    if (selectedNumberIds.length === 0) return;
    
    const label = newStatus === 'sold' ? 'PAGOS' : newStatus === 'reserved' ? 'RESERVADOS' : 'DISPONÍVEIS (CANCELAR RESERVAS)';
    if (!window.confirm(`Deseja alterar os ${selectedNumberIds.length} números selecionados para ${label}?`)) {
      return;
    }

    setBatchLoading(true);
    try {
      await batchUpdateNumbersStatus(raffleId, selectedNumberIds, newStatus);
      setSelectedNumberIds([]);
    } catch (err) {
      console.error('Erro na ação em lote:', err);
      alert('Erro ao aplicar alteração em lote.');
    } finally {
      setBatchLoading(false);
    }
  };

  // Select all filtered numbers
  const toggleSelectAll = (filteredList: RaffleNumber[]) => {
    if (selectedNumberIds.length === filteredList.length) {
      setSelectedNumberIds([]);
    } else {
      setSelectedNumberIds(filteredList.map((n) => n.id));
    }
  };

  // Approvals & Rejections Action Handlers
  const handleApprove = async (reservation: Reservation) => {
    if (window.confirm(`Deseja aprovar e marcar como PAGO os números [${reservation.numbers.join(', ')}] de ${reservation.buyerName}?`)) {
      try {
        await approveReservation(raffleId, reservation);
      } catch (err) {
        console.error('Erro ao aprovar:', err);
        alert('Erro ao aprovar a reserva.');
      }
    }
  };

  const handleReject = async (reservation: Reservation) => {
    if (window.confirm(`Deseja cancelar a reserva de ${reservation.buyerName} dos números [${reservation.numbers.join(', ')}]? Os números voltarão a ficar DISPONÍVEIS imediatamente.`)) {
      try {
        await rejectReservation(raffleId, reservation);
      } catch (err) {
        console.error('Erro ao recusar:', err);
        alert('Erro ao recusar a reserva.');
      }
    }
  };

  // Manual ticket status override modal
  const handleOpenOverride = (num: RaffleNumber) => {
    setEditingNumber(num);
    setManualStatus(num.status);
    setManualBuyerName(num.buyerName || '');
    setManualBuyerPhone(num.buyerPhone || '');
    setManualBuyerEmail(num.buyerEmail || '');
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNumber) return;

    setManualOverrideLoading(true);
    try {
      await manualNumberOverride(
        raffleId,
        editingNumber.id,
        manualStatus,
        manualStatus === 'available' ? '' : manualBuyerName,
        manualStatus === 'available' ? '' : manualBuyerPhone,
        manualStatus === 'available' ? '' : manualBuyerEmail
      );
      setEditingNumber(null);
    } catch (err) {
      console.error('Erro ao atualizar número:', err);
      alert('Ocorreu um erro ao atualizar a cota.');
    } finally {
      setManualOverrideLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess(false);

    try {
      await updateRaffleConfig(raffleId, {
        pixKey,
        pixName,
        pricePerNumber: Number(pricePerNumber),
        drawDate,
        drawConcurso,
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao atualizar configurações:', err);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Automated Winner Verification from Loteria Federal API
  const handleVerifyWinner = async () => {
    setCheckingWinner(true);
    setCheckError('');
    setCheckedWinnerResult(null);

    try {
      // Fetch latest Federal Lottery results
      const response = await fetch('https://loteriascaixa-api.herokuapp.com/api/federal/latest');
      if (!response.ok) {
        throw new Error('Não foi possível obter resposta da API da Loteria Federal (indisponível ou limite excedido).');
      }
      const data = await response.json();
      
      const concursoNum = String(data.concurso || '');
      const dataSorteio = data.data || '';
      
      let numbersArray: string[] = [];
      if (Array.isArray(data.dezenas) && data.dezenas.length > 0) {
        numbersArray = data.dezenas.map((d: any) => String(d));
      } else if (Array.isArray(data.resultados) && data.resultados.length > 0) {
        numbersArray = data.resultados.map((r: any) => String(r.numero || r));
      } else if (Array.isArray(data.listaDezenas) && data.listaDezenas.length > 0) {
        numbersArray = data.listaDezenas.map((d: any) => String(d));
      }

      if (numbersArray.length === 0) {
        throw new Error('Formato de dados retornado pela API da Caixa não identificado.');
      }

      // First place prize (1º Prêmio)
      const primeiroPremio = numbersArray[0]; // e.g. "54321" or "02397"
      if (!primeiroPremio || primeiroPremio.length < 2) {
        throw new Error(`Prêmio principal retornado é inválido: ${primeiroPremio}`);
      }

      // Extract last 2 digits
      const winningCota = primeiroPremio.slice(-2); // e.g. "21" or "97"

      // Check if any of our numbers has this cota and is sold
      const winnerNumberDoc = fullNumbers.find(n => n.id === winningCota && n.status === 'sold');
      
      let winnerBuyer = null;
      if (winnerNumberDoc) {
        winnerBuyer = {
          name: winnerNumberDoc.buyerName || 'Sem nome registrado',
          phone: winnerNumberDoc.buyerPhone || 'Sem WhatsApp',
          email: winnerNumberDoc.buyerEmail || '',
        };
      } else {
        // Look up in reserved just in case
        const reservedNumberDoc = fullNumbers.find(n => n.id === winningCota && n.status === 'reserved');
        if (reservedNumberDoc) {
          winnerBuyer = {
            name: `${reservedNumberDoc.buyerName} (Reserva Pendente)`,
            phone: reservedNumberDoc.buyerPhone || 'Sem WhatsApp',
            email: reservedNumberDoc.buyerEmail || '',
          };
        }
      }

      setCheckedWinnerResult({
        concurso: concursoNum,
        data: dataSorteio,
        premiacoes: numbersArray.slice(0, 5),
        winningCota,
        winnerBuyer
      });

    } catch (err: any) {
      console.error("Erro na verificação da API:", err);
      setCheckError(err.message || 'Erro de rede ou API instável.');
    } finally {
      setCheckingWinner(false);
    }
  };

  // Manual Winner Verification by providing 1o prize number
  const handleManualVerifyWinner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!winnerNumberInput || winnerNumberInput.length < 2) {
      alert('Por favor, informe ao menos os 2 últimos dígitos para apuração.');
      return;
    }

    setCheckingWinner(true);
    setCheckError('');
    setCheckedWinnerResult(null);

    try {
      // If user inputs full 5-digit number, e.g. "58932" or just "32"
      const winningCota = winnerNumberInput.slice(-2).padStart(2, '0');

      // Check if sold
      const winnerNumberDoc = fullNumbers.find(n => n.id === winningCota && n.status === 'sold');
      
      let winnerBuyer = null;
      if (winnerNumberDoc) {
        winnerBuyer = {
          name: winnerNumberDoc.buyerName || 'Sem nome registrado',
          phone: winnerNumberDoc.buyerPhone || 'Sem WhatsApp',
          email: winnerNumberDoc.buyerEmail || '',
        };
      } else {
        const reservedNumberDoc = fullNumbers.find(n => n.id === winningCota && n.status === 'reserved');
        if (reservedNumberDoc) {
          winnerBuyer = {
            name: `${reservedNumberDoc.buyerName} (Reserva Pendente)`,
            phone: reservedNumberDoc.buyerPhone || 'Sem WhatsApp',
            email: reservedNumberDoc.buyerEmail || '',
          };
        }
      }

      setCheckedWinnerResult({
        concurso: 'Manual',
        data: new Date().toLocaleDateString('pt-BR'),
        premiacoes: [winnerNumberInput.padStart(5, '0')],
        winningCota,
        winnerBuyer
      });
    } catch (err: any) {
      setCheckError('Erro ao processar o número digitado.');
    } finally {
      setCheckingWinner(false);
    }
  };

  // Filter Numbers
  const filteredNumbers = fullNumbers.filter((num) => {
    const matchesSearch = 
      num.id.includes(numberSearch) || 
      (num.buyerName && num.buyerName.toLowerCase().includes(numberSearch.toLowerCase())) ||
      (num.buyerPhone && num.buyerPhone.includes(numberSearch));
    
    const matchesStatus = numberStatusFilter === 'all' || num.status === numberStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter Reservations
  const filteredReservations = reservations.filter((res) => {
    const matchesSearch =
      res.buyerName.toLowerCase().includes(reservationSearch.toLowerCase()) ||
      res.buyerPhone.includes(reservationSearch) ||
      res.numbers.some((n) => n.includes(reservationSearch));

    const matchesStatus = reservationStatusFilter === 'all' || res.status === reservationStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. Header & Owner Identity Banner */}
      <section className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 border border-indigo-400/40 flex items-center justify-center text-white shrink-0 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Painel do Gestor
              </h2>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Owner Exclusivo
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5 font-medium">
              <span>Gestor Responsável:</span>
              <strong className="text-white font-semibold">Carlos Alexandre Pinheiro</strong>
              <span className="text-slate-400 font-mono text-[11px]">(tazmaniacrvg@gmail.com)</span>
            </p>
          </div>
        </div>

        {/* Global Action Status */}
        <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-end">
          <button
            onClick={() => setIsCreatingRaffle(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm border border-indigo-400/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            + Cadastrar Rifa
          </button>
          
          <div className="bg-slate-800/90 border border-slate-700/80 px-3.5 py-1.5 rounded-lg text-right">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Arrecadação Confirmada</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {formatBRL(stats.totalEarnings)}
            </span>
          </div>
          <div className="bg-slate-800/90 border border-slate-700/80 px-3.5 py-1.5 rounded-lg text-right">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Pendente (Reservas)</span>
            <span className="text-sm font-bold text-amber-400 font-mono">
              {formatBRL(stats.pendingEarnings)}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Key Metric Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-sm">
            {stats.sold}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Cotas Pagas</p>
            <p className="text-xs sm:text-sm font-bold text-slate-800">{stats.percentSold}% Concluído</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold text-sm">
            {stats.reserved}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Cotas Reservadas</p>
            <p className="text-xs sm:text-sm font-bold text-slate-800">Aguardando PIX</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-sm">
            {stats.available}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Cotas Disponíveis</p>
            <p className="text-xs sm:text-sm font-bold text-slate-800">Prontas p/ Venda</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs">
            {reservations.filter((r) => r.status === 'pending').length}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Pedidos Pendentes</p>
            <p className="text-xs sm:text-sm font-bold text-slate-800">Para Validação</p>
          </div>
        </div>
      </section>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm gap-2">
        <button
          id="tab-numbers-control"
          onClick={() => setActiveTab('numbers')}
          className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'numbers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Grid className="w-4 h-4" />
          Controle de Status das Cotas (00-99)
        </button>

        <button
          id="tab-approvals"
          onClick={() => setActiveTab('approvals')}
          className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer relative ${
            activeTab === 'approvals'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Validação de Reservas & PIX
          {reservations.filter((r) => r.status === 'pending').length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {reservations.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          id="tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configurações da Rifa
        </button>
      </div>

      {/* 4. TAB CONTENT: NUMBERS STATUS CONTROL */}
      {activeTab === 'numbers' && (
        <div className="space-y-4">
          
          {/* Action Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <input
                id="search-numbers-input"
                type="text"
                placeholder="Buscar por número (ex: 05) ou comprador..."
                value={numberSearch}
                onChange={(e) => setNumberSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setNumberStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  numberStatusFilter === 'all' 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({fullNumbers.length})
              </button>
              <button
                onClick={() => setNumberStatusFilter('available')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  numberStatusFilter === 'available' 
                    ? 'bg-slate-600 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Disponíveis ({stats.available})
              </button>
              <button
                onClick={() => setNumberStatusFilter('reserved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  numberStatusFilter === 'reserved' 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Reservadas ({stats.reserved})
              </button>
              <button
                onClick={() => setNumberStatusFilter('sold')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  numberStatusFilter === 'sold' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Pagas ({stats.sold})
              </button>
            </div>
          </div>

          {/* Batch Actions Bar (when items are selected) */}
          {selectedNumberIds.length > 0 && (
            <div className="bg-indigo-900 text-white p-3 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded">
                  {selectedNumberIds.length} selecionados
                </span>
                <span className="text-xs font-medium text-indigo-200">
                  Alteração em lote para o Gestor:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={batchLoading}
                  onClick={() => handleBatchStatusChange('sold')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Marcar como Pagos
                </button>
                <button
                  disabled={batchLoading}
                  onClick={() => handleBatchStatusChange('reserved')}
                  className="bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" /> Marcar como Reservados
                </button>
                <button
                  disabled={batchLoading}
                  onClick={() => handleBatchStatusChange('available')}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Cancelar / Liberar Disponível
                </button>
                <button
                  onClick={() => setSelectedNumberIds([])}
                  className="text-xs text-indigo-300 hover:text-white px-2 py-1"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}

          {/* Clean Layout: Sidebar & Matrix Side-by-Side */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Left Box: Matrix Grid */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 w-full">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSelectAll(filteredNumbers)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {selectedNumberIds.length === filteredNumbers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Exibindo {filteredNumbers.length} de {fullNumbers.length} dezenas
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300/60"></span> Livre
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Reservado
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Pago
                  </span>
                </div>
              </div>

              {/* 10x10 Beautiful Matrix */}
              <div className="p-4 bg-white">
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5 justify-items-center">
                  {filteredNumbers.map((num) => {
                    const isSelectedInBatch = selectedNumberIds.includes(num.id);
                    const isActive = editingNumber?.id === num.id;

                    return (
                      <div key={num.id} className="relative w-12 h-12">
                        {/* Number Button */}
                        <button
                          onClick={() => handleOpenOverride(num)}
                          type="button"
                          className={`w-full h-full rounded-xl text-xs font-mono font-black flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                            isActive
                              ? 'ring-4 ring-indigo-600 ring-offset-1 z-10 scale-105 shadow-md'
                              : 'hover:scale-102 border border-slate-200/50'
                          } ${
                            num.status === 'sold'
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : num.status === 'reserved'
                              ? 'bg-amber-400 text-slate-900 font-black'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs">{num.id}</span>
                          {num.buyerName && (
                            <span className="text-[7.5px] max-w-[42px] truncate px-0.5 opacity-90 font-medium leading-none mt-0.5">
                              {num.buyerName.split(' ')[0]}
                            </span>
                          )}
                        </button>

                        {/* Corner Checkbox for Batch Selection */}
                        <label className="absolute -top-1 -right-1 z-20 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelectedInBatch}
                            onChange={() => {
                              setSelectedNumberIds((prev) =>
                                prev.includes(num.id) ? prev.filter((id) => id !== num.id) : [...prev, num.id]
                              );
                            }}
                            className="w-3.5 h-3.5 rounded-full border-slate-300 text-indigo-600 focus:ring-0 shadow-xs"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>

                {filteredNumbers.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                    Nenhuma dezena corresponde aos filtros atuais.
                  </div>
                )}
              </div>
            </div>

            {/* Right Box: Selection Detail Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm w-full lg:w-[360px] shrink-0 lg:sticky lg:top-4">
              {editingNumber ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cota Selecionada</span>
                      <h3 className="text-xl font-black text-slate-800 font-mono">#{editingNumber.id}</h3>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        manualStatus === 'sold'
                          ? 'bg-emerald-100 text-emerald-800'
                          : manualStatus === 'reserved'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {manualStatus === 'sold' ? 'Pago' : manualStatus === 'reserved' ? 'Reservado' : 'Disponível'}
                    </span>
                  </div>

                  <form onSubmit={handleSaveOverride} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Nome do Comprador
                      </label>
                      <input
                        type="text"
                        value={manualBuyerName}
                        onChange={(e) => setManualBuyerName(e.target.value)}
                        placeholder="Nome Completo"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        WhatsApp / Celular
                      </label>
                      <input
                        type="text"
                        value={manualBuyerPhone}
                        onChange={(e) => setManualBuyerPhone(e.target.value)}
                        placeholder="(21) 98765-4321"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        E-mail (Opcional)
                      </label>
                      <input
                        type="email"
                        value={manualBuyerEmail}
                        onChange={(e) => setManualBuyerEmail(e.target.value)}
                        placeholder="comprador@email.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Status do Número
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => setManualStatus('available')}
                          className={`py-2 rounded-lg text-[11px] font-black transition cursor-pointer border ${
                            manualStatus === 'available'
                              ? 'bg-slate-800 border-slate-800 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          Livre
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualStatus('reserved')}
                          className={`py-2 rounded-lg text-[11px] font-black transition cursor-pointer border ${
                            manualStatus === 'reserved'
                              ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          Reserva
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualStatus('sold')}
                          className={`py-2 rounded-lg text-[11px] font-black transition cursor-pointer border ${
                            manualStatus === 'sold'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          Pago
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={manualOverrideLoading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded-lg text-xs uppercase tracking-wider cursor-pointer transition disabled:opacity-50"
                      >
                        {manualOverrideLoading ? 'Gravando...' : 'Gravar Cota'}
                      </button>
                      
                      {manualBuyerPhone && (
                        <a
                          href={`https://wa.me/${manualBuyerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-2 rounded-lg flex items-center justify-center transition"
                          title="Falar no WhatsApp"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </form>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-500 rounded-xl flex items-center justify-center mx-auto shadow-xs">
                    <Grid className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Selecione uma Dezena</h4>
                    <p className="text-[10.5px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-normal">
                      Clique em um número da grade ao lado para gerenciar as informações do comprador ou status.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
          </div>

        </div>
      )}

      {/* 5. TAB CONTENT: RESERVATIONS APPROVALS & PIX VALIDATION */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <input
                id="search-reservations-input"
                type="text"
                placeholder="Buscar por comprador, telefone ou cota..."
                value={reservationSearch}
                onChange={(e) => setReservationSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setReservationStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  reservationStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Todas ({reservations.length})
              </button>
              <button
                onClick={() => setReservationStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  reservationStatusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'
                }`}
              >
                Pendentes ({reservations.filter((r) => r.status === 'pending').length})
              </button>
              <button
                onClick={() => setReservationStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  reservationStatusFilter === 'approved' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                Aprovadas ({reservations.filter((r) => r.status === 'approved').length})
              </button>
              <button
                onClick={() => setReservationStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  reservationStatusFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'
                }`}
              >
                Recusadas ({reservations.filter((r) => r.status === 'rejected').length})
              </button>
            </div>
          </div>

          {/* Reservations Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    <th className="p-4">Comprador</th>
                    <th className="p-4">WhatsApp / Contato</th>
                    <th className="p-4">Local / Endereço de Entrega</th>
                    <th className="p-4">Cotas</th>
                    <th className="p-4">Valor PIX</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Ação do Gestor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReservations.map((res) => {
                    const rawDigits = res.buyerPhone.replace(/\D/g, '');
                    const whatsappUrl = `https://wa.me/55${rawDigits}?text=${encodeURIComponent(
                      `Olá ${res.buyerName}, aqui é o Carlos Alexandre Pinheiro da Grande Rifa Maçônica. Estou entrando em contato referente à sua reserva das cotas [${res.numbers.join(', ')}].`
                    )}`;

                    return (
                      <tr key={res.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-bold text-slate-800">
                          {res.buyerName}
                          {res.buyerEmail && (
                            <span className="block text-[10px] text-slate-400 font-mono font-normal">
                              {res.buyerEmail}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] transition"
                          >
                            <Phone className="w-3 h-3" /> Chamar WhatsApp
                          </a>
                        </td>
                        <td className="p-4 max-w-xs">
                          {res.buyerCity || res.buyerAddress ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-700 block text-xs">
                                {res.buyerCity ? `${res.buyerCity} - ${res.buyerState || 'RJ'}` : 'Localidade'}
                              </span>
                              {res.buyerAddress && (
                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight" title={res.buyerAddress}>
                                  {res.buyerAddress}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Não informado
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {res.numbers.map((n) => (
                              <span
                                key={n}
                                className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold rounded text-[11px]"
                              >
                                #{n}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-emerald-600 font-mono">
                          {formatBRL(res.totalValue)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              res.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : res.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {res.status === 'approved' ? 'Pago / Aprovado' : res.status === 'pending' ? 'Pendente' : 'Recusado'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {res.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprove(res)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> Aprovar (Pago)
                              </button>
                              <button
                                onClick={() => handleReject(res)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> Cancelar / Recusar
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Processado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredReservations.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  Nenhuma transação encontrada.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 6. TAB CONTENT: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Configuration & Parameters */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Settings className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Cadastro & Parâmetros da Rifa
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Configurações oficiais salvas no banco de dados.
                </p>
              </div>
            </div>

            {settingsSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-lg text-[11px] font-bold flex items-center gap-2 animate-fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                Configurações salvas com sucesso!
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="settings-pix-key" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Chave PIX de Recebimento:
                </label>
                <input
                  id="settings-pix-key"
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-800"
                />
              </div>

              <div>
                <label htmlFor="settings-pix-name" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Nome do Beneficiário PIX:
                </label>
                <input
                  id="settings-pix-name"
                  type="text"
                  required
                  value={pixName}
                  onChange={(e) => setPixName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="settings-price" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Preço por Cota (R$):
                  </label>
                  <input
                    id="settings-price"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={pricePerNumber}
                    onChange={(e) => setPricePerNumber(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label htmlFor="settings-concurso" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Concurso Previsto:
                  </label>
                  <input
                    id="settings-concurso"
                    type="text"
                    placeholder="Ex: 5894"
                    value={drawConcurso}
                    onChange={(e) => setDrawConcurso(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="settings-draw-date" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Data do Sorteio:
                </label>
                <input
                  id="settings-draw-date"
                  type="text"
                  placeholder="Ex: 23/09/2026 às 19:00"
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-indigo-700 transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {settingsLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel: Automated Apuration / Check Winner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Apuração & Verificar Ganhador
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Sorteio baseado no prêmio principal da Loteria Federal.
                </p>
              </div>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed">
              O resultado é apurado considerando os <strong>dois últimos dígitos (dezena) do 1º Prêmio</strong> da Loteria Federal da Caixa Econômica Federal.
            </p>

            {/* Quick Actions for Apuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option A: Automated API Call */}
              <div className="border border-slate-150 rounded-xl p-3.5 bg-slate-50/50 space-y-2.5">
                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Verificação Automática</span>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Consulta o resultado do concurso mais recente diretamente do webservice da Caixa.
                </p>
                <button
                  onClick={handleVerifyWinner}
                  disabled={checkingWinner}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {checkingWinner ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Buscando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" /> Buscar Último Resultado
                    </>
                  )}
                </button>
              </div>

              {/* Option B: Manual Input Fallback */}
              <div className="border border-slate-150 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">Digitar Número Manual</span>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Se a API estiver temporariamente indisponível, digite o número do 1º prêmio para apurar.
                </p>
                <form onSubmit={handleManualVerifyWinner} className="flex gap-1.5 pt-0.5">
                  <input
                    type="text"
                    required
                    placeholder="Ex: 58497"
                    maxLength={5}
                    value={winnerNumberInput}
                    onChange={(e) => setWinnerNumberInput(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800 font-mono text-center font-bold"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                  >
                    Apurar
                  </button>
                </form>
              </div>
            </div>

            {/* Error Display */}
            {checkError && (
              <div className="bg-red-50 border border-red-150 text-red-600 p-3 rounded-lg text-[11px] font-semibold flex items-start gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p>Incapaz de consultar o resultado de forma 100% automatizada.</p>
                  <p className="text-[10px] text-red-400 font-normal">Motivo: {checkError}. Por favor, use a apuração manual ao lado.</p>
                </div>
              </div>
            )}

            {/* APURATION RESULT CONTAINER */}
            {checkedWinnerResult && (
              <div className="bg-slate-900 text-white rounded-xl p-4.5 space-y-4 animate-scale-up border border-slate-800 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 block">Loteria Federal Apurada</span>
                    <h4 className="text-xs font-bold font-mono">Concurso #{checkedWinnerResult.concurso}</h4>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">Data do sorteio: {checkedWinnerResult.data}</span>
                </div>

                {/* Drawn numbers list */}
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">Números Extraídos (Prêmios)</span>
                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-xs">
                    {checkedWinnerResult.premiacoes.map((premio, idx) => (
                      <div
                        key={idx}
                        className={`p-1.5 rounded-lg border leading-none ${
                          idx === 0
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                        title={`${idx + 1}º prêmio`}
                      >
                        <span className="block text-[8px] text-slate-500 font-sans font-semibold uppercase">{idx + 1}º</span>
                        <span className="font-bold">{premio}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Winning Cota Accent Card */}
                <div className="p-3 bg-gradient-to-r from-indigo-900/40 to-slate-850 rounded-xl border border-indigo-500/25 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-indigo-300 block">Cota Ganhadora (Dezena do 1º Prêmio)</span>
                    <p className="text-xs font-medium text-slate-300">A dezena correspondente ao 1º prêmio ({checkedWinnerResult.premiacoes[0] || '*****'}) é:</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500 border-2 border-amber-300 flex items-center justify-center font-bold text-slate-950 text-xl font-mono shadow-md animate-bounce">
                    #{checkedWinnerResult.winningCota}
                  </div>
                </div>

                {/* Winner Buyer Information */}
                <div className="pt-1.5">
                  {checkedWinnerResult.winnerBuyer ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold uppercase tracking-wider">Cota Vendida! Ganhador Encontrado!</h5>
                          <p className="text-[10px] text-emerald-300/80 font-medium">Os dados do participante foram localizados.</p>
                        </div>
                      </div>

                      {/* Buyer Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-emerald-500/10">
                        <div>
                          <span className="text-[9px] font-bold text-emerald-300/60 uppercase tracking-wider block">Nome Completo</span>
                          <span className="font-bold text-white">{checkedWinnerResult.winnerBuyer.name}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-emerald-300/60 uppercase tracking-wider block">WhatsApp do Vencedor</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-bold text-white font-mono">{checkedWinnerResult.winnerBuyer.phone}</span>
                            <a
                              href={`https://wa.me/55${checkedWinnerResult.winnerBuyer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Olá ${checkedWinnerResult.winnerBuyer.name}! É do Carlos Alexandre Pinheiro da Rifa Maçônica. Parabéns, você foi o vencedor da Faca Picanheira com a cota #${checkedWinnerResult.winningCota}! Entrei em contato para combinar a entrega.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/30 px-2 py-0.5 rounded transition"
                            >
                              <Phone className="w-2.5 h-2.5" /> Contatar
                            </a>
                          </div>
                        </div>

                        {/* Full Delivery Address Lookup */}
                        <div className="sm:col-span-2">
                          <span className="text-[9px] font-bold text-emerald-300/60 uppercase tracking-wider block">Endereço de Entrega Completo</span>
                          <span className="font-medium text-slate-300 text-xs">
                            {(() => {
                              const resDoc = reservations.find(r => r.numbers.includes(checkedWinnerResult.winningCota) && r.status === 'approved');
                              if (resDoc && (resDoc.buyerAddress || resDoc.buyerCity)) {
                                return `${resDoc.buyerAddress || ''}, ${resDoc.buyerCity || ''} - ${resDoc.buyerState || 'RJ'}`;
                              }
                              return 'Endereço não preenchido ou pendente de aprovação do pagamento.';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/60 border border-white/5 p-3.5 rounded-xl text-center space-y-1">
                      <p className="text-xs font-bold text-slate-300 uppercase">Nenhum Ganhador Registrado</p>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        A dezena sorteada (<strong>#{checkedWinnerResult.winningCota}</strong>) ainda está marcada como <strong>DISPONÍVEL</strong> ou não teve o pagamento confirmado pelo Gestor.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 7. MODAL: DETAILED OVERRIDE SINGLE NUMBER (REPLACED BY NEW RAFFLE MODAL) */}
      {isCreatingRaffle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Cadastrar Nova Rifa
              </h3>
              <button
                onClick={() => setIsCreatingRaffle(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRaffleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Título do Menu / Campanha *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rifa Relógio Maçônico"
                    value={newRaffleTitle}
                    onChange={(e) => setNewRaffleTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Subtítulo / Chamada *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Edição Especial de Ouro"
                    value={newRaffleTagline}
                    onChange={(e) => setNewRaffleTagline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nome Oficial do Prêmio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: RELÓGIO DE BOLSO MAÇÔNICO"
                    value={newRafflePrizeName}
                    onChange={(e) => setNewRafflePrizeName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Preço por Cota (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 7.33"
                    value={newRafflePrice}
                    onChange={(e) => setNewRafflePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Breve Descrição do Prêmio *
                </label>
                <textarea
                  required
                  placeholder="Descreva o prêmio de forma atraente para os compradores."
                  value={newRafflePrizeDescription}
                  onChange={(e) => setNewRafflePrizeDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Regras de Sorteio
                  </label>
                  <input
                    type="text"
                    placeholder="Regras do sorteio"
                    value={newRaffleDrawDetails}
                    onChange={(e) => setNewRaffleDrawDetails(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Regras de Envio / Frete
                  </label>
                  <input
                    type="text"
                    placeholder="Frete grátis..."
                    value={newRaffleShipping}
                    onChange={(e) => setNewRaffleShipping(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={creatingRaffleLoading}
                  className="flex-1 bg-indigo-600 text-white font-extrabold py-2.5 rounded-lg hover:bg-indigo-700 transition cursor-pointer shadow-sm uppercase tracking-wider text-[11px]"
                >
                  {creatingRaffleLoading ? 'Cadastrando...' : 'Confirmar e Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingRaffle(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 text-[11px]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

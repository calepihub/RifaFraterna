import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { RaffleConfig } from '../types';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: string[];
  totalValue: number;
  buyerName: string;
  buyerPhone: string;
  config: RaffleConfig;
}

export default function PaymentDialog({
  isOpen,
  onClose,
  selectedNumbers,
  totalValue,
  buyerName,
  buyerPhone,
  config
}: PaymentDialogProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes timer

  // Format currency
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Pix key copy
  const handleCopyKey = () => {
    navigator.clipboard.writeText(config.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Timer countdown
  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(900); // Reset timer to 15 mins on open
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  // Pre-filled WhatsApp message for Carlos Alexandre's number
  const message = `Olá! Acabei de reservar os números [${selectedNumbers.join(', ')}] na Rifa. Fiz o PIX no valor de ${formatBRL(totalValue)} em nome de ${buyerName}. Segue o comprovante em anexo!`;
  const whatsappUrl = `https://api.whatsapp.com/send?phone=5521984750005&text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        id="payment-modal"
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 mb-2.5">
            <QrCode className="w-5 h-5 animate-pulse" />
          </div>
          <h2 className="text-base font-bold text-indigo-600 uppercase tracking-wide">
            Reserva Realizada!
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Seus números estão pré-reservados. Efetue o PIX para garantir sua participação.
          </p>
        </div>

        {/* Mandatory WhatsApp Receipt Alert */}
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3.5 text-xs space-y-1 mb-4">
          <p className="font-bold flex items-center gap-1.5 text-rose-700">
            ⚠️ COMPROVANTE OBRIGATÓRIO:
          </p>
          <p className="leading-relaxed">
            O comprovante de pagamento do PIX deve ser enviado via WhatsApp para o número <strong className="text-rose-900 font-extrabold text-[13px]">(21) 98475-0005</strong> para ativação definitiva dos seus números.
          </p>
        </div>

        {/* Numbers & Value summary */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4 space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">Números Escolhidos:</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[75%]">
              {selectedNumbers.map((num) => (
                <span key={num} className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
                  {num}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200/60 pt-2 text-xs">
            <span className="text-slate-500">Valor Unitário:</span>
            <span className="text-slate-700 font-bold">{formatBRL(config.pricePerNumber)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
            <span className="text-slate-800 font-bold text-xs">Valor Total do PIX:</span>
            <span className="text-emerald-600 font-bold text-base">{formatBRL(totalValue)}</span>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="text-center bg-amber-50 border border-amber-200 rounded-lg py-1.5 px-3 mb-4">
          <p className="text-xs text-amber-800 font-semibold">
            Tempo limite de reserva: <span className="font-mono font-bold text-amber-600 text-sm">{formatTime(timeLeft)}</span>
          </p>
        </div>

        {/* PIX Key copy block */}
        <div className="space-y-1.5 mb-4">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            Chave PIX (E-mail):
          </label>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
            <input
              type="text"
              readOnly
              value={config.pixKey}
              className="bg-transparent border-none outline-none text-slate-700 text-xs flex-1 select-all font-medium pl-1"
            />
            <button
              onClick={handleCopyKey}
              className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copiar
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 pl-1 font-semibold">
            Beneficiário: <strong className="text-slate-800">{config.pixName}</strong>
          </p>
        </div>

        {/* Visual QR Code Mockup */}
        <div className="flex flex-col items-center justify-center p-3 border border-slate-200 bg-slate-50 rounded-lg mb-5">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-1.5 relative">
            <div className="w-28 h-28 flex flex-col justify-between p-0.5 bg-white select-none">
              <div className="flex justify-between">
                <div className="w-7 h-7 border-2 border-slate-900 bg-white p-0.5"><div className="w-full h-full bg-slate-900"></div></div>
                <div className="w-7 h-7 border-2 border-slate-900 bg-white p-0.5"><div className="w-full h-full bg-slate-900"></div></div>
              </div>
              <div className="flex flex-wrap gap-1 p-1 w-full justify-center">
                <div className="w-1 h-1 bg-slate-900"></div>
                <div className="w-2 h-1 bg-slate-900"></div>
                <div className="w-1 h-2 bg-slate-900"></div>
                <div className="w-1 h-1 bg-slate-900"></div>
                <div className="w-2 h-2 bg-slate-900"></div>
              </div>
              <div className="flex justify-between items-end">
                <div className="w-7 h-7 border-2 border-slate-900 bg-white p-0.5"><div className="w-full h-full bg-slate-900"></div></div>
                <div className="w-4 h-4 bg-slate-900"></div>
              </div>
            </div>
            {/* Overlay a small logo representation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 w-5 h-5 rounded flex items-center justify-center border border-white">
              <span className="text-white font-bold text-[9px]">G</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">Pix Copia e Cola / QR Code para Escanear</span>
        </div>

        {/* CTA Actions */}
        <div className="space-y-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-sm cursor-pointer"
          >
            Enviar Comprovante Whatsapp
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 bg-transparent border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer"
          >
            Voltar para a Rifa
          </button>
        </div>

      </div>
    </div>
  );
}

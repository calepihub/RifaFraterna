export const DEFAULT_ACTIVE_NUMBERS = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));

export interface RaffleItem {
  id: string;
  title: string;
  tagline: string;
  prizeName: string;
  prizeDescription: string;
  price: number;
  imageAlt: string;
  status: 'active' | 'completed';
  drawDetails: string;
  shipping: string;
}

export const ONGOING_RAFFLES: RaffleItem[] = [
  {
    id: "picanheira",
    title: "Faca Picanheira Artesanal 9\" Maçônica",
    tagline: "Edição Especial de Colecionador em Aço Cirúrgico",
    prizeName: "FACA PICANHEIRA ARTESANAL DE 9\" MAÇÔNICA",
    prizeDescription: "Lâmina em aço cirúrgico forjado com corte a laser do Esquadro & Compasso 'G', cabo híbrido em madeira nobre e resina perolizada com moeda comemorativa. Acompanha bainha legítima em couro bovino costurada à mão.",
    price: 7.33,
    imageAlt: "Faca Picanheira Artesanal Maçônica",
    status: 'active',
    drawDetails: "Sorteio pela Loteria Federal - Mediante fechamento da cartela",
    shipping: "Frete Grátis com Rastreamento para todo o Brasil!"
  }
];

export const OWNER_DETAILS = {
  name: "Carlos Alexandre Pinheiro",
  email: "tazmaniacrvg@gmail.com",
  pixKey: "carlos.alexandre@msn.com",
  pixName: "Carlos Alexandre Pinheiro",
  receiptWhatsApp: "(21) 98475-0005",
  rawWhatsApp: "5521984750005"
};

// Mock QR Code helper
export const getPixQrCodeMock = (name: string, price: number) => {
  return `00020101021226830014br.gov.bcb.pix2561carlos.alexandre@msn.com520400005303${price.toFixed(2)}5802BR5925Carlos Alexandre Pinheiro6009Sao Paulo62070503***6304FC7D`;
};

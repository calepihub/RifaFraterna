import { Timestamp } from 'firebase/firestore';

export interface RaffleNumber {
  id: string; // "00" to "99"
  status: 'available' | 'reserved' | 'sold';
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  reservationId?: string;
  updatedAt: Timestamp | Date;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string; // WhatsApp
  city: string;
  state: string;
  fullAddress: string;
  photoURL?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface Reservation {
  id: string; // Unique UUID or Firestore doc ID
  buyerUid?: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  buyerCity?: string;
  buyerState?: string;
  buyerAddress?: string;
  numbers: string[]; // e.g. ["00", "05"]
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  totalValue: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface RaffleConfig {
  id: string;
  pixKey: string;
  pixName: string;
  pricePerNumber: number;
  activeNumbers: string[]; // Array of number IDs that are displayed (e.g., the 64 from image)
  lastDrawDate?: string;
  drawDate?: string;       // Date of the raffle draw
  drawConcurso?: string;   // Optional Federal Lottery draw number to fetch (e.g. "5890")
}

export interface RaffleStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  percentSold: number;
  totalEarnings: number; // R$ sold
  pendingEarnings: number; // R$ reserved
}

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

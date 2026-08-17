import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  Timestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { RaffleNumber, Reservation, RaffleConfig, RaffleStats, UserProfile, RaffleItem } from '../types';
import { DEFAULT_ACTIVE_NUMBERS, ONGOING_RAFFLES, OWNER_DETAILS } from '../data';

const NUMBERS_COLLECTION = 'numbers';
const RESERVATIONS_COLLECTION = 'reservations';
const CONFIG_COLLECTION = 'config';
const USERS_COLLECTION = 'users';

/**
 * Saves or updates a member's delivery and contact profile in Firestore.
 */
export async function saveUserProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, profile.uid);
  const now = new Date();
  try {
    await setDoc(docRef, {
      ...profile,
      updatedAt: now,
      createdAt: now
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${profile.uid}`);
    throw error;
  }
}

/**
 * Listens to a member's profile in real-time.
 */
export function listenToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  const docRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          uid: data.uid,
          name: data.name,
          email: data.email,
          phone: data.phone,
          city: data.city,
          state: data.state,
          fullAddress: data.fullAddress,
          photoURL: data.photoURL,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        } as UserProfile);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
    }
  );
}

/**
 * Initializes the database with default configurations and numbers for ALL ongoing raffles.
 */
export async function seedDatabaseIfEmpty(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.email !== OWNER_DETAILS.email) {
    return;
  }

  try {
    for (const raffle of ONGOING_RAFFLES) {
      const configRef = doc(db, CONFIG_COLLECTION, raffle.id);
      const configSnap = await getDoc(configRef);

      // Seed raffle configuration if missing
      if (!configSnap.exists()) {
        const defaultConfig: RaffleConfig = {
          id: raffle.id,
          pixKey: OWNER_DETAILS.pixKey,
          pixName: OWNER_DETAILS.pixName,
          pricePerNumber: raffle.price,
          activeNumbers: DEFAULT_ACTIVE_NUMBERS,
        };
        await setDoc(configRef, defaultConfig);
        console.log(`Seeded raffle settings for: ${raffle.title}`);
      }

      // Check numbers for this specific raffle
      const numbersQuery = query(
        collection(db, NUMBERS_COLLECTION),
        where('raffleId', '==', raffle.id),
        limit(1)
      );
      const numbersSnap = await getDocs(numbersQuery);

      if (numbersSnap.empty) {
        console.log(`Seeding numbers 00-99 for ${raffle.id}...`);
        const batch = writeBatch(db);

        for (let i = 0; i < 100; i++) {
          const numStr = i.toString().padStart(2, '0');
          const docId = `${raffle.id}__${numStr}`;
          const numDocRef = doc(db, NUMBERS_COLLECTION, docId);

          const newNumber = {
            id: docId,
            number: numStr,
            raffleId: raffle.id,
            status: 'available',
            updatedAt: new Date()
          };
          batch.set(numDocRef, newNumber);
        }

        await batch.commit();
        console.log(`Successfully seeded numbers for: ${raffle.id}`);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'database_seeding_multi_raffle');
  }
}

/**
 * Listens to a specific raffle settings in real-time.
 */
export function listenToRaffleConfig(raffleId: string, callback: (config: RaffleConfig) => void): () => void {
  const docRef = doc(db, CONFIG_COLLECTION, raffleId);
  
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: snapshot.id,
          ...snapshot.data()
        } as RaffleConfig);
      } else {
        const matchingRaffle = ONGOING_RAFFLES.find(r => r.id === raffleId);
        callback({
          id: raffleId,
          pixKey: OWNER_DETAILS.pixKey,
          pixName: OWNER_DETAILS.pixName,
          pricePerNumber: matchingRaffle ? matchingRaffle.price : 7.33,
          activeNumbers: DEFAULT_ACTIVE_NUMBERS,
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${CONFIG_COLLECTION}/${raffleId}`);
    }
  );
}

/**
 * Updates a specific raffle configuration settings (Admin only).
 */
export async function updateRaffleConfig(raffleId: string, updatedConfig: Partial<RaffleConfig>): Promise<void> {
  const docRef = doc(db, CONFIG_COLLECTION, raffleId);
  try {
    await setDoc(docRef, { ...updatedConfig, updatedAt: new Date() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CONFIG_COLLECTION}/${raffleId}`);
  }
}

/**
 * Listens to all raffle numbers for a specific raffle in real-time.
 */
export function listenToRaffleNumbers(raffleId: string, callback: (numbers: RaffleNumber[]) => void): () => void {
  const colRef = collection(db, NUMBERS_COLLECTION);
  const q = query(colRef, where('raffleId', '==', raffleId));
  
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        // Fallback with default empty list using pure 2-digit number strings as IDs
        const defaultList: RaffleNumber[] = Array.from({ length: 100 }, (_, i) => {
          const numStr = i.toString().padStart(2, '0');
          return {
            id: numStr,
            status: 'available',
            buyerName: '',
            buyerPhone: '',
            buyerEmail: '',
            reservationId: '',
            updatedAt: new Date()
          } as RaffleNumber;
        });
        callback(defaultList);
        return;
      }

      const numbersList: RaffleNumber[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        
        // Extract original "00"-"99" from doc ID or fallback securely
        const rawNum = data.number || docId.split('__')[1] || docId;
        const matchDigits = rawNum.match(/\d+$/);
        const originalNumber = matchDigits ? matchDigits[0] : rawNum;

        numbersList.push({
          id: originalNumber, // return the original "00" to "99" ID to be fully transparent for the layout
          status: data.status,
          buyerName: data.buyerName || '',
          buyerPhone: data.buyerPhone || '',
          buyerEmail: data.buyerEmail || '',
          reservationId: data.reservationId || '',
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        } as RaffleNumber);
      });

      // Sort numbers numerically (00 to 99)
      numbersList.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      callback(numbersList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${NUMBERS_COLLECTION}/${raffleId}`);
    }
  );
}

/**
 * Listens to reservations for a specific raffle in real-time.
 */
export function listenToReservations(raffleId: string, callback: (reservations: Reservation[]) => void): () => void {
  const colRef = collection(db, RESERVATIONS_COLLECTION);
  const q = query(colRef, where('raffleId', '==', raffleId), orderBy('createdAt', 'desc'));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const reservationsList: Reservation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reservationsList.push({
          id: docSnap.id,
          buyerUid: data.buyerUid,
          buyerName: data.buyerName,
          buyerPhone: data.buyerPhone,
          buyerEmail: data.buyerEmail,
          buyerCity: data.buyerCity,
          buyerState: data.buyerState,
          buyerAddress: data.buyerAddress,
          numbers: data.numbers,
          status: data.status,
          totalValue: data.totalValue,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        } as Reservation);
      });
      callback(reservationsList);
    },
    (error) => {
      // Fallback: If it's a composite index issue or something else, query all and filter client side
      console.warn("Composite index might be missing, querying all reservations as fallback...");
      const fallbackQuery = query(collection(db, RESERVATIONS_COLLECTION), orderBy('createdAt', 'desc'));
      return onSnapshot(fallbackQuery, (fallbackSnap) => {
        const reservationsList: Reservation[] = [];
        fallbackSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.raffleId === raffleId) {
            reservationsList.push({
              id: docSnap.id,
              buyerUid: data.buyerUid,
              buyerName: data.buyerName,
              buyerPhone: data.buyerPhone,
              buyerEmail: data.buyerEmail,
              buyerCity: data.buyerCity,
              buyerState: data.buyerState,
              buyerAddress: data.buyerAddress,
              numbers: data.numbers,
              status: data.status,
              totalValue: data.totalValue,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
              updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
            } as Reservation);
          }
        });
        callback(reservationsList);
      });
    }
  );
}

/**
 * Reserves one or more numbers in a atomic transaction/batch.
 */
export async function reserveNumbers(
  raffleId: string,
  numbers: string[],
  buyerName: string,
  buyerPhone: string,
  buyerEmail?: string,
  pricePerNumber: number = 7.33,
  deliveryInfo?: {
    buyerUid?: string;
    buyerCity?: string;
    buyerState?: string;
    buyerAddress?: string;
  }
): Promise<string> {
  const batch = writeBatch(db);
  const reservationId = doc(collection(db, RESERVATIONS_COLLECTION)).id;
  const now = new Date();

  // Create the reservation document
  const reservationRef = doc(db, RESERVATIONS_COLLECTION, reservationId);
  const reservationData = {
    id: reservationId,
    raffleId,
    buyerUid: deliveryInfo?.buyerUid || '',
    buyerName,
    buyerPhone,
    buyerEmail: buyerEmail || '',
    buyerCity: deliveryInfo?.buyerCity || '',
    buyerState: deliveryInfo?.buyerState || '',
    buyerAddress: deliveryInfo?.buyerAddress || '',
    numbers,
    status: 'pending',
    totalValue: Number((numbers.length * pricePerNumber).toFixed(2)),
    createdAt: now,
    updatedAt: now
  };
  batch.set(reservationRef, reservationData);

  // Update status for each selected number (use set with merge to be resilient if document doesn't exist)
  for (const numId of numbers) {
    const docId = `${raffleId}__${numId}`;
    const numberRef = doc(db, NUMBERS_COLLECTION, docId);
    batch.set(numberRef, {
      id: docId,
      number: numId,
      raffleId,
      status: 'reserved',
      buyerName,
      buyerPhone,
      buyerEmail: buyerEmail || '',
      reservationId,
      updatedAt: now
    }, { merge: true });
  }

  try {
    await batch.commit();
    return reservationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reserve_batch_${reservationId}`);
    throw error;
  }
}

/**
 * Approves a reservation (Admin only), marking numbers as "sold".
 */
export async function approveReservation(raffleId: string, reservation: Reservation): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date();

  // Update reservation status to approved
  const reservationRef = doc(db, RESERVATIONS_COLLECTION, reservation.id);
  batch.update(reservationRef, {
    status: 'approved',
    updatedAt: now
  });

  // Mark all related numbers as sold
  for (const numId of reservation.numbers) {
    const docId = `${raffleId}__${numId}`;
    const numberRef = doc(db, NUMBERS_COLLECTION, docId);
    batch.update(numberRef, {
      status: 'sold',
      updatedAt: now
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `approve_${reservation.id}`);
  }
}

/**
 * Rejects or cancels a reservation (Admin only), freeing up numbers to "available".
 */
export async function rejectReservation(raffleId: string, reservation: Reservation): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date();

  // Update reservation status to rejected
  const reservationRef = doc(db, RESERVATIONS_COLLECTION, reservation.id);
  batch.update(reservationRef, {
    status: 'rejected',
    updatedAt: now
  });

  // Release numbers
  for (const numId of reservation.numbers) {
    const docId = `${raffleId}__${numId}`;
    const numberRef = doc(db, NUMBERS_COLLECTION, docId);
    batch.update(numberRef, {
      status: 'available',
      buyerName: '',
      buyerPhone: '',
      buyerEmail: '',
      reservationId: '',
      updatedAt: now
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reject_${reservation.id}`);
  }
}

/**
 * Overrides a single number's status manually (Owner/Admin only).
 * Sets status to 'available' (Disponível/Cancelado), 'reserved' (Reservado), or 'sold' (Pago).
 */
export async function manualNumberOverride(
  raffleId: string,
  numberId: string,
  status: 'available' | 'reserved' | 'sold',
  buyerName: string = '',
  buyerPhone: string = '',
  buyerEmail: string = ''
): Promise<void> {
  const docId = `${raffleId}__${numberId}`;
  const numberRef = doc(db, NUMBERS_COLLECTION, docId);
  const now = new Date();
  
  try {
    if (status === 'available') {
      await setDoc(numberRef, {
        id: docId,
        number: numberId,
        raffleId,
        status: 'available',
        buyerName: '',
        buyerPhone: '',
        buyerEmail: '',
        reservationId: '',
        updatedAt: now
      }, { merge: true });
    } else {
      await setDoc(numberRef, {
        id: docId,
        number: numberId,
        raffleId,
        status,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerEmail: buyerEmail.trim(),
        reservationId: status === 'reserved' ? (buyerName ? `manual-${numberId}` : '') : '',
        updatedAt: now
      }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${NUMBERS_COLLECTION}/${docId}`);
    throw error;
  }
}

/**
 * Batch updates multiple numbers' status (Owner/Admin only).
 */
export async function batchUpdateNumbersStatus(
  raffleId: string,
  numberIds: string[],
  status: 'available' | 'reserved' | 'sold'
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date();

  for (const numId of numberIds) {
    const docId = `${raffleId}__${numId}`;
    const numRef = doc(db, NUMBERS_COLLECTION, docId);
    if (status === 'available') {
      batch.update(numRef, {
        status: 'available',
        buyerName: '',
        buyerPhone: '',
        buyerEmail: '',
        reservationId: '',
        updatedAt: now
      });
    } else {
      batch.update(numRef, {
        status,
        updatedAt: now
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch_update_numbers_status');
    throw error;
  }
}

/**
 * Calculates statistical overview of the raffle numbers.
 */
export function calculateStats(numbers: RaffleNumber[], pricePerNumber: number): RaffleStats {
  const stats = {
    total: 100,
    available: 100,
    reserved: 0,
    sold: 0,
  };

  numbers.forEach((num) => {
    if (num.status === 'reserved') {
      stats.reserved++;
      stats.available--;
    } else if (num.status === 'sold') {
      stats.sold++;
      stats.available--;
    }
  });

  const percentSold = stats.total > 0 ? Math.round((stats.sold / stats.total) * 100) : 0;
  const totalEarnings = Number((stats.sold * pricePerNumber).toFixed(2));
  const pendingEarnings = Number((stats.reserved * pricePerNumber).toFixed(2));

  return {
    ...stats,
    percentSold,
    totalEarnings,
    pendingEarnings,
  };
}

const RAFFLES_COLLECTION = 'raffles';

/**
 * Listens to all raffles dynamically from Firestore. If empty, falls back to local data and seeds them.
 */
export function listenToRaffles(callback: (raffles: RaffleItem[]) => void): () => void {
  const q = query(collection(db, RAFFLES_COLLECTION));
  
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list: RaffleItem[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as RaffleItem);
      });
      callback(list);
    } else {
      // Return static list first
      callback(ONGOING_RAFFLES);
      
      // Seed if admin is logged in
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email === OWNER_DETAILS.email) {
        ONGOING_RAFFLES.forEach(async (raffle) => {
          await setDoc(doc(db, RAFFLES_COLLECTION, raffle.id), raffle);
        });
      }
    }
  });
}

/**
 * Creates a new raffle and initializes its configuration document dynamically.
 */
export async function createNewRaffle(raffle: RaffleItem): Promise<void> {
  // Save raffle info
  await setDoc(doc(db, RAFFLES_COLLECTION, raffle.id), raffle);
  
  // Save config info
  await setDoc(doc(db, CONFIG_COLLECTION, raffle.id), {
    id: raffle.id,
    pixKey: OWNER_DETAILS.pixKey,
    pixName: OWNER_DETAILS.pixName,
    pricePerNumber: raffle.price,
    activeNumbers: DEFAULT_ACTIVE_NUMBERS,
  });
}

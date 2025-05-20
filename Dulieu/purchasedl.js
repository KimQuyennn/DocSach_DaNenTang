import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function fetchPurchasesByUser(userId) {
    const q = query(collection(db, 'Purchases'), where('UserId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

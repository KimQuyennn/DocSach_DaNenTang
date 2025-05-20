import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function fetchRatingsByBook(bookId) {
    const q = query(collection(db, 'Ratings'), where('BookId', '==', bookId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

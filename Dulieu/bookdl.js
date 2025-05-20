// Dulieu/bookdl.js
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../firebase';  // Đảm bảo chỉ import app từ firebase.js

const db = getDatabase(app);

export async function fetchBooks() {
    try {
        const snapshot = await get(ref(db, 'Books'));
        if (snapshot.exists()) {
            const books = [];
            snapshot.forEach((childSnapshot) => {
                const book = childSnapshot.val();
                books.push({
                    id: childSnapshot.key,  // id được lấy từ key của mỗi node trong Firebase
                    ...book,  // Thêm các thuộc tính khác của sách
                });
            });
            return books;
        } else {
            console.log("No books available");
            return [];
        }
    } catch (error) {
        console.error("Error fetching books: ", error);
        return [];
    }
}

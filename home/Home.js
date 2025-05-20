// // app/home/index.tsx
// import React, { useEffect, useState } from 'react';
// import { FlatList, Text, TouchableOpacity, StyleSheet, View, Image } from 'react-native';
// import { fetchBooks } from '../../Dulieu/bookdl';  // Đảm bảo đã import hàm fetchBooks

// export default function Home() {
//     const [books, setBooks] = useState<any[]>([]);

//     useEffect(() => {
//         async function loadBooks() {
//             const booksData = await fetchBooks();
//             setBooks(booksData);  // Lưu dữ liệu sách vào state
//         }
//         loadBooks();
//     }, []);

//     // Hàm hiển thị từng sách
//     const renderBookItem = ({ item }: any) => (
//         <TouchableOpacity
//             style={styles.bookItem}
//             onPress={() => console.log(`Book clicked: ${item.Title}`)} // Bạn có thể thêm logic mở chi tiết sách
//         >
//             <Image
//                 source={{ uri: item.CoverImage }}  // Hiển thị ảnh bìa sách từ URL
//                 style={styles.bookImage}
//             />
//             <Text style={styles.bookTitle}>{item.Title}</Text>
//         </TouchableOpacity>
//     );

//     return (
//         <View style={styles.container}>
//             <Text style={styles.title}>Danh sách Sách</Text>
//             <FlatList
//                 data={books}  // Sử dụng dữ liệu sách từ Firebase
//                 renderItem={renderBookItem}  // Hàm render cho từng item
//                 keyExtractor={(item) => item.id}  // Mỗi sách có id duy nhất
//             />
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         paddingTop: 40,
//         paddingHorizontal: 16,
//     },
//     title: {
//         fontSize: 24,
//         fontWeight: 'bold',
//         marginBottom: 20,
//     },
//     bookItem: {
//         flexDirection: 'row',
//         padding: 10,
//         borderBottomWidth: 1,
//         borderColor: '#ddd',
//         marginBottom: 10,
//     },
//     bookImage: {
//         width: 50,
//         height: 75,
//         marginRight: 10,
//     },
//     bookTitle: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#333',
//         flex: 1,
//         alignSelf: 'center',
//     },
// });

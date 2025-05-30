import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from 'firebase/database'; // Import query, orderByChild, equalTo
import { app } from '../firebase';

const Quanly = () => {
    const navigation = useNavigation();
    const auth = getAuth(app);
    const db = getDatabase(app);
    const [userBooks, setUserBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                navigation.navigate('Dangnhap'); // Chuyển hướng nếu chưa đăng nhập
            }
        });
        return () => unsubscribeAuth();
    }, [auth, navigation]);

    useEffect(() => {
        if (userId) {
            setIsLoading(true);
            // Tạo query để lấy sách của tác giả hiện tại
            const userBooksRef = query(ref(db, 'Books'), orderByChild('AuthorId'), equalTo(userId));

            const unsubscribeBooks = onValue(userBooksRef, (snapshot) => {
                const data = snapshot.val();
                const loadedBooks = [];
                if (data) {
                    for (const key in data) {
                        loadedBooks.push({ id: key, ...data[key] });
                    }
                }
                setUserBooks(loadedBooks);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching user books:", error);
                Alert.alert('Lỗi', 'Không thể tải danh sách sách của bạn.');
                setIsLoading(false);
            });

            return () => unsubscribeBooks();
        }
    }, [userId, db]);

    const renderBookItem = ({ item }) => (
        <TouchableOpacity
            style={styles.bookItem}
            onPress={() => navigation.navigate('Themchuong', { bookId: item.id, bookTitle: item.Title })}
        >
            <Image source={{ uri: item.CoverImage }} style={styles.bookCover} />
            <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.Title}</Text>
                <Text style={styles.bookAuthor}>{item.Author}</Text>
                <Text style={styles.bookStatus}>Trạng thái: {item.Status}</Text>
                <Text style={styles.addChapterText}>Thêm chương</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={24} color="#555" />
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF69B4" />
                <Text style={styles.loadingText}>Đang tải sách của bạn...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Quản lý Sách của bạn</Text>
            </View>

            {userBooks.length > 0 ? (
                <FlatList
                    data={userBooks}
                    renderItem={renderBookItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <View style={styles.noBooksContainer}>
                    <Text style={styles.noBooksText}>Bạn chưa có sách nào được đăng tải.</Text>
                    <TouchableOpacity style={styles.addNewBookButton} onPress={() => navigation.navigate('DangTaiSach')}>
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.addNewBookButtonText}>Đăng tải sách mới</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    listContent: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    bookItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    bookCover: {
        width: 70,
        height: 105,
        borderRadius: 6,
        marginRight: 15,
        resizeMode: 'cover',
    },
    bookInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    bookAuthor: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
    },
    bookStatus: {
        fontSize: 13,
        color: '#777',
        marginBottom: 5,
    },
    addChapterText: {
        fontSize: 14,
        color: '#3498db',
        fontWeight: 'bold',
        marginTop: 5,
    },
    noBooksContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noBooksText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        marginBottom: 20,
    },
    addNewBookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF69B4',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    addNewBookButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 5,
    },
});

export default Quanly;

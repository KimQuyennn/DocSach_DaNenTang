import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { app } from '../firebase';

const Choduyet = () => {
    const navigation = useNavigation();
    const auth = getAuth(app);
    const db = getDatabase(app);

    const [userId, setUserId] = useState(null);
    const [pendingBooks, setPendingBooks] = useState([]);
    const [pendingChapters, setPendingChapters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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

            // Fetch pending books by current user
            const userBooksRef = query(ref(db, 'Books'), orderByChild('AuthorId'), equalTo(userId));
            const unsubscribeBooks = onValue(userBooksRef, (snapshot) => {
                const data = snapshot.val();
                const loadedBooks = [];
                if (data) {
                    for (const key in data) {
                        const book = { id: key, ...data[key] };
                        if (book.IsApproved === false) {
                            loadedBooks.push(book);
                        }
                    }
                }
                setPendingBooks(loadedBooks);
                // Sau khi tải sách, mới tải chương
                fetchPendingChapters(loadedBooks);
            }, (error) => {
                console.error("Error fetching user books for approval:", error);
                Alert.alert('Lỗi', 'Không thể tải sách chờ duyệt.');
                setIsLoading(false);
            });

            return () => unsubscribeBooks();
        }
    }, [userId, db]);

    const fetchPendingChapters = (books) => {
        const allPendingChapters = [];
        let chaptersProcessed = 0;
        const totalBooks = books.length;

        if (totalBooks === 0) {
            setIsLoading(false);
            return;
        }

        books.forEach(book => {
            const chaptersRef = ref(db, `Chapters/${book.id}`);
            onValue(chaptersRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    for (const key in data) {
                        const chapter = { id: key, ...data[key], bookTitle: book.Title };
                        if (chapter.IsApproved === false) {
                            allPendingChapters.push(chapter);
                        }
                    }
                }
                chaptersProcessed++;
                if (chaptersProcessed === totalBooks) {
                    setPendingChapters(allPendingChapters);
                    setIsLoading(false);
                }
            }, { onlyOnce: true }); // Chỉ lấy một lần để tránh lặp vô hạn
        });
    };

    const renderBookItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <Image source={{ uri: item.CoverImage || 'https://via.placeholder.com/150' }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.Title}</Text>
                <Text style={styles.itemAuthor}>Tác giả: {item.Author}</Text>
                <Text style={styles.itemStatus}>Trạng thái: Chờ duyệt</Text>
            </View>
        </View>
    );

    const renderChapterItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <Ionicons name="document-text-outline" size={50} color="#888" style={styles.itemIcon} />
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.Title}</Text>
                <Text style={styles.itemAuthor}>Sách: {item.bookTitle}</Text>
                <Text style={styles.itemStatus}>Trạng thái: Chờ duyệt</Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF69B4" />
                <Text style={styles.loadingText}>Đang tải dữ liệu chờ duyệt...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>


            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sách chờ duyệt ({pendingBooks.length})</Text>
                {pendingBooks.length > 0 ? (
                    <FlatList
                        data={pendingBooks}
                        renderItem={renderBookItem}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false} // Tắt cuộn của FlatList con
                    />
                ) : (
                    <Text style={styles.noItemsText}>Không có sách nào chờ duyệt.</Text>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chương chờ duyệt ({pendingChapters.length})</Text>
                {pendingChapters.length > 0 ? (
                    <FlatList
                        data={pendingChapters}
                        renderItem={renderChapterItem}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false} // Tắt cuộn của FlatList con
                    />
                ) : (
                    <Text style={styles.noItemsText}>Không có chương nào chờ duyệt.</Text>
                )}
            </View>

            {pendingBooks.length === 0 && pendingChapters.length === 0 && (
                <View style={styles.allApprovedContainer}>
                    <Ionicons name="checkmark-circle-outline" size={80} color="#28a745" />
                    <Text style={styles.allApprovedText}>Tất cả sách và chương của bạn đã được duyệt!</Text>
                </View>
            )}
        </ScrollView>
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
    section: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.41,
        elevation: 1,
    },
    itemImage: {
        width: 50,
        height: 75,
        borderRadius: 4,
        marginRight: 15,
        resizeMode: 'cover',
    },
    itemIcon: {
        marginRight: 15,
    },
    itemInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 3,
    },
    itemAuthor: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
    },
    itemStatus: {
        fontSize: 13,
        color: '#e74c3c', // Màu đỏ cho trạng thái chờ duyệt
        fontWeight: 'bold',
    },
    noItemsText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        paddingVertical: 10,
    },
    allApprovedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50,
    },
    allApprovedText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#28a745',
        textAlign: 'center',
        marginTop: 15,
    },
});

export default Choduyet;

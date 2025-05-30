import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../firebase';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

const TimKiem = () => {
    const [searchText, setSearchText] = useState('');
    const [genres, setGenres] = useState([]);
    const [showAllGenres, setShowAllGenres] = useState(true); // Biến này không được sử dụng, có thể loại bỏ nếu không cần
    const [searchResults, setSearchResults] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);

    const db = getDatabase(app);
    const genresRef = ref(db, 'Genres');
    const booksRef = ref(db, 'Books');
    const navigation = useNavigation(); // Khởi tạo hook navigation

    useEffect(() => {
        const unsubscribeGenres = onValue(genresRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const genresArray = Object.entries(data).map(([id, genre]) => ({
                    ...genre,
                    Id: id,
                }));
                setGenres(genresArray);
            } else {
                setGenres([]);
            }
        });

        return () => unsubscribeGenres();
    }, [db]);

    const handleGenreSelect = useCallback((genreId) => {
        // Nếu chọn lại thể loại đang được chọn, bỏ chọn
        if (selectedGenre === genreId) {
            setSelectedGenre(null);
        } else {
            setSelectedGenre(genreId);
        }
    }, [selectedGenre]);

    // `toggleShowAllGenres` không được sử dụng, có thể loại bỏ nếu không cần
    // const toggleShowAllGenres = () => {
    //     setShowAllGenres(!showAllGenres);
    // };

    const displayedGenres = useMemo(() => {
        return genres;
    }, [genres]);

    const renderGenreTab = useCallback(({ item }) => {
        const isSelected = selectedGenre === item.Id;
        return (
            <TouchableOpacity
                style={[
                    styles.genreTab,
                    isSelected && styles.selectedGenreTab,
                ]}
                key={item.Id.toString()}
                onPress={() => handleGenreSelect(item.Id)}
            >
                <Text style={[styles.genreText, isSelected && styles.selectedGenreText]}>{item.Name}</Text>
            </TouchableOpacity>
        );
    }, [selectedGenre, handleGenreSelect]);

    useEffect(() => {
        const unsubscribeBooks = onValue(booksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const booksArray = Object.entries(data).map(([id, book]) => ({
                    ...book,
                    Id: id,
                }));

                // Lọc sách chỉ hiển thị những sách đã được duyệt (IsApproved: true)
                let filteredBooks = booksArray.filter(book => book.IsApproved === true);

                if (selectedGenre) {
                    filteredBooks = filteredBooks.filter(book => book.GenreId === selectedGenre);
                }

                if (searchText) {
                    const searchTextLower = searchText.toLowerCase();
                    filteredBooks = filteredBooks.filter(book =>
                        book.Title.toLowerCase().includes(searchTextLower) ||
                        (book.Author && book.Author.toLowerCase().includes(searchTextLower))
                    );
                }
                setSearchResults(filteredBooks);
            } else {
                setSearchResults([]);
            }
        });
        return () => unsubscribeBooks();
    }, [searchText, selectedGenre]); // Thêm `booksRef` vào dependency array nếu bạn muốn nó lắng nghe thay đổi của `booksRef`

    const renderSearchResultItem = useCallback(({ item }) => {
        return (
            <TouchableOpacity
                style={styles.searchResultItem}
                onPress={() => navigation.navigate('Chitiet', { bookId: item.Id })}
            >
                <Image
                    source={{ uri: item.CoverImage || 'https://via.placeholder.com/150' }} // Placeholder nếu không có ảnh
                    style={styles.bookCoverImage}
                />
                <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={2}>{item.Title}</Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>Tác giả: {item.Author || 'Đang cập nhật'}</Text>
                    <Text style={styles.bookDescription} numberOfLines={3}>{item.Description ? item.Description.replace(/<[^>]*>/g, '') : 'Không có mô tả.'}</Text>
                </View>
            </TouchableOpacity>
        );
    }, [navigation]);

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={24} color="gray" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm sách theo tên hoặc tác giả"
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>

            <View style={styles.genreTabsContainer}>
                <FlatList
                    data={displayedGenres}
                    renderItem={renderGenreTab}
                    keyExtractor={(item) => item.Id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.flatListContent}
                    ListEmptyComponent={() => (
                        <Text style={{ textAlign: 'center', marginTop: 10 }}>Không có thể loại nào.</Text>
                    )}
                />
            </View>

            <FlatList
                data={searchResults}
                renderItem={renderSearchResultItem}
                keyExtractor={(item) => item.Id.toString()}
                style={styles.searchResultsContainer}
                ListEmptyComponent={() => (
                    <Text style={styles.placeholderText}>
                        {searchText || selectedGenre ? 'Không tìm thấy kết quả.' : 'Nhập từ khóa hoặc chọn thể loại để tìm kiếm.'}
                    </Text>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'ios' ? 40 : 20, // Thêm padding top an toàn cho iOS
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    genreTabsContainer: {
        marginBottom: 15,
    },
    flatListContent: {
        paddingHorizontal: 15,
    },
    genreTab: {
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    genreText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    selectedGenreTab: {
        backgroundColor: '#FF69B4', // Màu hồng tím tương tự Home.js
        borderColor: '#FF69B4',
    },
    selectedGenreText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    searchResultsContainer: {
        flex: 1,
        paddingHorizontal: 15,
    },
    placeholderText: {
        fontSize: 16,
        color: 'gray',
        textAlign: 'center',
        marginTop: 50,
    },
    searchResultItem: {
        flexDirection: 'row',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    bookCoverImage: {
        width: 80,
        height: 120,
        borderRadius: 8,
        marginRight: 15,
        resizeMode: 'cover',
    },
    bookInfo: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 5,
    },
    bookAuthor: {
        fontSize: 13,
        color: '#666',
        marginBottom: 5,
    },
    bookDescription: {
        fontSize: 12,
        color: '#888',
        lineHeight: 18,
    },
});

export default TimKiem;

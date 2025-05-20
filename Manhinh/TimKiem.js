import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../firebase';

const TimKiem = () => {
    const [searchText, setSearchText] = useState('');
    const [genres, setGenres] = useState([]);
    const [showAllGenres, setShowAllGenres] = useState(true); // Thay đổi giá trị mặc định này
    const [searchResults, setSearchResults] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);

    const db = getDatabase(app);
    const genresRef = ref(db, 'Genres');
    const booksRef = ref(db, 'Books');

    useEffect(() => {
        const unsubscribeGenres = onValue(genresRef, (snapshot) => {
            const data = snapshot.val();
            // console.log("Dữ liệu thể loại từ Firebase:", data);

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
        setSelectedGenre(genreId);
    }, []);

    const toggleShowAllGenres = () => {
        setShowAllGenres(!showAllGenres);
        // console.log('toggleShowAllGenres called, showAllGenres:', !showAllGenres);
    };

    const displayedGenres = useMemo(() => {
        // console.log('displayedGenres calculation, showAllGenres:', showAllGenres, 'genres:', genres);
        return genres; // Luôn trả về tất cả các thể loại
    }, [genres]); // Loại bỏ showAllGenres khỏi dependency

    const renderGenreTab = useCallback(({ item }) => {
        const isSelected = selectedGenre === item.Id;
        // console.log("Đang render tab thể loại:", item);
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
            // console.log("Dữ liệu sách từ Firebase:", data);

            if (data) {
                const booksArray = Object.entries(data).map(([id, book]) => ({
                    ...book,
                    Id: id,
                }));

                let filteredBooks = booksArray;

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
    }, [searchText, selectedGenre]);

    const renderSearchResultItem = useCallback(({ item }) => {
        // console.log("Đang render kết quả tìm kiếm:", item);
        return (
            <TouchableOpacity style={styles.searchResultItem}>
                <Text style={styles.bookTitle}>{item.Title}</Text>
                <Text style={styles.bookAuthor}>By {item.Author || 'Unknown Author'}</Text>
            </TouchableOpacity>
        );
    }, []);

    // Thêm useEffect này để log dữ liệu cuối cùng được truyền cho FlatList
    useEffect(() => {
        // console.log("Thể loại hiển thị cuối cùng:", displayedGenres);
    }, [displayedGenres]);

    useEffect(() => {
        // console.log("Kết quả tìm kiếm cuối cùng:", searchResults);
    }, [searchResults]);

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={24} color="gray" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm truyện theo tên hoặc tác giả"
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

            {/* Sử dụng FlatList cho kết quả tìm kiếm */}
            <FlatList
                data={searchResults}
                renderItem={renderSearchResultItem}
                keyExtractor={(item) => item.Id.toString()}
                style={styles.searchResultsContainer}
                ListEmptyComponent={() => (
                    <Text style={styles.placeholderText}>
                        {searchText ? 'Không tìm thấy kết quả.' : 'Nhập từ khóa để tìm kiếm.'}
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
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: 40,
        paddingHorizontal: 10,
        fontSize: 16,
    },
    genreTabsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    flatListContent: {
        flexGrow: 1,
    },
    genreTab: {
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
        marginRight: 10,
    },
    genreText: {
        fontSize: 14,
        color: '#333',
    },
    moreGenresTab: {
        marginLeft: 10,
        padding: 8,
    },
    searchResultsContainer: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    placeholderText: {
        fontSize: 16,
        color: 'gray',
        textAlign: 'center',
        marginTop: 20,
    },
    searchResultItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    bookTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
    },
    bookAuthor: {
        fontSize: 14,
        color: '#666',
    },
    selectedGenreTab: {
        backgroundColor: '#007bff',
    },
    selectedGenreText: {
        color: '#fff',
    },
});

export default TimKiem;

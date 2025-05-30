import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
// Đã thêm 'get' vào đây
import { getDatabase, ref, push, set, get, onValue } from 'firebase/database';
import { app } from '../firebase';
import { getAuth } from 'firebase/auth';

const Themchuong = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { bookId, bookTitle } = route.params; // Lấy bookId và bookTitle từ params

    const db = getDatabase(app);
    const auth = getAuth(app);
    const user = auth.currentUser;

    const [chapterTitle, setChapterTitle] = useState('');
    const [chapterContent, setChapterContent] = useState('');
    const [loading, setLoading] = useState(false);
    // Lưu ý về chaptersCount: việc đếm số chương cho từng cuốn sách
    // trong cấu trúc phẳng có thể không hiệu quả nếu số lượng lớn.
    // Đã bỏ useEffect liên quan đến onValue ở đây.

    useEffect(() => {
        if (!user) {
            Alert.alert('Lỗi', 'Bạn cần đăng nhập để thêm chương.');
            navigation.goBack();
            return;
        }

        // Bỏ phần lắng nghe onValue để đếm số chương, vì nó không phù hợp với cấu trúc mới
        // (tất cả chương nằm chung một node 'Chapters').
        // Việc đếm số chương cho một cuốn sách cụ thể sẽ được thực hiện khi thêm chương
        // hoặc khi hiển thị danh sách chương.
    }, [user, navigation]); // Removed bookId and db from dependencies as onValue is removed

    const handleAddChapter = async () => {
        if (!user) {
            Alert.alert('Lỗi', 'Bạn cần đăng nhập để thêm chương.');
            return;
        }
        if (!chapterTitle || !chapterContent) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tiêu đề và nội dung chương.');
            return;
        }

        setLoading(true);
        try {
            // Thay đổi đường dẫn: push trực tiếp vào node 'Chapters' chung
            const newChapterRef = push(ref(db, `Chapters`));
            const newChapterId = newChapterRef.key; // Lấy ID duy nhất của chương

            let nextChapterNumber = 1;
            // Thực hiện đếm số chương hiện tại cho cuốn sách này trong cấu trúc phẳng
            // Đây là một thao tác đọc toàn bộ node 'Chapters', có thể tốn kém nếu dữ liệu lớn.
            const allChaptersRef = ref(db, 'Chapters');
            const snapshot = await get(allChaptersRef); // Sử dụng get() để lấy dữ liệu một lần
            if (snapshot.exists()) {
                const chaptersData = snapshot.val();
                let count = 0;
                for (const chapterKey in chaptersData) {
                    // Đảm bảo chỉ đếm các chương thuộc cùng một cuốn sách
                    if (chaptersData[chapterKey].BookId === bookId) {
                        count++;
                    }
                }
                nextChapterNumber = count + 1;
            }

            const newChapterData = {
                Id: newChapterId, // Lưu ID của chương vào trong dữ liệu
                BookId: bookId, // Giữ BookId để biết chương này thuộc cuốn sách nào
                ChapterNumber: nextChapterNumber, // Tăng số chương lên 1
                Title: chapterTitle,
                Content: chapterContent,
                IsApproved: false, // Mặc định là chưa duyệt
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
            };

            await set(newChapterRef, newChapterData); // Lưu dữ liệu vào node với ID duy nhất

            Alert.alert('Thành công', 'Chương mới đã được thêm và đang chờ duyệt!');
            // Reset form
            setChapterTitle('');
            setChapterContent('');
            navigation.goBack(); // Quay lại màn hình quản lý sách
        } catch (error) {
            console.error("Lỗi khi thêm chương:", error);
            Alert.alert('Lỗi', 'Đã có lỗi xảy ra khi thêm chương: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thêm Chương mới cho "{bookTitle}"</Text>
            </View>

            {loading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.overlayText}>Đang xử lý...</Text>
                </View>
            )}

            <View style={styles.formSection}>
                <Text style={styles.label}>Tiêu đề chương:</Text>
                <TextInput
                    style={styles.input}
                    value={chapterTitle}
                    onChangeText={setChapterTitle}
                    placeholder="Nhập tiêu đề chương"
                />

                <Text style={styles.label}>Nội dung chương:</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={chapterContent}
                    onChangeText={setChapterContent}
                    placeholder="Nhập nội dung chương"
                    multiline
                    numberOfLines={10}
                />

                <TouchableOpacity style={styles.addButton} onPress={handleAddChapter}>
                    <Text style={styles.addButtonText}>Thêm Chương</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: Platform.OS === 'ios' ? 40 : 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 20,
        flex: 1, // Cho phép tiêu đề co giãn
        flexWrap: 'wrap', // Cho phép xuống dòng
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    overlayText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },
    formSection: {
        padding: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    textArea: {
        height: 200, // Tăng chiều cao cho textarea
        textAlignVertical: 'top',
    },
    addButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default Themchuong;
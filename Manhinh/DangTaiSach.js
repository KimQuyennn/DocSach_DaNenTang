import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import { app } from '../firebase'; // Đảm bảo đường dẫn này đúng với file khởi tạo Firebase của bạn
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

const removeHTMLTags = (text) => {
    if (!text) return "";
    return text.replace(/<[^>]*>/g, '');
};

const DangTaiSach = () => {
    const navigation = useNavigation();
    const db = getDatabase(app);
    const auth = getAuth(app);
    const user = auth.currentUser;

    // Cấu hình Cloudinary của bạn (Đã di chuyển vào bên trong component)
    const CLOUDINARY_CLOUD_NAME = 'dpde9onm3';
    const CLOUDINARY_UPLOAD_PRESET = 'anhdaidienbooknet';

    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState(''); // Tên tác giả hiển thị
    const [description, setDescription] = useState('');
    const [genreId, setGenreId] = useState(''); // ID thể loại
    const [genres, setGenres] = useState([]); // Danh sách thể loại từ Firebase
    const [coverImageUri, setCoverImageUri] = useState(null);
    const [loading, setLoading] = useState(false);

    // Effect để tải danh sách thể loại từ Firebase
    useEffect(() => {
        const genresRef = ref(db, 'Genres');
        const unsubscribe = onValue(genresRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedGenres = Object.keys(data).map(key => ({
                    id: key,
                    Name: data[key].Name
                }));
                setGenres(loadedGenres);
                if (loadedGenres.length > 0) {
                    setGenreId(loadedGenres[0].id); // Chọn thể loại đầu tiên làm mặc định
                }
            } else {
                setGenres([]);
            }
        });
        return () => unsubscribe();
    }, [db]);

    // Hàm chọn ảnh từ thư viện
    const pickImage = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Quyền truy cập bị từ chối',
                    'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh. Vui lòng cấp quyền trong cài đặt của thiết bị.'
                );
                return;
            }
        }

        try {
            let mediaTypesConfig;
            // Kiểm tra xem ImagePicker.MediaType có tồn tại không
            if (ImagePicker.MediaType && ImagePicker.MediaType.Images) {
                mediaTypesConfig = ImagePicker.MediaType.Images;
            } else if (ImagePicker.MediaTypeOptions && ImagePicker.MediaTypeOptions.Images) {
                // Fallback cho các phiên bản cũ hơn của expo-image-picker
                mediaTypesConfig = ImagePicker.MediaTypeOptions.Images;
            } else {
                Alert.alert('Lỗi', 'Không thể xác định loại phương tiện. Vui lòng kiểm tra cài đặt thư viện ảnh của bạn.');
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: mediaTypesConfig, // Sử dụng cấu hình đã xác định
                allowsEditing: true,
                aspect: [2, 3], // Tỷ lệ khung hình phổ biến cho bìa sách
                quality: 1,
            });

            if (!result.canceled) {
                setCoverImageUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Lỗi khi mở thư viện ảnh hoặc chọn ảnh:", error);
            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi chọn ảnh: ' + error.message);
        }
    };

    // Hàm tải ảnh lên Cloudinary
    const uploadImageToCloudinary = async (uri) => {
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                type: 'image/jpeg',
                name: `book_cover_${user.uid}_${Date.now()}.jpg`,
            });
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); // Sử dụng CLOUDINARY_UPLOAD_PRESET đã định nghĩa trong component

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { // Sử dụng CLOUDINARY_CLOUD_NAME đã định nghĩa trong component
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const data = await response.json();

            if (data.secure_url) {
                return data.secure_url;
            } else {
                console.error("Lỗi phản hồi từ Cloudinary:", data);
                Alert.alert('Lỗi', `Không thể tải ảnh lên Cloudinary. Vui lòng kiểm tra console để biết chi tiết lỗi: ${data.error?.message || 'Lỗi không xác định'}.`);
                throw new Error(data.error?.message || 'Lỗi không xác định từ Cloudinary.');
            }
        } catch (error) {
            console.error("Lỗi khi tải ảnh lên Cloudinary:", error);
            Alert.alert('Lỗi', `Không thể tải ảnh lên Cloudinary: ${error.message || 'Lỗi không xác định'}.`);
            throw error;
        }
    };

    // Hàm xử lý đăng tải sách
    const handleUploadBook = async () => {
        if (!user) {
            Alert.alert('Lỗi', 'Bạn cần đăng nhập để đăng tải sách.');
            return;
        }
        if (!title || !author || !description || !genreId || !coverImageUri) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tất cả các trường và chọn ảnh bìa.');
            return;
        }

        setLoading(true);
        try {
            // 1. Tải ảnh bìa lên Cloudinary
            const coverImageUrl = await uploadImageToCloudinary(coverImageUri);

            // 2. Tạo đối tượng sách mới
            const newBookRef = push(ref(db, 'Books')); // Tạo một ID duy nhất cho sách
            const newBookId = newBookRef.key;

            const newBookData = {
                Id: newBookId,
                Title: title,
                Author: author, // Tên tác giả hiển thị
                AuthorId: user.uid, // ID của người dùng đăng tải
                Description: removeHTMLTags(description), // Xóa thẻ HTML nếu có
                GenreId: genreId,
                CoverImage: coverImageUrl,
                IsApproved: false, // Mặc định là chưa duyệt
                PublishedDate: new Date().toISOString(),
                Status: "Đang cập nhật", // Hoặc "Đang chờ duyệt"
                UpdatedAt: new Date().toISOString(),
                Views: 0,
                // Bạn có thể thêm các trường khác nếu cần, ví dụ: Rating, ChaptersCount
            };

            // 3. Lưu dữ liệu sách vào Firebase Realtime Database
            await set(newBookRef, newBookData);

            Alert.alert('Thành công', 'Sách của bạn đã được đăng tải và đang chờ duyệt!');
            // Reset form
            setTitle('');
            setAuthor('');
            setDescription('');
            setCoverImageUri(null);
            if (genres.length > 0) {
                setGenreId(genres[0].id);
            }

        } catch (error) {
            console.error("Lỗi khi đăng tải sách:", error);
            Alert.alert('Lỗi', 'Đã có lỗi xảy ra khi đăng tải sách: ' + error.message);
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
                <Text style={styles.headerTitle}>Đăng tải Sách</Text>
            </View>

            {loading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.overlayText}>Đang xử lý...</Text>
                </View>
            )}

            <View style={styles.formSection}>
                <Text style={styles.label}>Tiêu đề sách:</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Nhập tiêu đề sách"
                />

                <Text style={styles.label}>Tên tác giả:</Text>
                <TextInput
                    style={styles.input}
                    value={author}
                    onChangeText={setAuthor}
                    placeholder="Nhập tên tác giả"
                />

                <Text style={styles.label}>Mô tả:</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Mô tả tóm tắt về sách"
                    multiline
                    numberOfLines={4}
                />

                <Text style={styles.label}>Thể loại:</Text>
                {genres.length > 0 ? (
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={genreId}
                            onValueChange={(itemValue) => setGenreId(itemValue)}
                            style={styles.picker}
                        >
                            {genres.map((genre) => (
                                <Picker.Item key={genre.id} label={genre.Name} value={genre.id} />
                            ))}
                        </Picker>
                    </View>
                ) : (
                    <Text style={styles.infoText}>Đang tải thể loại...</Text>
                )}

                <Text style={styles.label}>Ảnh bìa:</Text>
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                    {coverImageUri ? (
                        <Image source={{ uri: coverImageUri }} style={styles.coverImagePreview} />
                    ) : (
                        <Ionicons name="image-outline" size={50} color="#ccc" />
                    )}
                    <Text style={styles.imagePickerText}>Chọn ảnh bìa</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.uploadButton} onPress={handleUploadBook}>
                    <Text style={styles.uploadButtonText}>Đăng tải Sách</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default DangTaiSach;

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
        height: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 15,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    imagePickerButton: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        height: 150,
    },
    coverImagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        resizeMode: 'contain',
    },
    imagePickerText: {
        marginTop: 10,
        color: '#555',
        fontSize: 14,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    uploadButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        marginBottom: 15,
    },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, Switch, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { app } from '../firebase'; // Đảm bảo đường dẫn này đúng với file khởi tạo Firebase của bạn
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';

// Cấu hình Cloudinary của bạn
// THAY THẾ CÁC GIÁ TRỊ NÀY VỚI THÔNG TIN CLOUDINARY CỦA BẠN
const CLOUDINARY_CLOUD_NAME = 'dpde9onm3';
const CLOUDINARY_UPLOAD_PRESET = 'anhdaidienbooknet';

const HoSo = () => {
    const navigation = useNavigation();
    const [userData, setUserData] = useState(null);
    const [displayName, setDisplayName] = useState('');
    const [showDisplayName, setShowDisplayName] = useState(true);
    const [userId, setUserId] = useState(null);
    const [avatar, setAvatar] = useState(null); // Giữ state cho avatar

    // Các trường từ CSDL:
    const [email, setEmail] = useState(''); // Chỉ hiển thị
    const [role, setRole] = useState(''); // Chỉ hiển thị
    const [createdAt, setCreatedAt] = useState(''); // Chỉ hiển thị
    const [lastLogin, setLastLogin] = useState(''); // Chỉ hiển thị
    const [passwordHash, setPasswordHash] = useState(''); // Chỉ hiển thị (không chỉnh sửa)
    const [bio, setBio] = useState(''); // Có thể chỉnh sửa
    const [location, setLocation] = useState(''); // Có thể chỉnh sửa
    const [pronouns, setPronouns] = useState(''); // Có thể chỉnh sửa

    const auth = getAuth();
    const db = getDatabase(app);

    // Effect để lắng nghe trạng thái đăng nhập của người dùng
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                // Nếu người dùng chưa đăng nhập, chuyển hướng đến màn hình đăng nhập
                navigation.navigate('Dangnhap');
            }
        });
        return () => unsubscribeAuth(); // Hủy đăng ký lắng nghe khi component unmount
    }, [auth, navigation]);

    // Effect để tải dữ liệu người dùng từ Firebase Realtime Database
    useEffect(() => {
        if (userId) {
            const userRef = ref(db, `Users/${userId}`);
            const unsubscribeDB = onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setUserData(data);
                    setDisplayName(data.Username || '');
                    setShowDisplayName(data.showDisplayName !== undefined ? data.showDisplayName : true);
                    setAvatar(data.Avatar || null); // Tải avatar từ dữ liệu

                    // Tải các trường từ CSDL
                    setEmail(data.Email || '');
                    setRole(data.Role || '');
                    setCreatedAt(data.CreatedAt || '');
                    setLastLogin(data.LastLogin || '');
                    setPasswordHash(data.PasswordHash || ''); // Tải PasswordHash
                    setBio(data.Bio || ''); // Tải Bio
                    setLocation(data.Location || ''); // Tải Location
                    setPronouns(data.Pronouns || ''); // Tải Pronouns

                } else {
                    setUserData(null); // Đặt lại dữ liệu nếu không tìm thấy người dùng
                }
            });
            return () => unsubscribeDB(); // Hủy đăng ký lắng nghe khi component unmount
        }
    }, [db, userId]);

    // Effect để cập nhật các trường input khi userData thay đổi
    useEffect(() => {
        if (userData) {
            setDisplayName(userData.Username || '');
            setEmail(userData.Email || '');
            setRole(userData.Role || '');
            setCreatedAt(userData.CreatedAt || '');
            setLastLogin(userData.LastLogin || '');
            setPasswordHash(userData.PasswordHash || '');
            setBio(userData.Bio || '');
            setLocation(userData.Location || '');
            setPronouns(userData.Pronouns || '');
        }
    }, [userData]);

    // Hàm chọn ảnh từ thư viện
    const pickImage = async () => {
        console.log('Bắt đầu hàm pickImage...');

        // Yêu cầu quyền truy cập thư viện ảnh
        if (Platform.OS !== 'web') {
            console.log('Yêu cầu quyền truy cập thư viện ảnh...');
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('Trạng thái quyền truy cập thư viện ảnh:', status);

            if (status !== 'granted') {
                Alert.alert(
                    'Quyền truy cập bị từ chối',
                    'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh. Vui lòng cấp quyền trong cài đặt của thiết bị.'
                );
                return; // Dừng hàm nếu quyền không được cấp
            }
        } else {
            console.log('Đang chạy trên nền tảng web, bỏ qua yêu cầu quyền truy cập thư viện ảnh.');
        }

        console.log('Đang mở thư viện ảnh...');
        try {
            let mediaTypesConfig;
            // Kiểm tra xem ImagePicker.MediaType có tồn tại không
            if (ImagePicker.MediaType && ImagePicker.MediaType.Images) {
                mediaTypesConfig = ImagePicker.MediaType.Images;
                console.log('Sử dụng ImagePicker.MediaType.Images');
            } else if (ImagePicker.MediaTypeOptions && ImagePicker.MediaTypeOptions.Images) {
                // Fallback cho các phiên bản cũ hơn của expo-image-picker
                mediaTypesConfig = ImagePicker.MediaTypeOptions.Images;
                console.log('Sử dụng ImagePicker.MediaTypeOptions.Images (fallback)');
            } else {
                console.error('Không tìm thấy ImagePicker.MediaType.Images hoặc ImagePicker.MediaTypeOptions.Images');
                Alert.alert('Lỗi', 'Không thể xác định loại phương tiện. Vui lòng kiểm tra cài đặt thư viện ảnh của bạn.');
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: mediaTypesConfig, // Sử dụng cấu hình đã xác định
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled) {
                console.log('Ảnh đã được chọn:', result.assets[0].uri);
                setAvatar(result.assets[0].uri); // Cập nhật URI của ảnh đại diện
            } else {
                console.log('Người dùng đã hủy chọn ảnh.');
            }
        } catch (error) {
            console.error('Lỗi khi mở thư viện ảnh hoặc chọn ảnh:', error);
            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi chọn ảnh: ' + error.message);
        }
    };

    // Hàm tải ảnh lên Cloudinary
    const uploadImageToCloudinary = async (uri) => {
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                type: 'image/jpeg', // Hoặc 'image/png' tùy loại ảnh
                name: `avatar_${userId}_${Date.now()}.jpg`, // Tên file duy nhất
            });
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            // Nếu bạn dùng signed upload, bạn sẽ cần thêm signature và timestamp ở đây
            // formData.append('timestamp', yourTimestamp);
            // formData.append('signature', yourSignature);
            // formData.append('api_key', 'YOUR_CLOUDINARY_API_KEY'); // Chỉ thêm nếu dùng unsigned upload và bạn chấp nhận rủi ro

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const data = await response.json();

            if (data.secure_url) {
                return data.secure_url; // Trả về URL an toàn của ảnh đã tải lên
            } else {
                // Log lỗi chi tiết từ Cloudinary để dễ debug
                console.error("Lỗi phản hồi từ Cloudinary:", data);
                Alert.alert('Lỗi', `Không thể tải ảnh lên Cloudinary. Vui lòng kiểm tra console để biết chi tiết lỗi: ${data.error?.message || 'Lỗi không xác định'}.`);
                throw new Error(data.error?.message || 'Lỗi không xác định từ Cloudinary.');
            }
        } catch (error) {
            console.error("Lỗi khi tải ảnh lên Cloudinary:", error);
            Alert.alert('Lỗi', `Không thể tải ảnh lên Cloudinary: ${error.message || 'Lỗi không xác định'}.`);
            throw error; // Ném lỗi để xử lý ở hàm gọi
        }
    };

    // Hàm xử lý cập nhật hồ sơ
    const handleUpdateProfile = async () => {
        if (userData && userId) {
            const userRef = ref(db, `Users/${userId}`);
            const updates = {};

            // Kiểm tra và cập nhật các trường dữ liệu
            if (displayName !== userData.Username) {
                updates.Username = displayName;
            }
            updates.showDisplayName = showDisplayName; // Luôn cập nhật trạng thái hiển thị tên
            if (location !== userData.Location) {
                updates.Location = location;
            }
            if (bio !== userData.Bio) {
                updates.Bio = bio;
            }
            if (pronouns !== userData.Pronouns) {
                updates.Pronouns = pronouns;
            }

            // Xử lý tải lên và cập nhật ảnh đại diện
            if (avatar && avatar !== userData.Avatar) {
                try {
                    const avatarUrl = await uploadImageToCloudinary(avatar); // Gọi hàm tải lên Cloudinary
                    updates.Avatar = avatarUrl;
                } catch (error) {
                    // Lỗi đã được xử lý trong hàm uploadImageToCloudinary, chỉ cần return để dừng
                    return;
                }
            }

            // Nếu có bất kỳ thay đổi nào, thực hiện cập nhật vào Firebase Realtime Database
            if (Object.keys(updates).length > 0) {
                update(userRef, updates)
                    .then(() => {
                        Alert.alert('Thành công', 'Hồ sơ đã được cập nhật!');
                    })
                    .catch((error) => {
                        Alert.alert('Lỗi', 'Đã có lỗi xảy ra khi cập nhật: ' + error.message);
                    });
            } else {
                Alert.alert('Thông báo', 'Không có thay đổi nào được thực hiện.');
            }
        }
    };

    // Hiển thị trạng thái tải nếu chưa có dữ liệu người dùng
    if (!userData) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Hồ sơ</Text>
                </View>
                <View style={styles.loading}>
                    <Text>Đang tải thông tin...</Text>
                </View>
            </View>
        );
    }

    // Giao diện chính của Hồ sơ
    return (
        <ScrollView style={styles.container}>


            <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                    Thông tin mà bạn nhập ở đây sẽ hiển thị với người dùng khác. Tìm hiểu thêm về cách chia sẻ thông tin an toàn{' '}
                    <Text style={styles.linkText}>ở đây</Text>.
                </Text>
            </View>

            <View style={styles.actionSection}>
                {/* Nút cập nhật ảnh đại diện */}
                <TouchableOpacity style={styles.avatarButton} onPress={pickImage}>
                    <View style={styles.avatarPlaceholder}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatarImage} />
                        ) : userData.Avatar ? (
                            <Image source={{ uri: userData.Avatar }} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={40} color="gray" />
                        )}
                    </View>
                    <Text style={styles.actionText}>Cập Nhật Ảnh Đại Diện</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Tên</Text>
                    <TextInput
                        style={styles.textInput}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Nhập tên của bạn"
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Hiển thị Tên Hiển thị</Text>
                    <Switch
                        value={showDisplayName}
                        onValueChange={setShowDisplayName}
                    />
                </View>
                {/* Các trường có thể chỉnh sửa */}
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Địa điểm</Text>
                    <TextInput
                        style={styles.textInput}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="Nhập địa điểm"
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Giới thiệu</Text>
                    <TextInput
                        style={styles.textInput}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Nhập giới thiệu"
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Đại từ nhân xưng</Text>
                    <View style={styles.pronounsContainer}>
                        <TouchableOpacity
                            style={[
                                styles.pronounButton,
                                pronouns === 'Nam' && styles.selectedPronoun,
                            ]}
                            onPress={() => setPronouns('Nam')}
                        >
                            <Text
                                style={[
                                    styles.pronounText,
                                    pronouns === 'Nam' && styles.selectedPronounText,
                                ]}
                            >
                                Nam
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.pronounButton,
                                pronouns === 'Nữ' && styles.selectedPronoun,
                            ]}
                            onPress={() => setPronouns('Nữ')}
                        >
                            <Text
                                style={[
                                    styles.pronounText,
                                    pronouns === 'Nữ' && styles.selectedPronounText,
                                ]}
                            >
                                Nữ
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                <Text style={styles.saveButtonText}>Lưu</Text>
            </TouchableOpacity>
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
        // Thêm padding top an toàn cho iOS
        paddingTop: Platform.OS === 'ios' ? 40 : 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 20,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        paddingHorizontal: 15,
        paddingVertical: 20,
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    infoText: {
        fontSize: 14,
        color: '#555',
    },
    linkText: {
        color: '#3498db',
    },
    actionSection: {
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
    actionText: {
        fontSize: 16,
        color: '#333',
    },
    settingsSection: {
        paddingHorizontal: 15,
        paddingVertical: 20,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingLabel: {
        fontSize: 16,
        color: '#333',
    },
    settingValue: {
        fontSize: 16,
        color: 'gray',
        flexShrink: 1, // Cho phép text co lại nếu quá dài
        textAlign: 'right',
    },
    textInput: {
        flex: 1,
        textAlign: 'right',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        borderRadius: 5,
        alignItems: 'center',
        margin: 15,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    pronounsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginLeft: 10,
    },
    pronounButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginHorizontal: 5,
        backgroundColor: '#f0f0f0',
    },
    selectedPronoun: {
        backgroundColor: '#3498db',
    },
    pronounText: {
        fontSize: 14,
        color: '#333',
    },
    selectedPronounText: {
        color: '#fff',
    },
});

export default HoSo;

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'; // Loại bỏ updateEmail
import { app } from '../firebase'; // Đảm bảo đường dẫn này đúng với file khởi tạo Firebase của bạn

const TaiKhoan = () => {
    const navigation = useNavigation();
    const auth = getAuth(app);
    const user = auth.currentUser; // Lấy người dùng hiện tại từ Firebase Auth

    // Loại bỏ các state liên quan đến email và username
    // const [userData, setUserData] = useState(null);
    // const [username, setUsername] = useState('');

    const [currentPassword, setCurrentPassword] = useState(''); // Để xác thực lại
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Effect để lắng nghe trạng thái đăng nhập
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
            if (!firebaseUser) {
                // Nếu không có người dùng, chuyển hướng về màn hình đăng nhập
                navigation.navigate('Dangnhap');
            }
        });
        return () => unsubscribeAuth(); // Hủy đăng ký lắng nghe Auth khi component unmount
    }, [auth, navigation]);

    // Hàm xác thực lại người dùng (chỉ dùng cho cập nhật mật khẩu)
    const handleReauthenticate = async () => {
        if (!user) {
            Alert.alert('Lỗi', 'Không có người dùng nào đang đăng nhập.');
            return false;
        }
        if (!currentPassword) {
            Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại để xác thực lại.');
            return false;
        }
        setLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            setCurrentPassword(''); // Xóa mật khẩu hiện tại sau khi xác thực
            return true;
        } catch (error) {
            console.error("Lỗi xác thực lại:", error);
            Alert.alert('Lỗi xác thực', 'Mật khẩu hiện tại không đúng hoặc lỗi khác: ' + error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Hàm cập nhật Mật khẩu
    const handleUpdatePassword = async () => {
        if (!user) {
            Alert.alert('Lỗi', 'Không có người dùng nào đang đăng nhập.');
            return;
        }
        if (!newPassword) {
            Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu mới.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert('Lỗi', 'Mật khẩu mới và xác nhận mật khẩu không khớp.');
            return;
        }
        if (!currentPassword) {
            Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại để cập nhật mật khẩu.');
            return;
        }

        setLoading(true);
        try {
            // Xác thực lại trước khi cập nhật mật khẩu
            const reauthenticated = await handleReauthenticate();
            if (!reauthenticated) {
                return; // Dừng nếu xác thực lại thất bại
            }

            await updatePassword(user, newPassword);
            setNewPassword('');
            setConfirmNewPassword('');
            Alert.alert('Thành công', 'Mật khẩu của bạn đã được cập nhật thành công!');
        } catch (error) {
            console.error("Lỗi cập nhật mật khẩu:", error);
            if (error.code === 'auth/requires-recent-login') {
                Alert.alert('Lỗi', 'Vui lòng đăng xuất và đăng nhập lại để cập nhật mật khẩu.');
            } else {
                Alert.alert('Lỗi', 'Không thể cập nhật mật khẩu: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Kiểm tra chỉ user, không cần userData nữa
    if (!user) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tài khoản</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingText}>Đang tải thông tin người dùng...</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tài khoản</Text>
            </View>

            {loading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.overlayText}>Đang xử lý...</Text>
                </View>
            )}

            {/* Đã loại bỏ hoàn toàn phần cập nhật tên đăng nhập */}
            {/* <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cập nhật Tên đăng nhập</Text>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Tên đăng nhập hiện tại</Text>
                    <Text style={styles.settingValue}>{userData.Username}</Text>
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Tên đăng nhập mới</Text>
                    <TextInput
                        style={styles.textInput}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Nhập tên đăng nhập mới"
                        autoCapitalize="none"
                    />
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdateUsername}>
                    <Text style={styles.saveButtonText}>Cập nhật Tên đăng nhập</Text>
                </TouchableOpacity>
            </View> */}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cập nhật Mật khẩu</Text>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Mật khẩu hiện tại</Text>
                    <TextInput
                        style={styles.textInput}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Nhập mật khẩu hiện tại"
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Mật khẩu mới</Text>
                    <TextInput
                        style={styles.textInput}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Nhập mật khẩu mới"
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Xác nhận mật khẩu mới</Text>
                    <TextInput
                        style={styles.textInput}
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        placeholder="Xác nhận mật khẩu mới"
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdatePassword}>
                    <Text style={styles.saveButtonText}>Cập nhật Mật khẩu</Text>
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
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    section: {
        paddingHorizontal: 15,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingLabel: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    settingValue: {
        fontSize: 16,
        color: 'gray',
        flexShrink: 1,
        textAlign: 'right',
    },
    textInput: {
        flex: 1,
        textAlign: 'right',
        fontSize: 16,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ccc',
        marginLeft: 10,
    },
    saveButton: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
});

export default TaiKhoan;

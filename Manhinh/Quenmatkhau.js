import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';

export default function Quenmatkhau({ navigation }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    const guiEmailDatLaiMatKhau = async () => {
        try {
            if (!username || !email) {
                Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Username và Email');
                return;
            }

            const usersRef = ref(db, 'Users');
            const snapshot = await get(usersRef);
            let isValid = false;

            snapshot.forEach((child) => {
                const data = child.val();
                if (data.Username === username && data.Email === email) {
                    isValid = true;
                }
            });

            if (!isValid) {
                Alert.alert('Lỗi', 'Username và Email không khớp');
                return;
            }

            const auth = getAuth();
            await sendPasswordResetEmail(auth, email);
            Alert.alert('Thành công', 'Đã gửi email đặt lại mật khẩu', [
                {
                    text: 'OK',
                    onPress: () => navigation.replace('Dangnhap'),
                },
            ]);
        } catch (err) {
            console.log(err);
            Alert.alert('Lỗi', 'Không thể gửi email đặt lại mật khẩu');
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 22, marginBottom: 20 }}>Quên mật khẩu</Text>
            <TextInput
                placeholder="Tên đăng nhập"
                onChangeText={setUsername}
                value={username}
                style={{ borderBottomWidth: 1, marginBottom: 10 }}
            />
            <TextInput
                placeholder="Email"
                onChangeText={setEmail}
                value={email}
                style={{ borderBottomWidth: 1, marginBottom: 20 }}
            />
            <Button title="Gửi email đặt lại mật khẩu" onPress={guiEmailDatLaiMatKhau} />
        </View>
    );
}

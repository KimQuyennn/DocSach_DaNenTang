import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dangky from './Manhinh/Dangky';
import Dangnhap from './Manhinh/Dangnhap';
import Home from './Manhinh/Home';
import QuenMatKhau from './Manhinh/Quenmatkhau';
import Chitiet from './Manhinh/Chitiet';
import Thongtin from './Manhinh/Thongtin';
import HoSo from './Manhinh/HoSo';
import TimKiem from './Manhinh/TimKiem';
import ThuVien from './Manhinh/ThuVien';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{
        // headerStyle: {
        //   backgroundColor: '#000',
        // },
        headerTintColor: 'Black',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerTitleAlign: 'center'
      }}>
        <Stack.Screen name="Dangnhap" component={Dangnhap} options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="Dangky" component={Dangky} options={{ title: 'Đăng ký' }} />
        <Stack.Screen name="Quenmatkhau" component={QuenMatKhau} options={{ title: 'Quên mật khẩu' }} />
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="Chitiet" component={Chitiet} options={{ title: 'Chi tiết sách' }} />
        <Stack.Screen name="Thongtin" component={Thongtin} options={{ title: 'Thông tin cá nhân' }} />
        <Stack.Screen name="HoSo" component={HoSo} options={{ title: 'Hồ sơ' }} />
        <Stack.Screen name="TimKiem" component={TimKiem} options={{ title: 'Tìm kiếm' }} />
        <Stack.Screen name="ThuVien" component={ThuVien} options={{ title: 'Thư viện' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

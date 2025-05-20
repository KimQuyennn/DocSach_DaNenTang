// app/_layout.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Layout({ children }: any) {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>App Book</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
});

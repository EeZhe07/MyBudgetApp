
import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) Alert.alert('Sign In Error', error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) Alert.alert('Sign Up Error', error.message);
        else Alert.alert('Success', 'Please check your inbox for email verification!');
        setLoading(false);
    }

    return (
        <LinearGradient
            colors={['#0F172A', '#1E3A5F']}
            style={styles.container}
        >
            <View style={styles.card}>
                <Text style={styles.title}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>
                <Text style={styles.subtitle}>{isLogin ? 'Login to sync your data.' : 'Join to backup your budget.'}</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true}
                    autoCapitalize="none"
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={isLogin ? signInWithEmail : signUpWithEmail}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 20 }}>
                    <Text style={styles.linkText}>
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 24,
        padding: 30,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F8FAFC',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 30,
    },
    input: {
        width: '100%',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 16,
        color: '#FFF',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
        fontSize: 16,
    },
    button: {
        width: '100%',
        backgroundColor: '#6366F1',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    linkText: {
        color: '#6366F1', // Primary color
        fontSize: 14,
    },
});

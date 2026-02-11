
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);

    // Animations
    const logoScale = useRef(new Animated.Value(0)).current;
    const logoRotate = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(50)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance animations
        Animated.sequence([
            // Logo bounce in
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 4,
                tension: 60,
                useNativeDriver: true,
            }),
            // Title fade
            Animated.timing(titleOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            // Card slide up
            Animated.parallel([
                Animated.spring(cardSlide, {
                    toValue: 0,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(cardOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // Subtle logo float animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(logoRotate, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(logoRotate, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const floatInterpolate = logoRotate.interpolate({
        inputRange: [0, 1],
        outputRange: [-5, 5],
    });

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
            colors={['#1A1040', '#2D1B69', '#0F172A']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Decorative Pixel Dots */}
            <View style={styles.pixelDots}>
                {[...Array(12)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.pixelDot,
                            {
                                left: Math.random() * (width - 20),
                                top: Math.random() * 200,
                                opacity: 0.1 + Math.random() * 0.2,
                                width: 4 + Math.random() * 6,
                                height: 4 + Math.random() * 6,
                            },
                        ]}
                    />
                ))}
            </View>

            {/* Logo Section */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        transform: [
                            { scale: logoScale },
                            { translateY: floatInterpolate },
                        ],
                    },
                ]}
            >
                <Image
                    source={require('../assets/icon.png')}
                    style={styles.logo}
                />
            </Animated.View>

            {/* App Name */}
            <Animated.View style={{ opacity: titleOpacity, alignItems: 'center', marginBottom: 30 }}>
                <Text style={styles.appName}>MyBudget</Text>
                <Text style={styles.appTagline}>💰 Smart money, happy life!</Text>
            </Animated.View>

            {/* Login Card */}
            <Animated.View
                style={[
                    styles.card,
                    {
                        opacity: cardOpacity,
                        transform: [{ translateY: cardSlide }],
                    },
                ]}
            >
                <Text style={styles.title}>{isLogin ? '🎮 Welcome Back!' : '🎮 Create Account'}</Text>
                <Text style={styles.subtitle}>
                    {isLogin ? 'Login to sync your data across devices.' : 'Join to backup your budget to the cloud.'}
                </Text>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon}>📧</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#6B7599"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#6B7599"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                        autoCapitalize="none"
                    />
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={isLogin ? signInWithEmail : signUpWithEmail}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isLogin ? '🚀 Sign In' : '✨ Sign Up'}
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Toggle Link */}
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 20 }}>
                    <Text style={styles.linkText}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <Text style={styles.linkHighlight}>
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </Text>
                    </Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <Text style={styles.footer}>Made with ❤️ for smart budgeting</Text>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    pixelDots: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 300,
    },
    pixelDot: {
        position: 'absolute',
        backgroundColor: '#8B5CF6',
        borderRadius: 1,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 24,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#F8FAFC',
        letterSpacing: 1,
    },
    appTagline: {
        fontSize: 14,
        color: '#8B95B0',
        marginTop: 4,
    },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        borderRadius: 24,
        padding: 28,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F8FAFC',
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: '#8B95B0',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 18,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
        paddingHorizontal: 14,
    },
    inputIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        color: '#FFF',
        fontSize: 15,
    },
    button: {
        marginTop: 8,
        borderRadius: 14,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 14,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    linkText: {
        color: '#8B95B0',
        fontSize: 14,
        textAlign: 'center',
    },
    linkHighlight: {
        color: '#8B5CF6',
        fontWeight: 'bold',
    },
    footer: {
        color: 'rgba(139, 149, 176, 0.5)',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 24,
    },
});

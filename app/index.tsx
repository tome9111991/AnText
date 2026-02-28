import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { pickFileAndRead } from '../src/storage';
import { COLORS, FONTS, SIZES } from '../src/theme';

export default function HomeScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Animation Values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Fade in text
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        // Continuous subtle pulse for the icon
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    const handleOpenFile = async () => {
        setLoading(true);
        try {
            const fileData = await pickFileAndRead();
            if (fileData) {
                // We pass the stringified data to the editor screen
                router.push({
                    pathname: '/editor',
                    params: {
                        uri: fileData.uri,
                        name: fileData.name,
                        content: fileData.content,
                        mimeType: fileData.mimeType
                    }
                });
            }
        } catch (error) {
            Alert.alert('Error', 'Could not open the file. Please try another one.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNewFile = () => {
        router.push({
            pathname: '/editor',
            params: {
                uri: 'new',
                name: 'Untitled.txt',
                content: '',
                mimeType: 'text/plain'
            }
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AnText</Text>
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Ionicons name="settings-outline" size={28} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
                    <Ionicons name="document-text" size={80} color={COLORS.primary} />
                </Animated.View>

                <Text style={styles.title}>Welcome</Text>
                <Text style={styles.subtitle}>Open any text file from your device to start editing without distractions.</Text>

                <TouchableOpacity
                    style={styles.openButton}
                    activeOpacity={0.8}
                    onPress={handleOpenFile}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.background} />
                    ) : (
                        <>
                            <Ionicons name="folder-open-outline" size={24} color={COLORS.background} style={styles.btnIcon} />
                            <Text style={styles.openButtonText}>Open File</Text>
                        </>
                    )}
                </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={handleCreateNewFile}
            >
                <Ionicons name="add" size={32} color={COLORS.background} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: SIZES.extraLarge,
    },
    headerTitle: {
        fontSize: SIZES.xxLarge,
        color: COLORS.primary,
        fontWeight: 'bold',
        fontFamily: FONTS.bold,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SIZES.extraLarge,
    },
    iconWrapper: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: COLORS.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SIZES.extraLarge,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 5,
    },
    title: {
        fontSize: SIZES.xxLarge,
        color: COLORS.text,
        fontFamily: FONTS.bold,
        marginBottom: SIZES.small,
    },
    subtitle: {
        fontSize: SIZES.medium,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    openButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: SIZES.extraLarge,
        paddingHorizontal: 40,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        minWidth: 200,
        justifyContent: 'center',
    },
    btnIcon: {
        marginRight: 10,
    },
    openButtonText: {
        color: COLORS.background,
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: FONTS.bold,
    },
    fab: {
        position: 'absolute',
        bottom: 40,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    }
});

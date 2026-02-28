import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '../src/contexts/SettingsContext';
import { COLORS, FONTS, SIZES } from '../src/theme';

export default function SettingsScreen() {
    const router = useRouter();
    const { settings, updateSetting } = useSettings();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <View style={styles.settingItem}>
                    <View style={styles.settingTextContainer}>
                        <Text style={styles.settingTitle}>Default Word Wrap</Text>
                        <Text style={styles.settingDescription}>Wrap text to the next line automatically when opening a file.</Text>
                    </View>
                    <Switch
                        value={settings.defaultWordWrap}
                        onValueChange={(value) => updateSetting('defaultWordWrap', value)}
                        trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary }}
                        thumbColor={COLORS.text}
                    />
                </View>

                <View style={styles.settingItem}>
                    <View style={styles.settingTextContainer}>
                        <Text style={styles.settingTitle}>Default Show Line Numbers</Text>
                        <Text style={styles.settingDescription}>Show line numbers automatically when opening a file.</Text>
                    </View>
                    <Switch
                        value={settings.defaultShowLineNumbers}
                        onValueChange={(value) => updateSetting('defaultShowLineNumbers', value)}
                        trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary }}
                        thumbColor={COLORS.text}
                    />
                </View>
            </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: SIZES.large,
        paddingBottom: SIZES.small,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: SIZES.base,
    },
    title: {
        fontSize: SIZES.large,
        color: COLORS.text,
        fontFamily: FONTS.bold,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 44,
    },
    content: {
        flex: 1,
        padding: SIZES.large,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SIZES.medium,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    settingTextContainer: {
        flex: 1,
        paddingRight: SIZES.large,
    },
    settingTitle: {
        fontSize: SIZES.medium,
        color: COLORS.text,
        fontFamily: FONTS.bold,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: SIZES.font,
        color: COLORS.textSecondary,
        fontFamily: FONTS.regular,
    },
    infoText: {
        fontSize: SIZES.medium,
        color: COLORS.textHint,
        fontFamily: FONTS.regular,
    }
});

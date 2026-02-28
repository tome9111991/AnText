import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { COLORS, FONTS, SIZES } from '../theme';

interface EditorMenuProps {
    visible: boolean;
    onClose: () => void;
    showLineNumbers: boolean;
    onToggleLineNumbers: () => void;
    onCopyAll: () => void;
    onSelectAll: () => void;
    onReload: () => void;
    onClear: () => void;
    onSettings: () => void;
    onExit: () => void;
}

export default function EditorMenu({
    visible, onClose, showLineNumbers, onToggleLineNumbers,
    onCopyAll, onSelectAll, onReload, onClear, onSettings, onExit
}: EditorMenuProps) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.menuContainer}>
                            <View style={styles.menuHeader}>
                                <Text style={styles.menuTitle}>Options</Text>
                            </View>

                            <TouchableOpacity style={styles.menuItem} onPress={() => { onToggleLineNumbers(); onClose(); }}>
                                <Ionicons name={showLineNumbers ? "checkbox-outline" : "square-outline"} size={24} color={COLORS.text} style={styles.menuIcon} />
                                <Text style={styles.menuText}>Show Line Numbers</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => { onCopyAll(); onClose(); }}>
                                <Ionicons name="copy-outline" size={24} color={COLORS.text} style={styles.menuIcon} />
                                <Text style={styles.menuText}>Copy All Text</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => { onSelectAll(); onClose(); }}>
                                <Ionicons name="scan-outline" size={24} color={COLORS.text} style={styles.menuIcon} />
                                <Text style={styles.menuText}>Select All</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => { onReload(); onClose(); }}>
                                <Ionicons name="refresh-outline" size={24} color={COLORS.text} style={styles.menuIcon} />
                                <Text style={styles.menuText}>Reload File</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => { onSettings(); onClose(); }}>
                                <Ionicons name="settings-outline" size={24} color={COLORS.text} style={styles.menuIcon} />
                                <Text style={styles.menuText}>Settings</Text>
                            </TouchableOpacity>

                            <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 4 }} />

                            <TouchableOpacity style={styles.menuItem} onPress={() => { onClear(); onClose(); }}>
                                <Ionicons name="trash-outline" size={24} color={COLORS.error} style={styles.menuIcon} />
                                <Text style={[styles.menuText, { color: COLORS.error }]}>Clear Content</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => { onExit(); onClose(); }}>
                                <Ionicons name="exit-outline" size={24} color={COLORS.error} style={styles.menuIcon} />
                                <Text style={[styles.menuText, { color: COLORS.error }]}>Exit App</Text>
                            </TouchableOpacity>

                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    menuContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.base,
        minWidth: 200,
        marginTop: 90,
        marginLeft: SIZES.large,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    menuHeader: {
        padding: SIZES.medium,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.surfaceHighlight || COLORS.surface,
    },
    menuTitle: {
        fontFamily: FONTS.bold,
        fontSize: SIZES.medium,
        color: COLORS.text,
        fontWeight: 'bold',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SIZES.medium,
        paddingHorizontal: SIZES.medium,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuIcon: {
        marginRight: SIZES.small,
    },
    menuText: {
        fontFamily: FONTS.regular,
        fontSize: SIZES.medium,
        color: COLORS.text,
    },
});

import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EditorMenu from '../src/components/EditorMenu';
import { EditorWebView, EditorWebViewRef } from '../src/components/EditorWebView';
import { useSettings } from '../src/contexts/SettingsContext';
import { getPendingFile, loadFileContentStr, saveFileContent, saveNewFileContent } from '../src/storage';
import { COLORS, FONTS, SIZES } from '../src/theme';

export default function EditorScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri;
    const name = Array.isArray(params.name) ? params.name[0] : params.name;
    const mimeType = Array.isArray(params.mimeType) ? params.mimeType[0] : params.mimeType;

    const { settings } = useSettings();

    const [currentUri, setCurrentUri] = useState<string | null>(uri);
    const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isWordWrap, setIsWordWrap] = useState(settings.defaultWordWrap);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [showLineNumbers, setShowLineNumbers] = useState(settings.defaultShowLineNumbers);

    const editorRef = useRef<EditorWebViewRef>(null);

    useEffect(() => {
        setIsWordWrap(settings.defaultWordWrap);
        setShowLineNumbers(settings.defaultShowLineNumbers);
    }, [settings.defaultWordWrap, settings.defaultShowLineNumbers]);

    useEffect(() => {
        const loadFileContent = async () => {
            setIsLoading(true);
            try {
                let text = '';
                const pending = getPendingFile();
                const actualUri = pending?.uri || uri;
                const safeUri = pending ? actualUri : (actualUri ? decodeURIComponent(actualUri) : '');

                if (safeUri && safeUri !== 'new') {
                    setCurrentUri(safeUri);
                    text = await loadFileContentStr(safeUri);
                }

                setInitialContent(text);
                setHasUnsavedChanges(false);
            } catch (error) {
                console.error("Failed to load file content:", error);
                Alert.alert("Error", "Could not load the file content.");
            } finally {
                setIsLoading(false);
            }
        };
        loadFileContent();
    }, [uri]);

    const isCodeFile = name ? /\.(js|ts|jsx|tsx|py|json|md|html|css|java|c|cpp|cs|go|rs|php|rb|sh)$/i.test(name) : false;

    // --- Actions ---

    const handleSave = async () => {
        if (!currentUri || !hasUnsavedChanges) return;
        setIsSaving(true);
        // Request the content from the WebView. It will asynchronously call onSaveRequested.
        editorRef.current?.requestSave();
    };

    const onSaveRequested = async (contentToSave: string) => {
        try {
            if (currentUri === 'new' || !currentUri) {
                const newUri = await saveNewFileContent(contentToSave, name || 'Untitled.txt', mimeType || 'text/plain');
                if (newUri) {
                    setCurrentUri(newUri);
                    setHasUnsavedChanges(false);
                    Alert.alert('Success', 'File created and saved successfully!');
                }
            } else {
                const newUri = await saveFileContent(currentUri, contentToSave, mimeType);
                if (newUri && typeof newUri === 'string' && newUri !== currentUri) {
                    setCurrentUri(newUri);
                }
                setHasUnsavedChanges(false);
                Alert.alert('Success', 'File saved successfully!');
            }
        } catch (error) {
            Alert.alert('Save Error', 'Could not save the file automatically. You may need to grant storage permissions or save it as a new file.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyAll = () => {
        editorRef.current?.copyAll();
    };

    const onCopyContent = async (content: string) => {
        await Clipboard.setStringAsync(content);
        if (content.length > 50) {
            if (Platform.OS === 'android') {
                ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
            } else {
                Alert.alert('Copied', 'Content copied to clipboard');
            }
        }
    };

    const handleClearAll = () => {
        Alert.alert("Clear Content", "Are you sure you want to delete everything in this file?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Clear",
                style: "destructive",
                onPress: () => editorRef.current?.clear()
            }
        ]);
    };

    const loadFileContentFromSource = async (fileUri: string, showToast = false) => {
        try {
            const freshContent = await loadFileContentStr(fileUri);
            editorRef.current?.setContent(freshContent);
            setHasUnsavedChanges(false);

            if (showToast) {
                if (Platform.OS === 'android') {
                    ToastAndroid.show('File reloaded from disk', ToastAndroid.SHORT);
                } else {
                    Alert.alert('Reloaded', 'File reloaded from disk.');
                }
            }
        } catch (error) {
            console.error("Failed to reload file content:", error);
            Alert.alert("Error", "Could not reload the file content from disk.");
        }
    };

    const handleReloadFile = async () => {
        if (!currentUri || currentUri === 'new') return;

        if (hasUnsavedChanges) {
            Alert.alert("Reload File", "Discard all unsaved changes and reload original file from disk?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reload",
                    style: "destructive",
                    onPress: () => loadFileContentFromSource(currentUri, true)
                }
            ]);
        } else {
            await loadFileContentFromSource(currentUri, true);
        }
    };

    const handleExitApp = () => {
        if (hasUnsavedChanges) {
            Alert.alert(
                'Unsaved Changes',
                'You have unsaved changes. Are you sure you want to exit without saving?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Exit App', style: 'destructive', onPress: () => BackHandler.exitApp() }
                ]
            );
        } else {
            BackHandler.exitApp();
        }
    };

    const handleBack = () => {
        if (hasUnsavedChanges) {
            Alert.alert(
                'Unsaved Changes',
                'You have unsaved changes. Are you sure you want to leave?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => router.back() }
                ]
            );
        } else {
            router.back();
        }
    };

    const handlePaste = async () => {
        const textToPaste = await Clipboard.getStringAsync();
        if (textToPaste) {
            editorRef.current?.pasteText(textToPaste);
        }
    };

    if (!currentUri) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No file path provided.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <EditorMenu
                visible={isMenuVisible}
                onClose={() => setIsMenuVisible(false)}
                showLineNumbers={showLineNumbers}
                onToggleLineNumbers={() => setShowLineNumbers(!showLineNumbers)}
                onCopyAll={handleCopyAll}
                onSelectAll={() => { /* Not needed, copyAll does the job */ }}
                onReload={handleReloadFile}
                onClear={handleClearAll}
                onSettings={() => router.push('/settings')}
                onExit={handleExitApp}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.iconButton}>
                    <Ionicons name="ellipsis-vertical" size={28} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                        {name || 'Untitled File'}
                    </Text>
                    {hasUnsavedChanges && <Text style={styles.unsavedIndicator}>*</Text>}
                </View>

                <TouchableOpacity onPress={() => setIsWordWrap(!isWordWrap)} style={styles.iconButton}>
                    <Ionicons name={isWordWrap ? "document-text" : "code-slash"} size={22} color={COLORS.textHint} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveButton}
                    disabled={isSaving || !hasUnsavedChanges}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Ionicons
                            name="save-outline"
                            size={28}
                            color={hasUnsavedChanges ? COLORS.primary : COLORS.textHint}
                        />
                    )}
                </TouchableOpacity>
            </View>

            {/* Editor Toolbar */}
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={() => editorRef.current?.copySelection()} style={styles.toolbarButton}>
                    <Ionicons name="copy-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => editorRef.current?.cutSelection()} style={styles.toolbarButton}>
                    <Ionicons name="cut-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePaste} style={styles.toolbarButton}>
                    <Ionicons name="clipboard-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.toolbarDivider} />

                <TouchableOpacity onPress={() => editorRef.current?.undo()} style={styles.toolbarButton}>
                    <Ionicons name="arrow-undo-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => editorRef.current?.redo()} style={styles.toolbarButton}>
                    <Ionicons name="arrow-redo-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.toolbarDivider} />

                <TouchableOpacity onPress={() => editorRef.current?.moveCursorLeft()} style={styles.toolbarButton}>
                    <Ionicons name="arrow-back-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => editorRef.current?.moveCursorRight()} style={styles.toolbarButton}>
                    <Ionicons name="arrow-forward-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.toolbarDivider} />

                <TouchableOpacity onPress={handleBack} style={[styles.toolbarButton, styles.closeButton]}>
                    <Ionicons name="close" size={22} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={[styles.editorWrapper, { paddingBottom: Math.max(insets.bottom, 0) }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {isLoading || initialContent === undefined ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: 10, color: COLORS.textHint }}>Loading File...</Text>
                    </View>
                ) : (
                    <EditorWebView
                        ref={editorRef}
                        initialContent={initialContent}
                        isWordWrap={isWordWrap}
                        showLineNumbers={showLineNumbers}
                        isCodeFile={isCodeFile}
                        onDirty={() => setHasUnsavedChanges(true)}
                        onSaveRequested={onSaveRequested}
                        onCopyContent={onCopyContent}
                    />
                )}
            </KeyboardAvoidingView>
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
        paddingTop: 50,
        paddingHorizontal: SIZES.large,
        paddingBottom: SIZES.small,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SIZES.small,
    },
    fileName: {
        fontSize: SIZES.medium,
        color: COLORS.text,
        fontFamily: FONTS.bold,
        fontWeight: 'bold',
    },
    unsavedIndicator: {
        color: COLORS.primary,
        fontSize: SIZES.medium,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    iconButton: {
        padding: SIZES.base,
    },
    saveButton: {
        padding: SIZES.base,
        minWidth: 44,
        alignItems: 'center',
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        paddingVertical: 6,
        backgroundColor: COLORS.surfaceHighlight || COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        width: '100%',
    },
    toolbarButton: {
        flex: 1,
        height: 38,
        maxWidth: 44,
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 3,
    },
    closeButton: {
        marginRight: 0,
        backgroundColor: COLORS.error ? COLORS.error + '20' : 'rgba(255,0,0,0.1)',
        borderColor: COLORS.error ? COLORS.error + '50' : 'rgba(255,0,0,0.3)',
    },
    toolbarDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
        marginHorizontal: 2,
    },
    editorWrapper: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: COLORS.error,
        fontSize: SIZES.large,
        marginBottom: SIZES.large,
    },
    backButton: {
        backgroundColor: COLORS.surfaceHighlight,
        padding: SIZES.medium,
        borderRadius: SIZES.small,
    },
    backButtonText: {
        color: COLORS.text,
        fontSize: SIZES.medium,
    }
});

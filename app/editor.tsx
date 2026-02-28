import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, KeyboardAvoidingView, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditorMenu from '../src/components/EditorMenu';
import { useSettings } from '../src/contexts/SettingsContext';
import { saveFileContent, saveNewFileContent } from '../src/storage';
import { COLORS, FONTS, SIZES } from '../src/theme';

export default function EditorScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri;
    const name = Array.isArray(params.name) ? params.name[0] : params.name;
    const initialContent = Array.isArray(params.content) ? params.content[0] : params.content;
    const mimeType = Array.isArray(params.mimeType) ? params.mimeType[0] : params.mimeType;
    const insets = useSafeAreaInsets();
    const bottomOffset = Math.max(0, insets.bottom);

    const { settings } = useSettings();

    const [currentUri, setCurrentUri] = useState<string | null>(uri);
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isWordWrap, setIsWordWrap] = useState(settings.defaultWordWrap);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [showLineNumbers, setShowLineNumbers] = useState(settings.defaultShowLineNumbers);

    useEffect(() => {
        setIsWordWrap(settings.defaultWordWrap);
        setShowLineNumbers(settings.defaultShowLineNumbers);
    }, [settings.defaultWordWrap, settings.defaultShowLineNumbers]);

    // Undo/Redo State
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyState = useRef({ history: [] as string[], index: -1 });
    const isUndoRedoActive = useRef(false);
    const historyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const saveToHistory = (newText: string) => {
        const { history, index } = historyState.current;
        const currentHistory = history.slice(0, index + 1);
        if (currentHistory.length > 0 && currentHistory[currentHistory.length - 1] === newText) {
            return;
        }
        currentHistory.push(newText);
        if (currentHistory.length > 50) currentHistory.shift();
        historyState.current = { history: currentHistory, index: currentHistory.length - 1 };

        setHistoryIndex(historyState.current.index);
        setHistory(historyState.current.history);
    };

    // Editor Ref and Selection
    const inputRef = useRef<TextInput>(null);
    const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

    // Fast Scroller State
    const verticalScrollRef = useRef<ScrollView>(null);
    const [contentHeight, setContentHeight] = useState(1);
    const [visibleHeight, setVisibleHeight] = useState(1);
    const [scrollY, setScrollY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const dimensions = useRef({
        indicatorHeight: 30,
        maxIndicatorY: 0,
        maxScrollY: 0,
    });

    // Horizontal Fast Scroller State
    const horizontalScrollRef = useRef<ScrollView>(null);
    const [contentWidth, setContentWidth] = useState(1);
    const [visibleWidth, setVisibleWidth] = useState(1);
    const [scrollX, setScrollX] = useState(0);
    const [isHorizontalDragging, setIsHorizontalDragging] = useState(false);

    const hDimensions = useRef({
        indicatorWidth: 30,
        maxIndicatorX: 0,
        maxScrollX: 0,
    });

    const vScrollOpacity = useRef(new Animated.Value(0)).current;
    const hScrollOpacity = useRef(new Animated.Value(0)).current;
    const vScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (vScrollTimeout.current) clearTimeout(vScrollTimeout.current);
        Animated.timing(vScrollOpacity, { toValue: 1, duration: 50, useNativeDriver: true }).start();

        if (!isDragging) {
            vScrollTimeout.current = setTimeout(() => {
                Animated.timing(vScrollOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start();
            }, 3000);
        }
        return () => { if (vScrollTimeout.current) clearTimeout(vScrollTimeout.current); };
    }, [scrollY, isDragging, contentHeight, visibleHeight]);

    useEffect(() => {
        if (hScrollTimeout.current) clearTimeout(hScrollTimeout.current);
        Animated.timing(hScrollOpacity, { toValue: 1, duration: 50, useNativeDriver: true }).start();

        if (!isHorizontalDragging) {
            hScrollTimeout.current = setTimeout(() => {
                Animated.timing(hScrollOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start();
            }, 3000);
        }
        return () => { if (hScrollTimeout.current) clearTimeout(hScrollTimeout.current); };
    }, [scrollX, isHorizontalDragging, contentWidth, visibleWidth, isWordWrap]);

    useEffect(() => {
        const trackHeight = Math.max(1, visibleHeight - 16); // 8px margin top & bottom
        let indHeight = (trackHeight / contentHeight) * trackHeight;
        if (isNaN(indHeight) || !isFinite(indHeight)) indHeight = 30;
        indHeight = Math.max(40, Math.min(indHeight, trackHeight - 4));

        dimensions.current = {
            indicatorHeight: indHeight,
            maxIndicatorY: Math.max(0, trackHeight - indHeight),
            maxScrollY: Math.max(0, contentHeight - visibleHeight),
        };
    }, [visibleHeight, contentHeight]);

    useEffect(() => {
        const trackWidth = Math.max(1, visibleWidth - 16); // 8px margin
        let indWidth = (trackWidth / contentWidth) * trackWidth;
        if (isNaN(indWidth) || !isFinite(indWidth)) indWidth = 30;
        indWidth = Math.max(40, Math.min(indWidth, trackWidth - 4));

        hDimensions.current = {
            indicatorWidth: indWidth,
            maxIndicatorX: Math.max(0, trackWidth - indWidth),
            maxScrollX: Math.max(0, contentWidth - visibleWidth),
        };
    }, [visibleWidth, contentWidth]);

    const scrollState = useRef({ startIndicatorTop: 0 }).current;
    const hScrollState = useRef({ startIndicatorLeft: 0 }).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderGrant: (evt) => {
                setIsDragging(true);
                const { indicatorHeight, maxIndicatorY } = dimensions.current;
                const touchY = evt.nativeEvent.locationY;
                let newTop = touchY - indicatorHeight / 2;
                if (newTop < 0) newTop = 0;
                if (newTop > maxIndicatorY) newTop = maxIndicatorY;

                scrollState.startIndicatorTop = newTop;
                applyScrollFromIndicator(newTop);
            },
            onPanResponderMove: (evt, gestureState) => {
                const { maxIndicatorY } = dimensions.current;
                let newTop = scrollState.startIndicatorTop + gestureState.dy;
                if (newTop < 0) newTop = 0;
                if (newTop > maxIndicatorY) newTop = maxIndicatorY;

                applyScrollFromIndicator(newTop);
            },
            onPanResponderRelease: () => setIsDragging(false),
            onPanResponderTerminate: () => setIsDragging(false),
        })
    ).current;

    const hPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderGrant: (evt) => {
                setIsHorizontalDragging(true);
                const { indicatorWidth, maxIndicatorX } = hDimensions.current;
                const touchX = evt.nativeEvent.locationX;
                let newLeft = touchX - indicatorWidth / 2;
                if (newLeft < 0) newLeft = 0;
                if (newLeft > maxIndicatorX) newLeft = maxIndicatorX;

                hScrollState.startIndicatorLeft = newLeft;
                applyHScrollFromIndicator(newLeft);
            },
            onPanResponderMove: (evt, gestureState) => {
                const { maxIndicatorX } = hDimensions.current;
                let newLeft = hScrollState.startIndicatorLeft + gestureState.dx;
                if (newLeft < 0) newLeft = 0;
                if (newLeft > maxIndicatorX) newLeft = maxIndicatorX;

                applyHScrollFromIndicator(newLeft);
            },
            onPanResponderRelease: () => setIsHorizontalDragging(false),
            onPanResponderTerminate: () => setIsHorizontalDragging(false),
        })
    ).current;

    const applyScrollFromIndicator = (newTop: number) => {
        const { maxIndicatorY, maxScrollY } = dimensions.current;
        if (maxIndicatorY <= 0 || maxScrollY <= 0) return;
        const percentage = newTop / maxIndicatorY;
        const newScrollY = percentage * maxScrollY;
        verticalScrollRef.current?.scrollTo({ y: newScrollY, animated: false });
    };

    const applyHScrollFromIndicator = (newLeft: number) => {
        const { maxIndicatorX, maxScrollX } = hDimensions.current;
        if (maxIndicatorX <= 0 || maxScrollX <= 0) return;
        const percentage = newLeft / maxIndicatorX;
        const newScrollX = percentage * maxScrollX;
        horizontalScrollRef.current?.scrollTo({ x: newScrollX, animated: false });
    };

    let indicatorTop = 0;
    if (dimensions.current.maxScrollY > 0) {
        indicatorTop = (scrollY / dimensions.current.maxScrollY) * dimensions.current.maxIndicatorY;
    }
    if (indicatorTop < 0) indicatorTop = 0;
    if (indicatorTop > dimensions.current.maxIndicatorY) indicatorTop = dimensions.current.maxIndicatorY;

    let indicatorLeft = 0;
    if (hDimensions.current.maxScrollX > 0) {
        indicatorLeft = (scrollX / hDimensions.current.maxScrollX) * hDimensions.current.maxIndicatorX;
    }
    if (indicatorLeft < 0) indicatorLeft = 0;
    if (indicatorLeft > hDimensions.current.maxIndicatorX) indicatorLeft = hDimensions.current.maxIndicatorX;

    // Animation for smooth entry
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const initialText = initialContent || '';
        setContent(initialText);

        historyState.current = { history: [initialText], index: 0 };
        setHistory([initialText]);
        setHistoryIndex(0);

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, [initialContent]);

    // Determine if it's likely a code file to default monospace
    const isCodeFile = name ? /\.(js|ts|jsx|tsx|py|json|md|html|css|java|c|cpp|cs|go|rs|php|rb|sh)$/i.test(name) : false;

    const lineCount = content.split('\n').length || 1;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');


    const handleTextChange = (text: string) => {
        setContent(text);
        if (!hasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }

        if (isUndoRedoActive.current) {
            isUndoRedoActive.current = false;
            return;
        }

        if (historyTimeout.current) clearTimeout(historyTimeout.current);
        historyTimeout.current = setTimeout(() => {
            saveToHistory(text);
        }, 500);
    };

    const handleSelectionChange = (e: any) => {
        setSelection(e.nativeEvent.selection);
    };

    const handleCopy = async () => {
        if (selection.start !== selection.end) {
            const startIdx = Math.min(selection.start, selection.end);
            const endIdx = Math.max(selection.start, selection.end);
            const selectedText = content.substring(startIdx, endIdx);
            await Clipboard.setStringAsync(selectedText);
        }
    };

    const handleCut = async () => {
        if (selection.start !== selection.end) {
            const startIdx = Math.min(selection.start, selection.end);
            const endIdx = Math.max(selection.start, selection.end);
            const selectedText = content.substring(startIdx, endIdx);
            await Clipboard.setStringAsync(selectedText);

            const newContent = content.substring(0, startIdx) + content.substring(endIdx);
            handleTextChange(newContent);
            setSelection({ start: startIdx, end: startIdx });
        }
    };

    const handlePaste = async () => {
        const textToPaste = await Clipboard.getStringAsync();
        if (!textToPaste) return;

        const startIdx = Math.min(selection.start, selection.end);
        const endIdx = Math.max(selection.start, selection.end);

        const newContent = content.substring(0, startIdx) + textToPaste + content.substring(endIdx);
        handleTextChange(newContent);

        const newCursor = startIdx + textToPaste.length;
        setSelection({ start: newCursor, end: newCursor });
    };

    const handleCopyAll = async () => {
        await Clipboard.setStringAsync(content);
        Alert.alert('Copied', 'All text copied to clipboard.', [{ text: 'OK' }]);
    };

    const handleSelectAll = () => {
        setSelection({ start: 0, end: content.length });
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleReloadFile = () => {
        if (!hasUnsavedChanges) return;
        Alert.alert("Reload File", "Discard all unsaved changes and revert to original?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Reload",
                style: "destructive",
                onPress: () => {
                    const original = initialContent || '';
                    setContent(original);
                    setHasUnsavedChanges(false);
                    historyState.current = { history: [original], index: 0 };
                    setHistory([original]);
                    setHistoryIndex(0);
                }
            }
        ]);
    };

    const handleClearAll = () => {
        Alert.alert("Clear Content", "Are you sure you want to delete everything in this file?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Clear",
                style: "destructive",
                onPress: () => {
                    handleTextChange('');
                }
            }
        ]);
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

    const handleUndo = () => {
        if (historyTimeout.current) clearTimeout(historyTimeout.current);
        const { history, index } = historyState.current;
        if (index > 0) {
            isUndoRedoActive.current = true;
            const newIndex = index - 1;
            historyState.current.index = newIndex;
            setHistoryIndex(newIndex);
            setContent(history[newIndex]);
            setHasUnsavedChanges(true);
        }
    };

    const handleRedo = () => {
        if (historyTimeout.current) clearTimeout(historyTimeout.current);
        const { history, index } = historyState.current;
        if (index < history.length - 1) {
            isUndoRedoActive.current = true;
            const newIndex = index + 1;
            historyState.current.index = newIndex;
            setHistoryIndex(newIndex);
            setContent(history[newIndex]);
            setHasUnsavedChanges(true);
        }
    };

    const handleLeftArrow = () => {
        const startIdx = Math.min(selection.start, selection.end);
        let newPos = 0;
        if (selection.start !== selection.end) {
            newPos = startIdx;
        } else {
            newPos = Math.max(0, selection.start - 1);
        }
        setSelection({ start: newPos, end: newPos });
        inputRef.current?.focus();
    };

    const handleRightArrow = () => {
        const endIdx = Math.max(selection.start, selection.end);
        let newPos = content.length;
        if (selection.start !== selection.end) {
            newPos = endIdx;
        } else {
            newPos = Math.min(content.length, selection.start + 1);
        }
        setSelection({ start: newPos, end: newPos });
        inputRef.current?.focus();
    };

    const handleSave = async () => {
        if (!currentUri) return;
        setIsSaving(true);

        try {
            if (currentUri === 'new') {
                const newUri = await saveNewFileContent(content, name || 'Untitled.txt', mimeType || 'text/plain');
                if (newUri) {
                    setCurrentUri(newUri);
                    setHasUnsavedChanges(false);
                    Alert.alert('Success', 'File created and saved successfully!');
                }
            } else {
                const newUri = await saveFileContent(currentUri, content, mimeType);
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
                onSelectAll={handleSelectAll}
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

                {/* Word Wrap Toggle */}
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
                <TouchableOpacity onPress={handleCopy} style={styles.toolbarButton}>
                    <Ionicons name="copy-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCut} style={styles.toolbarButton}>
                    <Ionicons name="cut-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePaste} style={styles.toolbarButton}>
                    <Ionicons name="clipboard-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.toolbarDivider} />

                <TouchableOpacity onPress={handleUndo} style={styles.toolbarButton} disabled={historyIndex <= 0}>
                    <Ionicons name="arrow-undo-outline" size={20} color={historyIndex > 0 ? COLORS.text : COLORS.textHint} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRedo} style={styles.toolbarButton} disabled={historyIndex >= history.length - 1}>
                    <Ionicons name="arrow-redo-outline" size={20} color={historyIndex < history.length - 1 ? COLORS.text : COLORS.textHint} />
                </TouchableOpacity>

                <View style={styles.toolbarDivider} />

                <TouchableOpacity onPress={handleLeftArrow} style={styles.toolbarButton}>
                    <Ionicons name="arrow-back-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRightArrow} style={styles.toolbarButton}>
                    <Ionicons name="arrow-forward-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.toolbarDivider} />

                <TouchableOpacity onPress={handleBack} style={[styles.toolbarButton, styles.closeButton]}>
                    <Ionicons name="close" size={22} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.editorWrapper}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Animated.View style={[styles.editorContainer, { opacity: fadeAnim }]}>
                    <ScrollView
                        ref={verticalScrollRef}
                        style={styles.verticalScroll}
                        contentContainerStyle={styles.verticalScrollContent}
                        onContentSizeChange={(_w, h) => setContentHeight(h)}
                        onLayout={(e) => setVisibleHeight(e.nativeEvent.layout.height)}
                        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.editorRow}>
                            {showLineNumbers && (
                                <Text
                                    style={[
                                        styles.contentInput,
                                        styles.lineNumberColumn,
                                        (isCodeFile || !isWordWrap) ? styles.monoText : null,
                                        !isWordWrap && { paddingBottom: 60 }
                                    ]}
                                    selectable={false}
                                >
                                    {lineNumbers}
                                </Text>
                            )}

                            <ScrollView
                                ref={horizontalScrollRef}
                                horizontal={!isWordWrap}
                                bounces={false}
                                contentContainerStyle={!isWordWrap ? styles.scrollContentHorizontal : { flexGrow: 1 }}
                                style={styles.horizontalScrollWrapper}
                                showsHorizontalScrollIndicator={false}
                                onContentSizeChange={(w, _h) => setContentWidth(w)}
                                onLayout={(e) => setVisibleWidth(e.nativeEvent.layout.width)}
                                onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
                                scrollEventThrottle={16}
                            >
                                <TextInput
                                    ref={inputRef}
                                    style={[
                                        styles.contentInput,
                                        (isCodeFile || !isWordWrap) ? styles.monoText : null,
                                        !isWordWrap && { minWidth: '100%', paddingBottom: 60, width: 3000 },
                                        showLineNumbers && { paddingLeft: 8 }
                                    ]}
                                    placeholder="File is empty..."
                                    placeholderTextColor={COLORS.textHint}
                                    value={content}
                                    onChangeText={handleTextChange}
                                    selection={selection}
                                    onSelectionChange={handleSelectionChange}
                                    multiline
                                    scrollEnabled={false}
                                    textAlignVertical="top"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    spellCheck={false}
                                />
                            </ScrollView>
                        </View>
                    </ScrollView>

                    {/* Custom Fast Scrollbar */}
                    {dimensions.current.maxScrollY > 0 && (
                        <Animated.View
                            style={[styles.scrollbarTrack, { bottom: 8 + bottomOffset, opacity: vScrollOpacity }]}
                            pointerEvents="box-only"
                            {...panResponder.panHandlers}
                        >
                            <View
                                style={[
                                    styles.scrollbarIndicator,
                                    {
                                        height: dimensions.current.indicatorHeight,
                                        transform: [{ translateY: indicatorTop }],
                                        backgroundColor: isDragging ? COLORS.primary : COLORS.textHint,
                                        opacity: isDragging ? 1 : 0.6
                                    }
                                ]}
                            />
                        </Animated.View>
                    )}

                    {/* Custom Horizontal Fast Scrollbar */}
                    {hDimensions.current.maxScrollX > 0 && !isWordWrap && (
                        <Animated.View
                            style={[styles.hScrollbarTrack, { bottom: bottomOffset, opacity: hScrollOpacity }]}
                            pointerEvents="box-only"
                            {...hPanResponder.panHandlers}
                        >
                            <View
                                style={[
                                    styles.hScrollbarIndicator,
                                    {
                                        width: hDimensions.current.indicatorWidth,
                                        transform: [{ translateX: indicatorLeft }],
                                        backgroundColor: isHorizontalDragging ? COLORS.primary : COLORS.textHint,
                                        opacity: isHorizontalDragging ? 1 : 0.6
                                    }
                                ]}
                            />
                        </Animated.View>
                    )}
                </Animated.View>
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
        maxWidth: 44, // Max width for tablet sizing
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
    editorContainer: {
        flex: 1,
    },
    verticalScroll: {
        flex: 1,
    },
    verticalScrollContent: {
        flexGrow: 1,
    },
    horizontalScrollWrapper: {
        flex: 1,
        minHeight: '100%',
    },
    scrollContentHorizontal: {
        flexGrow: 1,
    },
    scrollbarTrack: {
        position: 'absolute',
        right: 0,
        top: 8,
        bottom: 8,
        width: 40,
        backgroundColor: 'transparent',
    },
    scrollbarIndicator: {
        width: 6,
        borderRadius: 3,
        position: 'absolute',
        top: 0,
        right: 8,
    },
    hScrollbarTrack: {
        position: 'absolute',
        bottom: 0,
        left: 8,
        right: 8,
        height: 40,
        backgroundColor: 'transparent',
    },
    hScrollbarIndicator: {
        height: 6,
        borderRadius: 3,
        position: 'absolute',
        bottom: 8,
        left: 0,
    },
    contentInput: {
        flex: 1,
        fontSize: SIZES.medium,
        color: COLORS.text,
        fontFamily: FONTS.regular,
        lineHeight: 24,
        padding: SIZES.large,
        minHeight: '100%',
    },
    editorRow: {
        flexDirection: 'row',
        minHeight: '100%',
    },
    lineNumberColumn: {
        flex: 0,
        minWidth: 30,
        textAlign: 'right',
        color: COLORS.textHint,
        paddingLeft: SIZES.base,
        paddingRight: SIZES.small,
        backgroundColor: COLORS.surface,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
        zIndex: 10,
    },
    monoText: {
        fontFamily: FONTS.mono,
        fontSize: SIZES.font,
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

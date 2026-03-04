import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '../theme';
import { CODE_MIRROR_CSS } from './CodeMirrorCSS';
import { CODE_MIRROR_JS } from './CodeMirrorLib';

interface Props {
    initialContent: string;
    isWordWrap: boolean;
    showLineNumbers: boolean;
    isCodeFile: boolean;
    onDirty: () => void;
    onSaveRequested: (content: string) => void;
    onCopyContent: (content: string) => void;
}

export interface EditorWebViewRef {
    requestSave: () => void;
    setContent: (text: string) => void;
    undo: () => void;
    redo: () => void;
    copyAll: () => void;
    clear: () => void;
    moveCursorLeft: () => void;
    moveCursorRight: () => void;
    pasteText: (text: string) => void;
    copySelection: () => void;
    cutSelection: () => void;
}

export const EditorWebView = forwardRef<EditorWebViewRef, Props>((props, ref) => {
    const webviewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (isReady) {
            webviewRef.current?.injectJavaScript(`if (window.setWordWrap) window.setWordWrap(${props.isWordWrap}); true;`);
        }
    }, [props.isWordWrap, isReady]);

    useEffect(() => {
        if (isReady) {
            webviewRef.current?.injectJavaScript(`if (window.setShowLineNumbers) window.setShowLineNumbers(${props.showLineNumbers}); true;`);
        }
    }, [props.showLineNumbers, isReady]);

    useEffect(() => {
        if (isReady && props.initialContent !== undefined) {
            const script = `if (window.receiveInitialContent) window.receiveInitialContent(${JSON.stringify(props.initialContent)}); true;`;
            webviewRef.current?.injectJavaScript(script);
        }
    }, [isReady]);

    useImperativeHandle(ref, () => ({
        requestSave: () => {
            webviewRef.current?.injectJavaScript(`if (window.requestSave) window.requestSave(); true;`);
        },
        setContent: (text: string) => {
            webviewRef.current?.injectJavaScript(`if (window.receiveInitialContent) window.receiveInitialContent(${JSON.stringify(text)}); true;`);
        },
        undo: () => {
            webviewRef.current?.injectJavaScript(`document.execCommand('undo'); true;`);
        },
        redo: () => {
            webviewRef.current?.injectJavaScript(`document.execCommand('redo'); true;`);
        },
        copyAll: () => {
            webviewRef.current?.injectJavaScript(`if (window.requestCopyAll) window.requestCopyAll(); true;`);
        },
        clear: () => {
            webviewRef.current?.injectJavaScript(`if (window.receiveInitialContent) window.receiveInitialContent(""); if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dirty' })); true;`);
        },
        moveCursorLeft: () => {
            webviewRef.current?.injectJavaScript(`if (window.moveCursor) window.moveCursor(-1); true;`);
        },
        moveCursorRight: () => {
            webviewRef.current?.injectJavaScript(`if (window.moveCursor) window.moveCursor(1); true;`);
        },
        pasteText: (text: string) => {
            webviewRef.current?.injectJavaScript(`if (window.pasteText) window.pasteText(${JSON.stringify(text)}); true;`);
        },
        copySelection: () => {
            webviewRef.current?.injectJavaScript(`if (window.requestSelectionForCopy) window.requestSelectionForCopy(); true;`);
        },
        cutSelection: () => {
            webviewRef.current?.injectJavaScript(`if (window.requestSelectionForCut) window.requestSelectionForCut(); true;`);
        }
    }));

    const onMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'ready') {
                setIsReady(true);
            } else if (data.type === 'dirty') {
                props.onDirty();
            } else if (data.type === 'save') {
                props.onSaveRequested(data.content);
            } else if (data.type === 'copy') {
                props.onCopyContent(data.content);
            }
        } catch (e) {
            console.error("WebView message parse error", e);
        }
    };

    const initialSettings = useRef({
        isWordWrap: props.isWordWrap,
        showLineNumbers: props.showLineNumbers,
        isCodeFile: props.isCodeFile
    }).current;

    const htmlContent = useMemo(() => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
    <style>
        ${CODE_MIRROR_CSS}
    </style>
    <style>
        body, html {
            margin: 0; padding: 0; width: 100%; height: 100%;
            background-color: ${COLORS.background}; color: ${COLORS.text};
            overflow: hidden;
            overscroll-behavior-y: none;
        }
        .CodeMirror {
            width: 100%;
            height: 100%;
            font-family: ${initialSettings.isCodeFile ? 'monospace' : 'sans-serif'};
            font-size: 14px;
            background-color: ${COLORS.background};
            color: ${COLORS.text};
        }
        /* Style fixes for Dark Mode */
        .CodeMirror-gutters {
            background-color: ${COLORS.surface};
            border-right: 1px solid ${COLORS.border};
        }
        .CodeMirror-linenumber {
            color: ${COLORS.textHint};
        }
        .CodeMirror-cursor {
            border-left: 2px solid ${COLORS.primary};
        }
        /* Hide CodeMirror's default white scrollbar fillers */
        .CodeMirror-scrollbar-filler, .CodeMirror-gutter-filler {
            background-color: transparent !important;
        }
        /* Custom Scrollbars to match original native design */
        ::-webkit-scrollbar {
            width: 24px;  
            height: 24px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-corner {
            background: transparent;
        }
        /* Enable transitioning for the background color, needs to be on base thumb */
        ::-webkit-scrollbar-thumb {
            background-color: transparent; /* hide by default */
            border-radius: 12px;
            border: 6px solid transparent; /* Thinner border makes the inner thumb wider (12px width) */
            background-clip: padding-box;
            min-height: 44px;
            min-width: 44px;
            /* smooth fade when it returns to non-scrolling state */
            transition: background-color 0.3s ease; 
        }
        body.is-scrolling ::-webkit-scrollbar-thumb,
        ::-webkit-scrollbar-thumb:hover {
            background-color: ${COLORS.textHint}D9; /* ~85% opacity, makes it much more visible */
        }
        ::-webkit-scrollbar-thumb:active {
            background-color: ${COLORS.primary} !important; /* Purple when manually grabbed */
        }
    </style>
</head>
<body ontouchstart="">
    <script>
        ${CODE_MIRROR_JS}
    </script>
    <script>
        let isDirty = false;
        
        const cm = CodeMirror(document.body, {
            value: "",
            lineNumbers: ${initialSettings.showLineNumbers},
            lineWrapping: ${initialSettings.isWordWrap},
            mode: "text/plain",
            theme: "default",
            viewportMargin: 20 // Only render elements currently visible + 20 lines (virtualization)
        });

        cm.on('change', (instance, changeObj) => {
            // Ignore the initial setValue change
            if (changeObj.origin !== 'setValue' && !isDirty) {
                isDirty = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dirty' }));
            }
        });

        let scrollTimeout;
        cm.on('scroll', () => {
            document.body.classList.add('is-scrolling');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                document.body.classList.remove('is-scrolling');
            }, 800);
        });

        window.receiveInitialContent = function(content) {
            cm.setValue(content || '');
            cm.clearHistory();
            isDirty = false;
        };

        window.setWordWrap = function(wrap) {
            cm.setOption("lineWrapping", wrap);
        };

        window.setShowLineNumbers = function(show) {
            cm.setOption("lineNumbers", show);
        };

        window.requestSave = function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'save', content: cm.getValue() }));
            isDirty = false;
        };

        window.requestCopyAll = function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'copy', content: cm.getValue() }));
        };

        window.requestSelectionForCopy = function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'copy', content: cm.getSelection() }));
        };

        window.requestSelectionForCut = function() {
            const sel = cm.getSelection();
            if (sel) {
                cm.replaceSelection("");
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'copy', content: sel }));
                isDirty = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dirty' }));
            }
        };

        window.pasteText = function(text) {
            cm.replaceSelection(text);
            isDirty = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dirty' }));
        };

        window.moveCursor = function(direction) {
            const cursor = cm.getCursor();
            cm.setCursor({ line: cursor.line, ch: cursor.ch + direction });
            cm.focus();
        };

        setTimeout(() => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }, 50);
    </script>
</body>
</html>
  `, [initialSettings]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webviewRef}
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                onMessage={onMessage}
                bounces={false}
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                keyboardDisplayRequiresUserAction={false}
                hideKeyboardAccessoryView={true}
            />
            {!isReady && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

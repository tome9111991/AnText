import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Define the shape of our settings
export interface AppSettings {
    defaultWordWrap: boolean;
    defaultShowLineNumbers: boolean;
}

// Default values
const defaultSettings: AppSettings = {
    defaultWordWrap: true,
    defaultShowLineNumbers: false,
};

// Create the context
export const SettingsContext = createContext<{
    settings: AppSettings;
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
    isLoading: boolean;
}>({
    settings: defaultSettings,
    updateSetting: async () => { },
    isLoading: true,
});

const SETTINGS_KEY = '@app_settings';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
                if (storedSettings) {
                    setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) });
                }
            } catch (error) {
                console.error('Failed to load settings', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        try {
            const newSettings = { ...settings, [key]: value };
            setSettings(newSettings);
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        } catch (error) {
            console.error('Failed to save setting', error);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);

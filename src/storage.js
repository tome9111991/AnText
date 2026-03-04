import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

let PendingFile = null;

export const setPendingFile = (fileData) => {
    PendingFile = fileData;
};

export const getPendingFile = () => {
    const file = PendingFile;
    PendingFile = null;
    return file;
};

export const loadFileContentStr = async (uri) => {
    try {
        if (!uri || uri === 'new') return '';
        // Do NOT decodeURIComponent here, it destroys important path encoded segments from Android DocumentPicker
        try {
            return await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
        } catch (fsError) {
            console.warn("FileSystem read failed, trying fetch...", fsError);
            const response = await fetch(uri);
            return await response.text();
        }
    } catch (error) {
        console.error('Error in loadFileContentStr:', error);
        throw error;
    }
};

export const pickFileAndRead = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: false, // Prevents creating duplicate cache files for huge files
        });

        if (result.canceled) {
            return null;
        }

        const file = result.assets[0];

        const fileData = {
            uri: file.uri,
            name: file.name,
            mimeType: file.mimeType,
        };
        setPendingFile(fileData);

        return fileData;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
};

export const readFileFromUri = async (uri) => {
    try {
        let name = 'Opened File';
        try {
            const decoded = decodeURIComponent(uri);
            const parts = decoded.split('/');
            const lastPart = parts[parts.length - 1];
            if (lastPart) name = lastPart;
        } catch (e) { }

        const fileData = {
            uri: uri,
            name: name,
            mimeType: 'text/plain',
        };
        setPendingFile(fileData);

        return fileData;
    } catch (error) {
        console.error('Error reading file from uri:', error);
        throw error;
    }
};


export const saveFileContent = async (uri, content, mimeType = 'text/plain') => {
    try {
        // 1. Storage Access Framework (SAF) is usually required on Android 11+ to overwrite user files outside app dir.
        // It requires getting a permission first if we haven't got it.
        // getDocumentAsync already gives us temporary read access, but direct write back to the original URI 
        // often fails with EACCES unless using SAF properly.

        // Try a direct overwrite first (works on older Android or if we have full access)
        try {
            await FileSystem.writeAsStringAsync(uri, content, {
                encoding: 'utf8',
            });
            return true;
        } catch (directWriteError) {
            console.log('Direct write failed, falling back to SAF:', directWriteError);

            // 2. Fallback to SAF: We need to ask the user where to save the edited file.
            // We read the directory URI, ask permission, and write it.
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

            if (!permissions.granted) {
                throw new Error('Permission denied to save file.');
            }

            // Create a new file in the selected directory
            const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                'edited_file.txt',
                mimeType
            );

            await FileSystem.writeAsStringAsync(newFileUri, content, {
                encoding: 'utf8',
            });

            return newFileUri; // Return the new URI if saved elsewhere
        }

    } catch (error) {
        console.error('Error saving file:', error);
        throw error;
    }
};

export const saveNewFileContent = async (content, fileName = 'Untitled.txt', mimeType = 'text/plain') => {
    try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
            throw new Error('Permission denied to save file.');
        }

        const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            mimeType
        );

        await FileSystem.writeAsStringAsync(newFileUri, content, {
            encoding: 'utf8',
        });

        return newFileUri;
    } catch (error) {
        console.error('Error saving new file:', error);
        throw error;
    }
};


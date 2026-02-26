import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export const pickFileAndRead = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*', // Look for any files (like code files)
            copyToCacheDirectory: false,
        });

        if (result.canceled) {
            return null;
        }

        const file = result.assets[0];

        // Read the file content using fetch which natively supports content:// URIs on Android
        const response = await fetch(file.uri);
        const content = await response.text();

        return {
            uri: file.uri,
            name: file.name,
            content: content,
            mimeType: file.mimeType,
        };
    } catch (error) {
        console.error('Error reading file:', error);
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

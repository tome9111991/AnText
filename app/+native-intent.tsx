export async function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
    // Intercept Android content provider paths or deep links that are actually intent files.
    // This prevents Expo Router from throwing an "Unmatched Route" error.
    if (
        path.includes('fileprovider') ||
        path.includes('.filemanager') ||
        path.startsWith('content://') ||
        path.includes('root/storage')
    ) {
        // Redirect to the home page where our Linking listener in index.tsx will process the original intent URL
        return '/';
    }

    return path;
}

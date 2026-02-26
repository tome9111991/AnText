# AnText 📝

AnText is a minimalist, distraction-free text editor for mobile devices and the web, built with **React Native** and **Expo**. The project's goal is to provide a clean and focused environment for reading and editing text files directly on your device.

## ✨ Features

- **Distraction-Free Design:** A minimalist UI that keeps the focus on the text.
- **File Management:** Open and edit any text or code files from local storage.
- **Secure Saving:** Support for the Android Storage Access Framework (SAF) to securely write files back.
- **Dark & Light Mode:** Full support for system-wide color schemes.
- **Cross-Platform:** Runs on Android, iOS, and the web.

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone (or download) this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

You can then open the app via the **Expo Go** app on your smartphone (by scanning the QR code) or in an emulator/simulator.

## 🛠 Tech Stack

- **Framework:** [Expo](https://expo.dev/) / React Native
- **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based Routing)
- **Language:** TypeScript / JavaScript
- **Animations:** React Native Reanimated
- **Icons:** Expo Vector Icons (Ionicons)

## 📁 Project Structure

- `/app`: Contains the screens (Home, Editor) and the root layout.
- `/components`: Reusable UI elements such as the editor menu.
- `/src`: Core logic for file access (`storage.js`) and the theme system.
- `/hooks`: Custom hooks for color schemes.

## 📝 License

This project is licensed under the [MIT License](LICENSE.md).

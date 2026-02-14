# How to Run Diem

This guide outlines the steps to run the Diem application.

## Prerequisites

- **Node.js**: Ensure you have Node.js installed on your machine.
- **Expo Go App**: If running on a physical device, install the Expo Go app from the App Store or Google Play.
- **Simulator/Emulator**: If running on your computer, ensure you have Xcode (for iOS Simulator, run on macOS) or Android Studio (for Android Emulator) installed and configured.

## Running the Application

1. **Navigate to the project directory**:
   Open your terminal and navigate to the `Diem` folder:
   ```bash
   cd Diem
   ```

2. **Start the Development Server**:
   Run the following command to start the Expo development server:
   ```bash
   npx expo start
   ```

3. **Launch the App**:
   Once the server is running, you will see a QR code and a menu in the terminal.
   - **On a Physical Device**: Scan the QR code using the camera app (iOS) or the Expo Go app (Android).
   - **On iOS Simulator**: Press `i` in the terminal.
   - **On Android Emulator**: Press `a` in the terminal.

## Troubleshooting

### Missing Scripts
The `package.json` file currently lacks standard scripts like `start`, `android`, or `ios`. Using `npx expo start` directly (as shown above) bypasses this issue.

### Missing Dependencies in package.json
The `package.json` file appears to be missing entries for core dependencies (`expo`, `react`, `react-native`), although they seem to be present in the `node_modules` folder.

To fix your `package.json` for the future, it is recommended to run:
```bash
npx expo install expo react react-native expo-status-bar
```
This will add the missing dependencies to your `package.json` file without breaking the current installation.

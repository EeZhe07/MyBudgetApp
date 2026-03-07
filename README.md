# MyBudgetApp

MyBudgetApp is a comprehensive, feature-rich personal finance tracker built with **React Native (Expo)** and **Supabase**. It helps users easily manage their transactions, track their assets and savings goals, and visualize their spending habits, complete with secure authentication and robust offline synchronization capabilities.

## ✨ Features

*   **Expense & Income Tracking**: Quickly record your daily transactions with customizable categories and notes.
*   **Asset Management**: Keep track of various accounts (Cash, Bank, Credit Cards) and monitor their balances dynamically.
*   **Savings Goals**: Set up financial goals with target amounts, deadlines, and visual progress tracking.
*   **Detailed Statistics**: View comprehensive statistics and charts breaking down your spending by category over weekly, monthly, or yearly periods.
*   **Budgeting**: Set monthly budgets and track your remaining amount smoothly to ensure you never overspend.
*   **Offline-First & Sync**: Powered by a robust sync engine, you can add transactions while entirely offline—the app will automatically sync with Supabase once your connection returns.
*   **Secure Authentication**: User sign-in, sign-up, and secure data isolation utilizing Supabase Auth and PostgreSQL Row Level Security (RLS).
*   **Home Screen Widgets (Android/iOS)**: View your budget overview or quickly add a transaction directly from your device's home screen.
*   **Deep Linking**: Support for quick actions and deep links directly into the app.

## 🛠️ Tech Stack

*   **Frontend**: React Native, Expo, React Native Chart Kit
*   **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth)
*   **Local Storage**: AsyncStorage (for offline-first capability)
*   **UI/UX**: Custom components, React Native SVG, Expo Linear Gradient

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   [Expo CLI](https://docs.expo.dev/get-started/installation/)
*   A Supabase project

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/EeZhe07/MyBudgetApp.git
    cd MyBudgetApp
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Setup Supabase Database:**
    *   Navigate to your Supabase project dashboard.
    *   Go to the SQL Editor and run the contents of `supabase_schema.sql` (and optionally `supabase_schema_v2.sql` if applicable) to create the necessary tables, policies, and triggers.

4.  **Configure Environment Variables:**
    *   Create a `.env` file in the root directory (or update `/lib/supabase.js` directly for testing).
    *   Add your Supabase URL and Anon Key.

5.  **Run the app locally:**
    ```bash
    npx expo start
    ```
    *   Press `a` to run on an Android emulator/device.
    *   Press `i` to run on an iOS simulator.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is open-source and available under the terms of the MIT License.

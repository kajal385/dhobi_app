import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StatusBar, useColorScheme, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import store from './src/store';
import RootNavigator from './src/navigation/RootNavigator';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Unhandled application error:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.icon}>⚠️</Text>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={errorStyles.button} onPress={this.handleRestart}>
            <Text style={errorStyles.buttonText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FE',
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1C2E', marginBottom: 8 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: '#321D8C',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});

const queryClient = new QueryClient();

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <QueryClientProvider client={queryClient}>
            <PaperProvider>
              <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
              <ErrorBoundary>
                <RootNavigator />
              </ErrorBoundary>
              <Toast />
            </PaperProvider>
          </QueryClientProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

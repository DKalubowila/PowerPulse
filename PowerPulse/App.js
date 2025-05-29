import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert } from 'react-native';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import HomeScreen from './HomeScreen';
import HistoryScreen from './HistoryScreen';
import ReportScreen from './ReportScreen';
import ProfileScreen from './ProfileScreen';
import AdminDashboardScreen from './AdminDashboardScreen';
import AdminAlertsScreen from './AdminAlertsScreen';
import AdminMessagesScreen from './AdminMessagesScreen';
import AdminProfileScreen from './AdminProfileScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Feather from 'react-native-vector-icons/Feather';
import ErrorUtils from './ErrorUtils';

function SplashScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('./assets/Logo.png')} style={styles.logo} />
      </View>
      <Text style={styles.title}>PowerPulse</Text>
      <Text style={styles.subtitle}>Detect When The Power Goes Down</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
      <StatusBar style="light" />
    </View>
  );
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

function MainTabs({ route }) {
  const { userId, userEmail } = route.params || {};
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 64,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderColor: '#e3e6eb',
          shadowColor: '#2563eb',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#7A7F85',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        initialParams={{ userId, userEmail }}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        initialParams={{ userId, userEmail }}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="file-text" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        initialParams={{ userId, userEmail }}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="alert-triangle" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ userId, userEmail }}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 64,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderColor: '#e3e6eb',
          shadowColor: '#2563eb',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#7A7F85',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <AdminTab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="AdminAlerts"
        component={AdminAlertsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => (
            <Feather name="alert-triangle" size={22} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="AdminMessages"
        component={AdminMessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color }) => (
            <Feather name="mail" size={22} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </AdminTab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    // Add error handler for uncaught errors
    const errorHandler = (error) => {
      console.error('Uncaught error:', error);
      Alert.alert(
        'Error',
        'An error occurred. Please check the console for details.'
      );
    };

    // Add error handler for promise rejections
    const rejectionHandler = (error) => {
      console.error('Unhandled promise rejection:', error);
      Alert.alert(
        'Error',
        'A network or data error occurred. Please check your connection.'
      );
    };

    // Add the error handlers
    ErrorUtils.setGlobalHandler(errorHandler);
    // Use ErrorUtils for promise rejections instead of window.addEventListener
    ErrorUtils.reportError = rejectionHandler;

    // Cleanup
    return () => {
      // No need to remove event listener since we're using ErrorUtils
    };
  }, []);

  return (
    <NavigationContainer
      onStateChange={(state) => {
        console.log('Navigation state changed:', state);
      }}
    >
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#fff' }
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1877f2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 32,
    marginTop: -80,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#e3e9f1',
    marginBottom: 60,
    textAlign: 'center',
  },
  button: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#1877f2',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

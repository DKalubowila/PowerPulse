import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { db, rtdb } from './firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { ref, onValue, off } from 'firebase/database';

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userEmail } = route.params || {};
  const currentRoute = route.name || 'Home';

  // User data state
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUser = async () => {
    setLoadingUser(true);
    try {
      console.log('Fetching user with params:', { userId, userEmail });
      let userDoc = null;
      
      if (userId) {
        console.log('Fetching by userId:', userId);
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          userDoc = { id: docSnap.id, ...docSnap.data() };
          console.log('User found by ID:', userDoc);
        }
      } else if (userEmail) {
        console.log('Fetching by email:', userEmail);
        const q = query(collection(db, 'users'), where('email', '==', userEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          userDoc = { id: doc.id, ...doc.data() };
          console.log('User found by email:', userDoc);
        }
      }
      
      if (userDoc) {
        setUser(userDoc);
      } else {
        console.log('No user found');
      }
    } catch (e) {
      console.error('Error fetching user:', e);
      setUser(null);
    }
    setLoadingUser(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUser();
    setRefreshing(false);
  }, [userId, userEmail]);

  useEffect(() => {
    fetchUser();
  }, [userId, userEmail]);

  // Mock sensor data replaced by real-time data
  const [sensor, setSensor] = useState({
    status: '-',
    temperature: '-',
    humidity: '-',
    rain: '-',
  });

  const lastStatusRef = React.useRef(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const disconnectHandledRef = React.useRef(false);
  const lastNotificationTimeRef = React.useRef(0);
  const NOTIFICATION_COOLDOWN = 30000; // 30 seconds cooldown between notifications

  useEffect(() => {
    const sensorRef = ref(rtdb, 'sensorData');
    const handleValue = async (snapshot) => {
      const data = snapshot.val();
      const statusVal = data && typeof data.Status !== 'undefined' ? data.Status : null;
      const currentTime = Date.now();
      
      setSensor({
        status: statusVal === 1 ? 'On' : statusVal === 0 ? 'Off' : '-',
        temperature: data && typeof data.Temp !== 'undefined' ? data.Temp : '-',
        humidity: data && typeof data.Hum !== 'undefined' ? data.Hum : '-',
        rain: data && typeof data.Rain !== 'undefined' ? (data.Rain === 1 ? 'Yes' : 'No') : '-',
      });

      // Only trigger notification if:
      // 1. Status changed from 1 to 0
      // 2. Not already handled
      // 3. Enough time has passed since last notification
      if (lastStatusRef.current === 1 && 
          statusVal === 0 && 
          !disconnectHandledRef.current && 
          (currentTime - lastNotificationTimeRef.current) > NOTIFICATION_COOLDOWN) {
        
        setShowDisconnectModal(true);
        disconnectHandledRef.current = true;
        lastNotificationTimeRef.current = currentTime;

        try {
          await addDoc(collection(db, 'history'), {
            status: 'Off',
            temperature: data && typeof data.Temp !== 'undefined' ? data.Temp : '-',
            humidity: data && typeof data.Hum !== 'undefined' ? data.Hum : '-',
            rain: data && typeof data.Rain !== 'undefined' ? (data.Rain === 1 ? 'Yes' : 'No') : '-',
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.error('Error adding to history:', e);
        }
      }

      // Reset disconnect handled flag when power comes back on
      if (statusVal === 1) {
        disconnectHandledRef.current = false;
      }
      
      lastStatusRef.current = statusVal;
    };
    onValue(sensorRef, handleValue);
    return () => off(sensorRef, 'value', handleValue);
  }, []);

  const isActive = (screen) => currentRoute === screen;

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={{paddingBottom:16}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        <Text style={styles.header}>My Power Line</Text>
        <View style={styles.userCardLarge}>
          {loadingUser ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : user ? (
            <>
              <Text style={styles.userAddressLarge}>
                <Feather name="map-pin" size={22} color="#2563eb" /> {user.addressLine}, {user.city}, {user.postalCode}
              </Text>
              <Text style={styles.userDeviceIdLarge}>
                <Feather name="cpu" size={22} color="#2563eb" /> Device ID: {user.deviceId}
              </Text>
            </>
          ) : (
            <Text style={styles.userAddressLarge}>No user data found.</Text>
          )}
        </View>
        <View style={styles.sensorGrid}>
          <View style={styles.sensorSquare}>
            <Feather name="power" size={32} color={sensor.status === 'On' ? '#22c55e' : '#ef4444'} />
            <Text style={styles.sensorSquareLabel}>Device Status</Text>
            <Text style={[styles.sensorSquareValue, {color: sensor.status === 'On' ? '#22c55e' : '#ef4444'}]}>{sensor.status}</Text>
          </View>
          <View style={styles.sensorSquare}>
            <Feather name="thermometer" size={32} color="#2563eb" />
            <Text style={styles.sensorSquareLabel}>Temperature</Text>
            <Text style={styles.sensorSquareValue}>{sensor.temperature}°C</Text>
          </View>
          <View style={styles.sensorSquare}>
            <Feather name="droplet" size={32} color="#2563eb" />
            <Text style={styles.sensorSquareLabel}>Humidity</Text>
            <Text style={styles.sensorSquareValue}>{sensor.humidity}%</Text>
          </View>
          <View style={styles.sensorSquare}>
            <Feather name="cloud-rain" size={32} color="#2563eb" />
            <Text style={styles.sensorSquareLabel}>Rain</Text>
            <Text style={styles.sensorSquareValue}>{sensor.rain}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.reportButtonCompact} onPress={() => navigation.navigate('Report', { userId, userEmail })}>
          <Text style={styles.reportButtonText}>Report a Problem</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Custom Modal for Power Disconnected Notification */}
      <Modal
        visible={showDisconnectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisconnectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Power Disconnected</Text>
            <Text style={styles.modalText}>
              Your power supply has been disconnected. Please check your connection and try again.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDisconnectModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafb' },
  header: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginTop: 24, marginBottom: 16 },
  userCardLarge: { backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 12, padding: 28, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, alignItems: 'center' },
  userAddressLarge: { fontSize: 18, color: '#222', marginBottom: 10, textAlign: 'center', fontWeight: 'bold' },
  userDeviceIdLarge: { fontSize: 16, color: '#2563eb', marginBottom: 2, textAlign: 'center', fontWeight: '600' },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginHorizontal: 12, marginBottom: 18 },
  sensorSquare: { backgroundColor: '#fff', borderRadius: 16, width: '47%', aspectRatio: 1, marginBottom: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, padding: 10 },
  sensorSquareLabel: { fontSize: 15, color: '#7A7F85', marginTop: 8, marginBottom: 2, textAlign: 'center' },
  sensorSquareValue: { fontSize: 20, fontWeight: 'bold', marginTop: 2, textAlign: 'center' },
  reportButtonCompact: { backgroundColor: '#2563eb', borderRadius: 8, marginHorizontal: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 0, marginTop: 8 },
  reportButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 260,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#222',
    textAlign: 'center',
    marginBottom: 18,
  },
  modalButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
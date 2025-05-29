import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl, Modal, Linking } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { db } from './firebaseConfig';
import { collection, getDocs, query, orderBy, doc, onSnapshot, getDoc, addDoc, collection as fbCollection, deleteDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import { getDatabase, ref, onValue, get } from 'firebase/database';
import TransformerAlert from './components/TransformerAlert';

const WEATHER_API_KEY = '31b137b44f19ce65f82487da24af3131';

const alerts = [
  {
    id: 1,
    type: 'Transformer',
    title: 'High Voltage Alert',
    desc: 'Transformer T-103 voltage spike detected',
    time: '2 min ago',
    icon: 'alert-triangle',
    color: '#ef4444',
  },
  {
    id: 2,
    type: 'Power',
    title: 'Power Disconnected',
    desc: 'Section 2 lost power',
    time: '5 min ago',
    icon: 'zap-off',
    color: '#fbbf24',
  },
];

const messages = [
  {
    id: 1,
    name: 'John Smith',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    message: 'New maintenance report submitted',
    time: '10:23 AM',
  },
  {
    id: 2,
    name: 'Sarah Wilson',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    message: 'Updated system status report',
    time: '09:45 AM',
  },
];

export default function AdminDashboardScreen({ navigation }) {
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [city, setCity] = useState('');
  const [messages, setMessages] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPowerFailureModal, setShowPowerFailureModal] = useState(false);
  const [powerFailureDetails, setPowerFailureDetails] = useState({ id: '', location: '' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLocationAndWeather();
    fetchMessagesAndAlerts();
    // Real-time listener for sensorData/Status in Realtime DB
    const dbRT = getDatabase();
    const statusRef = ref(dbRT, 'sensorData/Status');
    const unsubscribe = onValue(statusRef, async (snapshot) => {
      const value = snapshot.val();
      console.log('Realtime DB Status:', value);
      if (value === 0) {
        // Fetch all sensor data
        const idSnap = await get(ref(dbRT, 'sensorData/ID'));
        const locationSnap = await get(ref(dbRT, 'sensorData/Location'));
        const temperatureSnap = await get(ref(dbRT, 'sensorData/Temperature'));
        const humiditySnap = await get(ref(dbRT, 'sensorData/Humidity'));
        const rainSnap = await get(ref(dbRT, 'sensorData/Rain'));
        
        const id = idSnap.exists() ? idSnap.val() : '';
        const location = locationSnap.exists() ? locationSnap.val() : '';
        const temperature = temperatureSnap.exists() ? temperatureSnap.val() : '';
        const humidity = humiditySnap.exists() ? humiditySnap.val() : '';
        const rain = rainSnap.exists() ? rainSnap.val() : '';
        
        // Determine if it's a domestic or public alert based on location and ID
        const locationLower = location.toLowerCase();
        const idLower = id.toLowerCase();
        
        let isDomestic = false;
        let isPublic = false;
        let categorizationReason = '';
        
        // First check if ID is H22 (case insensitive)
        if (idLower === 'h22') {
          isDomestic = true;
          categorizationReason = 'ID is H22';
        } else {
          // Check for domestic indicators
          const domesticIndicators = [
            'domestic', 'home', 'house', 'residential', 'apartment', 'flat',
            'villa', 'bungalow', 'cottage', 'private'
          ];
          
          // Check for public indicators
          const publicIndicators = [
            'public', 'commercial', 'office', 'shop', 'store', 'mall',
            'hospital', 'school', 'college', 'university', 'government',
            'street', 'road', 'highway', 'park', 'market'
          ];
          
          // Check location for indicators
          for (const indicator of domesticIndicators) {
            if (locationLower.includes(indicator)) {
              isDomestic = true;
              categorizationReason = `Location contains domestic indicator: ${indicator}`;
              break;
            }
          }
          
          if (!isDomestic) {
            for (const indicator of publicIndicators) {
              if (locationLower.includes(indicator)) {
                isPublic = true;
                categorizationReason = `Location contains public indicator: ${indicator}`;
                break;
              }
            }
          }
          
          // If location doesn't give clear indication, check ID
          if (!isDomestic && !isPublic) {
            for (const indicator of domesticIndicators) {
              if (idLower.includes(indicator)) {
                isDomestic = true;
                categorizationReason = `ID contains domestic indicator: ${indicator}`;
                break;
              }
            }
            
            if (!isDomestic) {
              for (const indicator of publicIndicators) {
                if (idLower.includes(indicator)) {
                  isPublic = true;
                  categorizationReason = `ID contains public indicator: ${indicator}`;
                  break;
                }
              }
            }
          }
        }
        
        // Default to public if no clear indication
        const alertType = isDomestic ? 'Domestic' : 'Public';
        const alertTitle = isDomestic ? 'Domestic Power Failure' : 'Public Power Failure';
        
        setPowerFailureDetails({ id, location });
        setShowPowerFailureModal(true);
        
        // Enhanced logging
        console.log('Alert Categorization:', {
          id,
          location,
          type: alertType,
          reason: categorizationReason || 'No specific indicators found, defaulting to Public',
          isDomestic,
          isPublic
        });
        
        // Save notification to Firestore with sensor data and type
        await addDoc(fbCollection(db, 'notifications'), {
          title: alertTitle,
          id,
          location,
          type: alertType,
          timestamp: new Date(),
          sensorData: {
            temperature,
            humidity,
            rain
          },
          categorizationReason // Adding the reason to the stored data
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchLocationAndWeather = async () => {
    setLocationLoading(true);
    setWeatherLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permission to show weather.');
        setWeather(null);
        setLocationLoading(false);
        setWeatherLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      // Reverse geocode to get city name
      const [address] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setCity(address.city || 'Current Location');
      // Fetch weather for current location
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&appid=${WEATHER_API_KEY}&units=metric`);
      const data = await res.json();
      console.log('Weather API response:', data);
      if (data.cod !== 200) {
        Alert.alert('Weather Error', data.message || 'Failed to fetch weather');
        setWeather(null);
        return;
      }
      setWeather(data);
    } catch (e) {
      setWeather(null);
      setCity('Current Location');
    } finally {
      setLocationLoading(false);
      setWeatherLoading(false);
    }
  };

  const fetchMessagesAndAlerts = async () => {
    setLoading(true);
    try {
      // Latest messages (reports)
      const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const reportsSnap = await getDocs(qReports);
      const reports = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Show all messages without filtering by resolved status
      setMessages(reports.slice(0, 2));

      // Latest alerts from notifications collection
      const qAlerts = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'));
      const alertsSnap = await getDocs(qAlerts);
      const alertsList = alertsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Power Failure Alert',
          type: data.type || (data.id?.toLowerCase() === 'h22' ? 'Domestic' : 'Public'),
          time: data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : '',
          color: '#ef4444'
        };
      });
      setAlerts(alertsList.slice(0, 3)); // Show 3 most recent alerts
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
      setMessages([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchLocationAndWeather(),
      fetchMessagesAndAlerts()
    ]);
    setRefreshing(false);
  };

  const openGoogleMaps = (location) => {
    const encodedLocation = encodeURIComponent(location);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
    Linking.openURL(url).catch(err => console.error('Error opening Google Maps:', err));
  };

  const deleteMessage = async (messageId) => {
    try {
      await deleteDoc(doc(db, 'reports', messageId));
      console.log('Message deleted successfully');
      fetchMessagesAndAlerts(); // Refresh the messages list
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        <Text style={styles.header}>Dashboard</Text>
        <Text style={styles.subheader}>Welcome back, Admin</Text>

        {/* Weather Section */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherHeader}>
            <Text style={styles.weatherTitle}>Weather Conditions</Text>
            <Feather name="cloud" size={20} color="#2563eb" />
          </View>
          {locationLoading || weatherLoading ? (
            <ActivityIndicator color="#2563eb" />
          ) : weather ? (
            <View>
              <Text style={styles.weatherCity}>{city}</Text>
              <View style={styles.weatherMainRow}>
                <Text style={styles.weatherTemp}>
                  {weather && weather.main ? Math.round(weather.main.temp) + '°' : '--'}
                </Text>
                <Text style={styles.weatherDesc}>
                  {weather && weather.weather && weather.weather[0]
                    ? `${weather.weather[0].main} (${weather.weather[0].description})`
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.weatherStatsRow}>
                <View style={styles.weatherStat}><Feather name="droplet" size={16} color="#2563eb" /><Text style={styles.weatherStatText}>Humidity{"\n"}<Text style={styles.weatherStatValue}>{weather && weather.main ? weather.main.humidity + '%' : '--'}</Text></Text></View>
                <View style={styles.weatherStat}><Feather name="wind" size={16} color="#2563eb" /><Text style={styles.weatherStatText}>Wind{"\n"}<Text style={styles.weatherStatValue}>{weather && weather.wind ? weather.wind.speed + ' km/h' : '--'}</Text></Text></View>
                <View style={styles.weatherStat}><Feather name="cloud-rain" size={16} color="#2563eb" /><Text style={styles.weatherStatText}>Rain{"\n"}<Text style={styles.weatherStatValue}>{weather && weather.rain ? weather.rain["1h"] + '%' : '0%'}</Text></Text></View>
                <View style={styles.weatherStat}><Feather name="eye" size={16} color="#2563eb" /><Text style={styles.weatherStatText}>Visibility{"\n"}<Text style={styles.weatherStatValue}>{weather && weather.visibility ? (weather.visibility / 1000) + ' km' : '--'}</Text></Text></View>
              </View>
            </View>
          ) : (
            <Text style={{ color: '#bbb', marginTop: 8 }}>Weather data unavailable.</Text>
          )}
        </View>

        {/* Latest Alerts */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Latest Alerts</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminAlerts')}><Text style={styles.sectionLink}>View All</Text></TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator color="#2563eb" /> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertsRow}>
            {alerts.length === 0 ? (
              <Text style={{ color: '#bbb', marginLeft: 18 }}>No alerts.</Text>
            ) : alerts.map((alert, index) => (
              <View key={`${alert.id}-${index}`} style={[styles.alertCard, { borderLeftColor: alert.color }]}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertDesc}>ID: {alert.id}</Text>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Latest Messages */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Latest Messages</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminMessages')}><Text style={styles.sectionLink}>See all</Text></TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator color="#2563eb" /> : (
          <View style={styles.messagesList}>
            {messages.length === 0 ? <Text style={{ color: '#bbb', marginLeft: 18 }}>No messages.</Text> : messages.map(msg => (
              <View key={msg.id} style={styles.messageCard}>
                <Image source={msg.images && msg.images[0] ? { uri: msg.images[0] } : require('./assets/Logo.png')} style={styles.avatar} />
                <View style={styles.messageContent}>
                  <Text style={styles.userName}>{msg.name || msg.fullName || msg.userEmail}</Text>
                  <Text style={styles.messageText}>{msg.nature || 'No Nature'}: {msg.description || msg.desc || 'No Description'}</Text>
                </View>
                <Text style={styles.messageTime}>
                  {msg.time || (msg.createdAt ? 
                    (typeof msg.createdAt === 'object' && msg.createdAt.seconds ? 
                      new Date(msg.createdAt.seconds * 1000).toLocaleString() : 
                      new Date(msg.createdAt).toLocaleString()
                    ) : '')
                  }
                </Text>
                <TouchableOpacity onPress={() => deleteMessage(msg.id)} style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Power Failure Modal */}
        {showPowerFailureModal && (
          <Modal
            transparent
            visible={showPowerFailureModal}
            animationType="fade"
            onRequestClose={() => setShowPowerFailureModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Power Failure Alert</Text>
                <Text style={styles.modalText}>ID: {powerFailureDetails.id}</Text>
                <TouchableOpacity onPress={() => openGoogleMaps(powerFailureDetails.location)}>
                  <Text style={styles.modalText}>Location: {powerFailureDetails.location}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowPowerFailureModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
      <TransformerAlert />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  scrollContent: { 
    paddingBottom: 100 
  },
  header: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#1e293b', 
    marginTop: 32, 
    marginBottom: 8,
    marginHorizontal: 20,
    letterSpacing: -0.5
  },
  subheader: { 
    fontSize: 16, 
    color: '#64748b', 
    marginHorizontal: 20,
    marginBottom: 24,
    letterSpacing: -0.3
  },
  sectionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginHorizontal: 20, 
    marginTop: 24, 
    marginBottom: 12 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1e293b',
    letterSpacing: -0.3
  },
  sectionLink: { 
    color: '#2563eb', 
    fontWeight: '600', 
    fontSize: 15 
  },
  alertsRow: { 
    paddingLeft: 20,
    marginBottom: 12 
  },
  alertCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginRight: 16, 
    width: 280,
    borderLeftWidth: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, 
    shadowRadius: 15, 
    elevation: 3 
  },
  alertTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#1e293b', 
    marginBottom: 6,
    letterSpacing: -0.3
  },
  alertDesc: { 
    fontSize: 15,
    color: '#64748b', 
    marginBottom: 8,
    letterSpacing: -0.2
  },
  alertTime: { 
    color: '#94a3b8', 
    fontSize: 13,
    letterSpacing: -0.2
  },
  weatherCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    marginHorizontal: 20, 
    marginTop: 24, 
    padding: 24, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, 
    shadowRadius: 15, 
    elevation: 3 
  },
  weatherHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  weatherTitle: { 
    fontWeight: '700', 
    color: '#1e293b', 
    fontSize: 20, 
    flex: 1,
    letterSpacing: -0.3
  },
  weatherMainRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    marginBottom: 12 
  },
  weatherTemp: { 
    fontSize: 48, 
    fontWeight: '700', 
    color: '#2563eb', 
    marginRight: 12,
    letterSpacing: -1
  },
  weatherDesc: { 
    fontSize: 17, 
    color: '#64748b', 
    marginBottom: 6,
    letterSpacing: -0.3
  },
  weatherStatsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16
  },
  weatherStat: { 
    alignItems: 'center', 
    flex: 1 
  },
  weatherStatText: { 
    color: '#64748b', 
    fontSize: 13, 
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: -0.2
  },
  weatherStatValue: { 
    color: '#1e293b', 
    fontWeight: '600', 
    fontSize: 15,
    marginTop: 2,
    letterSpacing: -0.3
  },
  weatherCity: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1e293b', 
    marginBottom: 12,
    letterSpacing: -0.3
  },
  messagesList: { 
    marginHorizontal: 20, 
    marginTop: 12 
  },
  messageCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, 
    shadowRadius: 15, 
    elevation: 3 
  },
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    marginRight: 16 
  },
  messageContent: { 
    flex: 1 
  },
  userName: { 
    fontWeight: '700', 
    color: '#1e293b', 
    fontSize: 16,
    marginBottom: 4,
    letterSpacing: -0.3
  },
  messageText: { 
    color: '#64748b', 
    fontSize: 14,
    letterSpacing: -0.2
  },
  messageTime: { 
    color: '#94a3b8', 
    fontSize: 13, 
    marginLeft: 12,
    letterSpacing: -0.2
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.4)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    zIndex: 100 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 28, 
    width: '85%', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, 
    shadowRadius: 20, 
    elevation: 5 
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#ef4444', 
    marginBottom: 16,
    letterSpacing: -0.5
  },
  modalText: { 
    color: '#64748b', 
    marginBottom: 8,
    fontSize: 15,
    letterSpacing: -0.2
  },
  closeButton: { 
    backgroundColor: '#2563eb', 
    borderRadius: 14, 
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center', 
    marginTop: 24,
    width: '100%'
  },
  closeButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16,
    letterSpacing: -0.3
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  }
}); 
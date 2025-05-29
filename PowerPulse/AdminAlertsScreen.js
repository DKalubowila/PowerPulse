import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { db } from './firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const FILTERS = ['All', 'Domestic', 'Public'];

export default function AdminAlertsScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(0);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const alertsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Keep original type for filtering
        const originalType = data.type;
        // Convert Transformer type to Public for display
        const type = data.type === 'Transformer' ? 'Public' : data.type;
        return {
          id: doc.id,
          ...data,
          type,
          originalType,
          time: data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : ''
        };
      });
      console.log('Fetched alerts:', alertsData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  const getFilteredAlerts = () => {
    if (selectedFilter === 0) return alerts; // All
    const filterType = FILTERS[selectedFilter];
    console.log('Filtering for type:', filterType);
    console.log('Available alerts:', alerts.map(a => ({ type: a.type, originalType: a.originalType })));
    return alerts.filter(alert => alert.type === filterType);
  };

  const getAlertIcon = (type, originalType) => {
    // Use zap icon for transformer alerts even though they're under Public
    if (originalType === 'Transformer') return 'zap';
    
    switch (type) {
      case 'Domestic':
        return 'home';
      case 'Public':
        return 'users';
      default:
        return 'alert-triangle';
    }
  };

  const getAlertColor = (type, originalType) => {
    // Use transformer color for transformer alerts even though they're under Public
    if (originalType === 'Transformer') return '#ef4444';
    
    switch (type) {
      case 'Domestic':
        return '#f59e0b';
      case 'Public':
        return '#3b82f6';
      default:
        return '#ef4444';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.header}>All Alerts</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((filter, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.filterBtn,
              selectedFilter === index && styles.filterBtnActive
            ]}
            onPress={() => setSelectedFilter(index)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === index && styles.filterTextActive
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : getFilteredAlerts().length === 0 ? (
        <Text style={styles.noAlerts}>No alerts found.</Text>
      ) : (
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
          {getFilteredAlerts().map((alert, index) => (
            <View 
              key={`${alert.id}-${index}`} 
              style={[styles.alertCard, { borderLeftColor: getAlertColor(alert.type, alert.originalType) }]}
            > 
              <View style={styles.alertHeader}>
                <Feather 
                  name={getAlertIcon(alert.type, alert.originalType)} 
                  size={18} 
                  color={getAlertColor(alert.type, alert.originalType)} 
                  style={{marginRight: 6}} 
                />
                <Text style={styles.alertType}>
                  {alert.originalType === 'Transformer' ? 'Transformer' : alert.type}
                </Text>
              </View>
              <Text style={styles.alertTitle}>{alert.title || 'Alert'}</Text>
              <Text style={styles.alertDesc}>
                {alert.originalType === 'Transformer' ? (
                  <>
                    ID: {alert.id || 'N/A'}{'\n'}
                    Phase: {alert.phase || 'N/A'}{'\n'}
                    {alert.sensorData ? (
                      <>
                        Temperature: {alert.sensorData.temperature}°C{'\n'}
                        Humidity: {alert.sensorData.humidity}%{'\n'}
                        Rain: {alert.sensorData.rain}
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    Location: {alert.location || 'N/A'}{'\n'}
                    ID: {alert.id || 'N/A'}{'\n'}
                    {alert.sensorData ? (
                      <>
                        Temperature: {alert.sensorData.temperature}°C{'\n'}
                        Humidity: {alert.sensorData.humidity}%{'\n'}
                        Rain: {alert.sensorData.rain}
                      </>
                    ) : null}
                  </>
                )}
              </Text>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafb' },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 18, 
    paddingTop: 32, 
    paddingBottom: 12, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#e3e6eb' 
  },
  backBtn: { 
    width: 44, 
    height: 44, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#222', 
    textAlign: 'center', 
    flex: 1 
  },
  scrollContent: { 
    padding: 18 
  },
  alertCard: { 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    padding: 16, 
    marginBottom: 16, 
    borderLeftWidth: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  alertHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  alertType: { 
    fontWeight: 'bold', 
    color: '#222', 
    fontSize: 15 
  },
  alertTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#ef4444', 
    marginBottom: 2 
  },
  alertDesc: { 
    color: '#222', 
    marginBottom: 6, 
    lineHeight: 20 
  },
  alertTime: { 
    color: '#7A7F85', 
    fontSize: 13 
  },
  noAlerts: { 
    color: '#7A7F85', 
    fontSize: 16, 
    textAlign: 'center', 
    marginTop: 40 
  },
  filterRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#e3e6eb' 
  },
  filterBtn: { 
    flex: 1, 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    marginHorizontal: 4, 
    borderRadius: 8, 
    backgroundColor: '#f1f5f9', 
    alignItems: 'center' 
  },
  filterBtnActive: { 
    backgroundColor: '#2563eb' 
  },
  filterText: { 
    color: '#64748b', 
    fontWeight: '500', 
    fontSize: 14 
  },
  filterTextActive: { 
    color: '#fff' 
  }
}); 
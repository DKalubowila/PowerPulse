import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { db } from './firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const FILTERS = ['All Time', 'This Month', 'Last Month', 'Last 3 Months'];

export default function HistoryScreen() {
  const [selected, setSelected] = useState(0);
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userEmail } = route.params || {};
  const currentRoute = route.name || 'History';
  const isActive = (screen) => currentRoute === screen;
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'history'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      setHistory(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error('Error fetching history:', e);
      setHistory([]);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatus = (status) => {
    if (status === 'Resolved') return <Text style={{color:'#22c55e', fontWeight:'bold'}}>✔️ Resolved</Text>;
    if (status === 'Ongoing') return <Text style={{color:'#ef4444', fontWeight:'bold'}}>🔴 Ongoing</Text>;
    return null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Alert History</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((f, i) => (
          <TouchableOpacity key={i} style={[styles.filterBtn, selected===i && styles.filterBtnActive]} onPress={()=>setSelected(i)}>
            <Text style={[styles.filterText, selected===i && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView 
        contentContainerStyle={{paddingBottom:80}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        {loading ? (
          <Text style={{textAlign:'center', marginTop:20}}>Loading...</Text>
        ) : history.length === 0 ? (
          <Text style={{textAlign:'center', marginTop:20, color:'#7A7F85'}}>No history found.</Text>
        ) : (
          history.map((item, idx) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardDate}>{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</Text>
                <Text style={{color: item.status === 'Off' ? '#ef4444' : '#22c55e', fontWeight:'bold'}}>{item.status}</Text>
              </View>
              <Text style={styles.cardDuration}>Temp: {item.temperature}°C | Humidity: {item.humidity}% | Rain: {item.rain}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafb' },
  header: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginTop: 24, marginBottom: 10 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  filterBtnActive: { backgroundColor: '#e6f0ff' },
  filterText: { color: '#7A7F85', fontSize: 14 },
  filterTextActive: { color: '#2563eb', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardDate: { fontSize: 15, color: '#222', fontWeight: '500' },
  cardDuration: { fontSize: 14, color: '#7A7F85' },
}); 
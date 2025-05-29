import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Modal, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { db } from './firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import Feather from 'react-native-vector-icons/Feather';

const FILTERS = ['All', 'Pending', 'Resolved'];

export default function AdminMessagesScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(0);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'reports'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
    } catch (error) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const handleReportPress = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const handleMarkResolved = async () => {
    if (!selectedReport) return;
    setResolving(true);
    try {
      await updateDoc(doc(db, 'reports', selectedReport.id), { resolved: true });
      Alert.alert('Success', 'Report marked as resolved.');
      setModalVisible(false);
      fetchReports();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as resolved.');
    } finally {
      setResolving(false);
    }
  };

  const getFilteredReports = () => {
    if (selectedFilter === 0) return reports; // All
    const filterType = FILTERS[selectedFilter];
    return reports.filter(report => 
      filterType === 'Pending' ? !report.resolved : report.resolved
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>User Reports</Text>
      </View>
      
      <View style={styles.filterRow}>
        {FILTERS.map((filter, index) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterBtn,
              selectedFilter === index && styles.filterBtnActive
            ]}
            onPress={() => setSelectedFilter(index)}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === index && styles.filterTextActive
            ]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : getFilteredReports().length === 0 ? (
        <Text style={styles.noReports}>No reports found.</Text>
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
          {getFilteredReports().map(report => (
            <TouchableOpacity key={report.id} style={styles.reportCard} onPress={() => handleReportPress(report)}>
              <View style={styles.reportHeader}>
                <Text style={styles.userEmail}>{report.name || report.fullName || report.userEmail}</Text>
                {report.resolved ? (
                  <View style={styles.resolvedBadge}>
                    <Feather name="check-circle" size={14} color="#fff" />
                    <Text style={styles.resolvedText}>Resolved</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Feather name="clock" size={14} color="#fff" />
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                )}
              </View>
              <Text style={styles.nature}>{report.nature || 'No Nature'}</Text>
              <Text style={styles.reportDesc}>{report.description || report.desc || 'No Description'}</Text>
              {Array.isArray(report.images) && report.images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
                  {report.images.map((img, idx) => (
                    <Image key={idx} source={{ uri: img }} style={styles.imageThumb} />
                  ))}
                </ScrollView>
              )}
              {report.addressLine || report.location || report.locationCoords ? (
                <Text style={styles.location}>
                  {report.addressLine || report.location || (report.locationCoords ? `Lat: ${report.locationCoords.latitude}, Lng: ${report.locationCoords.longitude}` : '')}
                </Text>
              ) : null}
              <Text style={styles.reportTime}>
                {report.time || (report.createdAt ? 
                  (typeof report.createdAt === 'object' && report.createdAt.seconds ? 
                    new Date(report.createdAt.seconds * 1000).toLocaleString() : 
                    new Date(report.createdAt).toLocaleString()
                  ) : '')
                }
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReport && (
              <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
                <Text style={styles.modalTitle}>{selectedReport.nature || 'No Nature'}</Text>
                <Text style={styles.modalUser}>{selectedReport.name || selectedReport.fullName || selectedReport.userEmail}</Text>
                <Text style={styles.modalLabel}>Email:</Text>
                <Text style={styles.modalValue}>{selectedReport.userEmail || '-'}</Text>
                <Text style={styles.modalLabel}>Description:</Text>
                <Text style={styles.modalValue}>{selectedReport.description || selectedReport.desc || '-'}</Text>
                <Text style={styles.modalLabel}>Location:</Text>
                <Text style={styles.modalValue}>{selectedReport.addressLine || selectedReport.location || (selectedReport.locationCoords ? `Lat: ${selectedReport.locationCoords.latitude}, Lng: ${selectedReport.locationCoords.longitude}` : '-')}</Text>
                {selectedReport.locationCoords && (
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: selectedReport.locationCoords.latitude,
                      longitude: selectedReport.locationCoords.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: selectedReport.locationCoords.latitude,
                        longitude: selectedReport.locationCoords.longitude,
                      }}
                      title={selectedReport.addressLine || 'Selected Location'}
                    />
                  </MapView>
                )}
                {Array.isArray(selectedReport.images) && selectedReport.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
                    {selectedReport.images.map((img, idx) => (
                      <Image key={idx} source={{ uri: img }} style={styles.imageLarge} />
                    ))}
                  </ScrollView>
                )}
                <Text style={styles.modalLabel}>Time:</Text>
                <Text style={styles.modalValue}>
                  {selectedReport.time || (selectedReport.createdAt ? 
                    (typeof selectedReport.createdAt === 'object' && selectedReport.createdAt.seconds ? 
                      new Date(selectedReport.createdAt.seconds * 1000).toLocaleString() : 
                      new Date(selectedReport.createdAt).toLocaleString()
                    ) : '')
                  }
                </Text>
                <TouchableOpacity style={styles.resolveBtn} onPress={handleMarkResolved} disabled={resolving}>
                  <Text style={styles.resolveBtnText}>{resolving ? 'Marking...' : 'Mark as Resolved'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafb' },
  headerRow: { paddingHorizontal: 18, paddingTop: 32, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e3e6eb' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'left' },
  scrollContent: { padding: 18 },
  reportCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  reportContent: { marginBottom: 8 },
  userEmail: { fontWeight: 'bold', color: '#2563eb', fontSize: 15, marginBottom: 2 },
  nature: { color: '#ef4444', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  reportDesc: { color: '#222', fontSize: 14, marginBottom: 4 },
  imagesRow: { flexDirection: 'row', marginBottom: 4 },
  imageThumb: { width: 60, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: '#eee' },
  imageLarge: { width: 120, height: 120, borderRadius: 10, marginRight: 10, backgroundColor: '#eee' },
  location: { color: '#7A7F85', fontSize: 13, marginTop: 2 },
  reportTime: { color: '#7A7F85', fontSize: 12, textAlign: 'right' },
  noReports: { color: '#bbb', fontSize: 16, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2563eb', marginBottom: 8 },
  modalUser: { fontSize: 16, color: '#222', marginBottom: 8 },
  modalLabel: { fontWeight: 'bold', color: '#222', marginTop: 8 },
  modalValue: { color: '#444', marginBottom: 4 },
  resolveBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16 },
  resolveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { backgroundColor: '#eee', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 },
  closeBtnText: { color: '#222', fontWeight: 'bold', fontSize: 15 },
  map: { width: '100%', height: 180, borderRadius: 12, marginTop: 8, marginBottom: 8 },
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
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  resolvedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  pendingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  }
}); 
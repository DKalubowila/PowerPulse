import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Modal, Dimensions, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

export default function ReportScreen() {
  const [nature, setNature] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userEmail } = route.params || {};
  const currentRoute = route.name || 'Report';
  const isActive = (screen) => currentRoute === screen;
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      // Only fetch reports for the current user
      const qReports = query(
        collection(db, 'reports'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(qReports);
      // Sort the results in memory after fetching
      const sortedReports = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReports(sortedReports);
    } catch (e) {
      console.error('Error fetching reports:', e);
      setReports([]);
    }
    setLoadingReports(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permission to use this feature');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Update map region
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });

      // Get address from coordinates
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Format address
      const formattedAddress = [
        address.street,
        address.city,
        address.region,
        address.postalCode,
        address.country
      ].filter(Boolean).join(', ');

      setLocation(formattedAddress);
      setLocationCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get location: ' + error.message);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    
    try {
      // Get address from coordinates
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      // Format address
      const formattedAddress = [
        address.street,
        address.city,
        address.region,
        address.postalCode,
        address.country
      ].filter(Boolean).join(', ');

      setLocation(formattedAddress);
      setLocationCoords({ latitude, longitude });
    } catch (error) {
      Alert.alert('Error', 'Failed to get address: ' + error.message);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImages([...images, { uri: result.assets[0].uri, id: Date.now() }]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const removeImage = (id) => {
    setImages(images.filter(img => img.id !== id));
  };

  const handleSend = async () => {
    if (!nature.trim() || !desc.trim() || !location.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setUploading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        nature,
        desc,
        location,
        locationCoords,
        images: images.map(img => img.uri),
        userId: userId || null,
        userEmail: userEmail || null,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Report sent successfully!');
      setNature('');
      setDesc('');
      setLocation('');
      setLocationCoords(null);
      setImages([]);
    } catch (e) {
      Alert.alert('Error', 'Failed to send report: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.header}>Report a Problem</Text>
        <Text style={styles.label}>Damage Nature</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Power line down"
          value={nature}
          onChangeText={setNature}
        />
        <Text style={styles.label}>Describe the issue</Text>
        <TextInput
          style={[styles.input, {height: 80}]}
          placeholder="Describe the situation..."
          value={desc}
          onChangeText={setDesc}
          multiline
        />
        <Text style={styles.label}>Upload Images</Text>
        <View style={styles.imageRow}>
          {images.map(img => (
            <View key={img.id} style={styles.imageContainer}>
              <Image source={{ uri: img.uri }} style={styles.image} />
              <TouchableOpacity 
                style={styles.removeImageBtn}
                onPress={() => removeImage(img.id)}
              >
                <Feather name="x" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 4 && (
            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
              <Feather name="camera" size={24} color="#2563eb" />
              <Text style={styles.uploadBtnText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.label}>Location</Text>
        <View style={styles.locationContainer}>
          <TextInput
            style={[styles.input, styles.locationInput]}
            placeholder="Enter location"
            value={location}
            onChangeText={setLocation}
          />
          <TouchableOpacity 
            style={[styles.locationBtn, gettingLocation && styles.locationBtnDisabled]} 
            onPress={() => setShowMap(true)}
            disabled={gettingLocation}
          >
            <Feather name="map" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {gettingLocation && (
          <Text style={styles.locationLoading}>Getting your location...</Text>
        )}
        <TouchableOpacity 
          style={[styles.sendBtn, uploading && styles.sendBtnDisabled]} 
          onPress={handleSend}
          disabled={uploading}
        >
          <Text style={styles.sendBtnText}>
            {uploading ? 'Sending...' : 'Send Message'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.header, {marginTop:32}]}>Submitted Reports</Text>
        {loadingReports ? (
          <Text style={{textAlign:'center', marginTop:12}}>Loading...</Text>
        ) : reports.length === 0 ? (
          <Text style={{textAlign:'center', marginTop:12, color:'#7A7F85'}}>No reports found.</Text>
        ) : (
          reports.map(r => (
            <View key={r.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>{r.nature}</Text>
                {r.resolved ? (
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
              <Text style={styles.reportDesc}>{r.desc}</Text>
              {r.images && r.images.length > 0 && (
                <ScrollView horizontal style={styles.reportImages}>
                  {r.images.map((img, idx) => (
                    <Image key={idx} source={{ uri: img }} style={styles.reportImage} />
                  ))}
                </ScrollView>
              )}
              <Text style={styles.reportLocation}>Location: {r.location}</Text>
              <Text style={styles.reportTime}>
                At: {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showMap}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => setShowMap(false)}
            >
              <Feather name="x" size={24} color="#222" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={getCurrentLocation}
            >
              <Feather name="navigation" size={24} color="#222" />
            </TouchableOpacity>
          </View>
          <MapView
            style={styles.map}
            region={mapRegion}
            onPress={handleMapPress}
          >
            {locationCoords && (
              <Marker
                coordinate={locationCoords}
                title="Selected Location"
                description={location}
              />
            )}
          </MapView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafb' },
  header: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginTop: 24, marginBottom: 18 },
  label: { fontSize: 15, color: '#222', marginLeft: 18, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 12, height: 44, fontSize: 16, color: '#222', borderWidth: 1, borderColor: '#E3E6EB', marginBottom: 4 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16 },
  locationInput: { flex: 1, marginRight: 8 },
  locationBtn: { backgroundColor: '#2563eb', width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  locationBtnDisabled: { opacity: 0.7 },
  locationLoading: { color: '#7A7F85', fontSize: 13, marginLeft: 18, marginTop: 4 },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginHorizontal: 16, marginBottom: 8 },
  imageContainer: { position: 'relative', marginRight: 8, marginBottom: 8 },
  image: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  removeImageBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  uploadBtn: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#2563eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6f0ff' },
  uploadBtnText: { color: '#2563eb', fontSize: 12, marginTop: 4 },
  sendBtn: { backgroundColor: '#2563eb', borderRadius: 8, marginHorizontal: 16, paddingVertical: 16, alignItems: 'center', marginTop: 18 },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  reportCard: { backgroundColor: '#fff', borderRadius: 10, marginHorizontal: 16, marginBottom: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  reportTitle: { fontWeight: 'bold', color: '#2563eb', fontSize: 16 },
  reportDesc: { color: '#222', marginBottom: 8 },
  reportImages: { flexDirection: 'row', marginBottom: 8 },
  reportImage: { width: 100, height: 100, borderRadius: 8, marginRight: 8 },
  reportLocation: { color: '#7A7F85', fontSize: 13 },
  reportTime: { color: '#bbb', fontSize: 12, marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  mapHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E6EB'
  },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f6fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: { flex: 1 },
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
  },
}); 
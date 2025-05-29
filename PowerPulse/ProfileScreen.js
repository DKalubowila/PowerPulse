import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import Feather from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

// Dummy user data for UI; in a real app, fetch from Firestore or context
const dummyUser = {
  id: '', // Firestore doc id
  name: 'John Smith',
  email: 'john.smith@email.com',
  address: '123 Main Street',
  mobile: '+94123456789',
  password: '********',
  avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userEmail } = route.params || {};
  const currentRoute = route.name || 'Profile';
  const isActive = (screen) => currentRoute === screen;
  
  console.log('ProfileScreen params:', { userId, userEmail });
  
  const [user, setUser] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedAddress, setEditedAddress] = useState('');
  const [editedCity, setEditedCity] = useState('');
  const [editedPostalCode, setEditedPostalCode] = useState('');
  const [editedMobile, setEditedMobile] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationCoords, setLocationCoords] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

    const fetchUser = async () => {
      setLoading(true);
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
        console.log('Setting user data:', userDoc);
          setUser(userDoc);
        // Fetch report count
        const reportsQuery = query(collection(db, 'reports'), where('userId', '==', userDoc.id));
        const reportsSnapshot = await getDocs(reportsQuery);
        setReportCount(reportsSnapshot.size);
        setEditedName(userDoc.fullName || '');
        setEditedAddress(userDoc.addressLine || '');
        setEditedCity(userDoc.city || '');
        setEditedPostalCode(userDoc.postalCode || '');
        
        // Set initial map region if coordinates exist
        if (userDoc.locationCoords) {
          setMapRegion({
            latitude: userDoc.locationCoords.latitude,
            longitude: userDoc.locationCoords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
          setLocationCoords(userDoc.locationCoords);
        }
      } else {
        console.log('No user found');
        }
      } catch (e) {
      console.error('Error fetching user:', e);
      Alert.alert('Error', 'Failed to fetch user data.');
      }
      setLoading(false);
    };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUser();
    setRefreshing(false);
  }, [userId, userEmail]);

  useEffect(() => {
    fetchUser();
  }, [userId, userEmail]);

  const handleEdit = (field) => {
    setEditField(field);
    setEditValue(user[field] || '');
    setModalVisible(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleSave = async () => {
    if (editField === 'password') {
      if (oldPassword !== user.password) {
        setPasswordError('Old password is incorrect.');
        return;
      }
      if (newPassword.length < 9) {
        setPasswordError('New password must be at least 9 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match.');
        return;
      }
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { password: newPassword });
        setUser({ ...user, password: newPassword });
        setModalVisible(false);
        Alert.alert('Success', 'Password updated successfully!');
      } catch (e) {
        setPasswordError('Failed to update password.');
      }
      return;
    }
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { [editField]: editValue });
      setUser({ ...user, [editField]: editValue });
      setModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingImage(true);
        try {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, { avatar: result.assets[0].uri });
          setUser({ ...user, avatar: result.assets[0].uri });
          Alert.alert('Success', 'Profile picture updated successfully!');
        } catch (e) {
          Alert.alert('Error', 'Failed to update profile picture.');
        }
        setUploadingImage(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => navigation.navigate('Splash') }
      ]
    );
  };

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permission to use this feature');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const formattedAddress = [
        address.street,
        address.city,
        address.region,
        address.postalCode,
        address.country
      ].filter(Boolean).join(', ');

      setEditedAddress(formattedAddress);
      setEditedCity(address.city || '');
      setEditedPostalCode(address.postalCode || '');
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
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const formattedAddress = [
        address.street,
        address.city,
        address.region,
        address.postalCode,
        address.country
      ].filter(Boolean).join(', ');

      setEditedAddress(formattedAddress);
      setEditedCity(address.city || '');
      setEditedPostalCode(address.postalCode || '');
      setLocationCoords({ latitude, longitude });
    } catch (error) {
      Alert.alert('Error', 'Failed to get address: ' + error.message);
    }
  };

  const handleSaveName = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { fullName: editedName });
      setUser({ ...user, fullName: editedName });
      setShowNameModal(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update name');
    }
  };

  const handleSaveAddress = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        addressLine: editedAddress,
        city: editedCity,
        postalCode: editedPostalCode,
        locationCoords: locationCoords,
      });
      setUser(prev => ({
        ...prev,
        addressLine: editedAddress,
        city: editedCity,
        postalCode: editedPostalCode,
        locationCoords: locationCoords,
      }));
      setShowAddressModal(false);
      Alert.alert('Success', 'Address updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update address');
    }
  };

  const handleSaveMobile = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { mobile: editedMobile });
      setUser({ ...user, mobile: editedMobile });
      setShowMobileModal(false);
      Alert.alert('Success', 'Mobile number updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update mobile number');
    }
  };

  const handleSaveEmail = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { email: editedEmail });
      setUser({ ...user, email: editedEmail });
      setShowEmailModal(false);
      Alert.alert('Success', 'Email updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update email');
    }
  };

  if (loading || !user) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

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
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Feather name="user" size={40} color="#2563eb" />
              </View>
            )}
            <TouchableOpacity style={styles.editImageButton} onPress={handleImagePick}>
              <Feather name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{user.fullName || user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Feather name="shield" size={14} color="#2563eb" />
            <Text style={styles.roleText}>User</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{reportCount}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.settingsList}>
            <TouchableOpacity style={styles.settingItem} onPress={() => setShowNameModal(true)}>
              <View style={styles.settingIconContainer}>
                <Feather name="user" size={20} color="#2563eb" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Full Name</Text>
                <Text style={styles.settingValue}>{user.fullName || user.name}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#7A7F85" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => setShowAddressModal(true)}>
              <View style={styles.settingIconContainer}>
                <Feather name="map-pin" size={20} color="#2563eb" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Address</Text>
                <Text style={styles.settingValue}>{user.addressLine}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#7A7F85" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => setShowMobileModal(true)}>
              <View style={styles.settingIconContainer}>
                <Feather name="phone" size={20} color="#2563eb" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Mobile Number</Text>
                <Text style={styles.settingValue}>{user.mobile}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#7A7F85" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => setShowEmailModal(true)}>
              <View style={styles.settingIconContainer}>
                <Feather name="mail" size={20} color="#2563eb" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Email</Text>
                <Text style={styles.settingValue}>{user.email}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#7A7F85" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => setShowPasswordModal(true)}>
              <View style={styles.settingIconContainer}>
                <Feather name="lock" size={20} color="#2563eb" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Password</Text>
                <Text style={styles.settingValue}>••••••••</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#7A7F85" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <TouchableOpacity onPress={() => setShowNameModal(false)}>
                <Feather name="x" size={24} color="#222" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your full name"
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Address</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Feather name="x" size={24} color="#222" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Address</Text>
              <View style={styles.locationContainer}>
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  value={editedAddress}
                  onChangeText={setEditedAddress}
                  placeholder="Enter your address"
                />
                <TouchableOpacity 
                  style={[styles.locationBtn, gettingLocation && styles.locationBtnDisabled]}
                  onPress={getCurrentLocation}
                  disabled={gettingLocation}
                >
                  <Feather name="map-pin" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.locationBtn, styles.mapBtn]}
                  onPress={() => setShowMap(true)}
                >
                  <Feather name="map" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={editedCity}
                onChangeText={setEditedCity}
                placeholder="Enter your city"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Postal Code</Text>
              <TextInput
                style={styles.input}
                value={editedPostalCode}
                onChangeText={setEditedPostalCode}
                placeholder="Enter your postal code"
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveAddress}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMobileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMobileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Mobile Number</Text>
              <TouchableOpacity onPress={() => setShowMobileModal(false)}>
                <Feather name="x" size={24} color="#222" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={editedMobile}
                onChangeText={setEditedMobile}
                placeholder="Enter your mobile number"
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveMobile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEmailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Email</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Feather name="x" size={24} color="#222" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={editedEmail}
                onChangeText={setEditedEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEmail}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Feather name="x" size={24} color="#222" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Enter current password"
                secureTextEntry
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMap}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity 
              style={styles.mapCloseButton}
              onPress={() => setShowMap(false)}
            >
              <Feather name="x" size={24} color="#222" />
        </TouchableOpacity>
            <Text style={styles.mapTitle}>Select Location</Text>
            <TouchableOpacity 
              style={styles.mapCurrentButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
            >
              <Feather name="navigation" size={24} color="#2563eb" />
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
                description={editedAddress}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 80 },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e6f0ff',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563eb',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: '#7A7F85',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 15,
    color: '#7A7F85',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
  },
  settingsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    color: '#222',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 13,
    color: '#7A7F85',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f6fafb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#222',
    borderWidth: 1,
    borderColor: '#E3E6EB',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationInput: {
    flex: 1,
  },
  locationBtn: {
    backgroundColor: '#1877f2',
    borderRadius: 12,
    padding: 8,
    marginLeft: 8,
  },
  locationBtnDisabled: {
    backgroundColor: '#E3E6EB',
  },
  mapBtn: {
    backgroundColor: '#1877f2',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  mapCloseButton: {
    padding: 8,
  },
  mapTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  mapCurrentButton: {
    padding: 8,
  },
  map: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
  },
}); 
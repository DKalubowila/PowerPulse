import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, Modal, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { db } from './firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import Feather from 'react-native-vector-icons/Feather';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationCoords, setLocationCoords] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!fullName || fullName.trim().length < 4) {
      newErrors.fullName = 'Full name must be more than 3 letters.';
    }
    if (!addressLine) {
      newErrors.addressLine = 'Address line is required.';
    }
    if (!city) {
      newErrors.city = 'City is required.';
    }
    if (!postalCode) {
      newErrors.postalCode = 'Postal code is required.';
    }
    if (mobile.length !== 9 || !/^\d{9}$/.test(mobile)) {
      newErrors.mobile = 'Enter 9 digits after +94.';
    }
    if (!email.includes('@') || !email.endsWith('.com')) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!password || password.length < 9) {
      newErrors.password = 'Password must be more than 8 characters.';
    }
    if (!deviceId.startsWith('CEB-') || deviceId.length < 8) {
      newErrors.deviceId = 'Device ID must start with CEB- and be at least 8 characters.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

      setAddressLine(formattedAddress);
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

      setAddressLine(formattedAddress);
      setLocationCoords({ latitude, longitude });
      
      // Auto-fill city and postal code
      if (address.city) {
        setCity(address.city);
      }
      if (address.postalCode) {
        setPostalCode(address.postalCode);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get address: ' + error.message);
    }
  };

  const handleRegister = async () => {
    if (validate()) {
      setLoading(true);
      try {
        await addDoc(collection(db, 'users'), {
          fullName,
          addressLine,
          city,
          postalCode,
          mobile: '+94' + mobile,
          deviceId,
          email,
          password,
          locationCoords,
        });
        Alert.alert('Success', 'Registration successful!');
        navigation.navigate('Login');
      } catch (error) {
        Alert.alert('Error', 'Failed to register: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleShowModal = (type) => {
    if (type === 'terms') {
      setModalContent('Terms of Service placeholder text.');
    } else {
      setModalContent('Privacy Policy placeholder text.');
    }
    setModalVisible(true);
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoContainer}>
        <Image source={require('./assets/Logo.png')} style={styles.logo} />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join us to get started</Text>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Feather name="user" size={20} color="#A0A4A8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#A0A4A8"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

          <View style={styles.inputWrapper}>
            <Feather name="map-pin" size={20} color="#A0A4A8" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="Address"
              placeholderTextColor="#A0A4A8"
              value={addressLine}
              onChangeText={setAddressLine}
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
          {errors.addressLine && <Text style={styles.errorText}>{errors.addressLine}</Text>}

          <View style={styles.inputWrapper}>
            <Feather name="map" size={20} color="#A0A4A8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor="#A0A4A8"
              value={city}
              onChangeText={setCity}
            />
          </View>
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}

          <View style={styles.inputWrapper}>
            <Feather name="hash" size={20} color="#A0A4A8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Postal Code"
              placeholderTextColor="#A0A4A8"
              value={postalCode}
              onChangeText={setPostalCode}
            />
          </View>
          {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}

          <View style={styles.mobileRow}>
            <View style={styles.mobilePrefixBox}>
              <Text style={styles.mobilePrefix}>+94</Text>
            </View>
            <View style={[styles.inputWrapper, styles.mobileInput]}>
              <Feather name="phone" size={20} color="#A0A4A8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="XXXXXXXXX"
                placeholderTextColor="#A0A4A8"
                value={mobile}
                onChangeText={text => setMobile(text.replace(/[^0-9]/g, '').slice(0, 9))}
                keyboardType="number-pad"
                maxLength={9}
              />
            </View>
          </View>
          {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}

          <View style={styles.inputWrapper}>
            <Feather name="cpu" size={20} color="#A0A4A8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Device ID (CEB-XXXXXX)"
              placeholderTextColor="#A0A4A8"
              value={deviceId}
              onChangeText={setDeviceId}
              autoCapitalize="characters"
            />
          </View>
          {errors.deviceId && <Text style={styles.errorText}>{errors.deviceId}</Text>}

          <View style={styles.inputWrapper}>
            <Feather name="mail" size={20} color="#A0A4A8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#A0A4A8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <View style={styles.inputWrapper}>
            <Feather name="lock" size={20} color="#A0A4A8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#A0A4A8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#A0A4A8" 
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.termsText}>
          By creating an account, you agree to our
          <Text style={styles.link} onPress={() => handleShowModal('terms')}> Terms of Service </Text>
          and
          <Text style={styles.link} onPress={() => handleShowModal('privacy')}> Privacy Policy</Text>
        </Text>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>{modalContent}</Text>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalButtonText}>Close</Text>
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
                description={addressLine}
              />
            )}
          </MapView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  formContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7A7F85',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E6EB',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#222',
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
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mobilePrefixBox: {
    backgroundColor: '#F6F7FB',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E6EB',
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  mobilePrefix: {
    fontSize: 16,
    color: '#222',
  },
  mobileInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    marginLeft: -1,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  createButton: {
    backgroundColor: '#1877f2',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1877f2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#7A7F85',
    fontSize: 15,
  },
  loginLink: {
    color: '#1877f2',
    fontSize: 15,
    fontWeight: '600',
  },
  termsText: {
    color: '#7A7F85',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  link: {
    color: '#1877f2',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalText: {
    fontSize: 16,
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },
  closeModalButton: {
    backgroundColor: '#1877f2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  eyeIcon: {
    padding: 8,
  },
}); 
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ref, onValue, get } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const TransformerAlert = () => {
  const [alertVisible, setAlertVisible] = useState(false);
  const [transformerData, setTransformerData] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Reference to the Transformer node in Realtime Database
    const dbRT = getDatabase();
    const transformerRef = ref(dbRT, 'Transformer');

    // Listen for changes in the Transformer data
    const unsubscribe = onValue(transformerRef, async (snapshot) => {
      const data = snapshot.val();
      console.log('Full Transformer Data:', data);

      if (data && data.Status === 0) {
        try {
          // Get all transformer data
          const idSnap = await get(ref(dbRT, 'Transformer/Id'));
          const phaseSnap = await get(ref(dbRT, 'Transformer/Phase'));
          const tempSnap = await get(ref(dbRT, 'Transformer/Tem'));
          const humSnap = await get(ref(dbRT, 'Transformer/Hum'));
          const rainSnap = await get(ref(dbRT, 'Transformer/Rain'));

          console.log('Transformer Data Fetched:', {
            id: idSnap.exists() ? idSnap.val() : 'Unknown',
            phase: phaseSnap.exists() ? phaseSnap.val() : 'Unknown',
            temperature: tempSnap.exists() ? tempSnap.val() : 'Unknown',
            humidity: humSnap.exists() ? humSnap.val() : 'Unknown',
            rain: rainSnap.exists() ? rainSnap.val() : 'Unknown'
          });

          const transformerInfo = {
            Id: idSnap.exists() ? idSnap.val() : 'Unknown',
            Phase: phaseSnap.exists() ? phaseSnap.val() : 'Unknown',
            Status: data.Status,
            Temperature: tempSnap.exists() ? tempSnap.val() : 'Unknown',
            Humidity: humSnap.exists() ? humSnap.val() : 'Unknown',
            Rain: rainSnap.exists() ? rainSnap.val() : 'Unknown'
          };

          // Create notification in Firestore
          try {
            await addDoc(collection(db, 'notifications'), {
              title: 'Transformer Failure Alert',
              type: 'Transformer',
              id: transformerInfo.Id,
              phase: transformerInfo.Phase,
              status: transformerInfo.Status,
              sensorData: {
                temperature: transformerInfo.Temperature,
                humidity: transformerInfo.Humidity,
                rain: transformerInfo.Rain
              },
              timestamp: new Date(),
              isRead: false
            });
            console.log('Transformer alert saved to Firestore');
          } catch (firestoreError) {
            console.error('Error saving to Firestore:', firestoreError);
          }

          console.log('Final Transformer Info:', transformerInfo);
          setTransformerData(transformerInfo);
          showAlert();
        } catch (error) {
          console.error('Error fetching transformer details:', error);
          if (error.code) {
            console.error('Error code:', error.code);
          }
          if (error.message) {
            console.error('Error message:', error.message);
          }
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const showAlert = () => {
    setAlertVisible(true);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideAlert = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setAlertVisible(false);
    });
  };

  if (!alertVisible) return null;

  return (
    <Modal
      transparent
      visible={alertVisible}
      animationType="none"
      onRequestClose={hideAlert}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Transformer Failure Detected!</Text>
          
          {transformerData && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transformer ID:</Text>
                <Text style={styles.detailValue}>{transformerData.Id || 'Unknown'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phase:</Text>
                <Text style={styles.detailValue}>{transformerData.Phase || 'Unknown'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Temperature:</Text>
                <Text style={styles.detailValue}>{transformerData.Temperature || 'Unknown'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Humidity:</Text>
                <Text style={styles.detailValue}>{transformerData.Humidity || 'Unknown'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rain:</Text>
                <Text style={styles.detailValue}>{transformerData.Rain || 'Unknown'}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={styles.closeButton}
            onPress={hideAlert}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  detailValue: {
    fontSize: 16,
    color: '#6b7280',
  },
  closeButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransformerAlert; 
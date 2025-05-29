import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

export default function AdminProfileScreen({ navigation }) {
  const [password, setPassword] = useState('Admin123');
  const [editing, setEditing] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match.');
      return;
    }
    setPassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setEditing(false);
    Alert.alert('Success', 'Password updated successfully!');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => navigation.navigate('Splash') },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Feather name="user" size={60} color="#2563eb" />
        </View>
        <Text style={styles.name}>Admin</Text>
        <Text style={styles.email}>Email: Admin</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        {editing ? (
          <>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                value={password}
                secureTextEntry={!showCurrent}
                editable={false}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
                <Feather name={showCurrent ? 'eye-off' : 'eye'} size={20} color="#2563eb" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdatePassword}>
                <Feather name="check" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setNewPassword(''); setConfirmPassword(''); }}>
                <Feather name="x" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.inputRow}>
            <Text style={styles.passwordValue}>{'*'.repeat(password.length)}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Feather name="edit-2" size={18} color="#2563eb" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Feather name="log-out" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafb' },
  header: {
    alignItems: 'center',
    paddingTop: 40,
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
    marginBottom: 16,
    backgroundColor: '#e6f0ff',
    borderRadius: 50,
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
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
  section: {
    marginTop: 32,
    marginHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f6fafb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#222',
    borderWidth: 1,
    borderColor: '#E3E6EB',
  },
  passwordValue: {
    flex: 1,
    fontSize: 18,
    color: '#222',
    letterSpacing: 4,
    backgroundColor: '#f6fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E3E6EB',
  },
  editBtn: {
    marginLeft: 12,
    padding: 8,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 10,
    marginLeft: 8,
  },
  cancelBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 10,
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: 40,
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
  eyeBtn: {
    marginLeft: 8,
    padding: 8,
  },
  alertType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
}); 
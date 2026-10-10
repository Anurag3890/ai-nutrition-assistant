import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Modal
} from 'react-native';

const DEMO_ACCOUNTS = [
  {
    name: 'Alex Morgan',
    phone: '+1 555-0199',
    password: 'Password123!',
    goal: 'Fat Loss Deficit',
    targets: { calories: 1850, protein: 135, carbs: 180, fat: 55, water: 2500 }
  },
  {
    name: 'Sarah Chen',
    phone: '+1 555-0288',
    password: 'KetoSecret123!',
    goal: 'Metabolic Ketosis',
    targets: { calories: 2100, protein: 140, carbs: 35, fat: 155, water: 3000 }
  },
  {
    name: 'Marcus Vance',
    phone: '+1 555-0377',
    password: 'AthletePower123!',
    goal: 'Muscle Hypertrophy',
    targets: { calories: 3100, protein: 195, carbs: 410, fat: 75, water: 3800 }
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(DEMO_ACCOUNTS[0]);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'camera', 'chat', 'profile'
  
  // STRICT ZERO PREPOPULATION: Always starts at 0 meals and 0 ml water
  const [meals, setMeals] = useState([]);
  const [waterMl, setWaterMl] = useState(0);

  const [isLogModalVisible, setLogModalVisible] = useState(false);
  const [isAuthModalVisible, setAuthModalVisible] = useState(false);

  // Auth Inputs
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Form state
  const [newMealName, setNewMealName] = useState('');
  const [newMealCal, setNewMealCal] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Dinner');

  // AI Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'ai',
      text: `Hi ${currentUser.name}! You have a clean daily slate (0 kcal logged). Ready to log your first meal?`,
    },
  ]);

  // Aggregate Totals
  const totalCal = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const remainingCal = Math.max(0, currentUser.targets.calories - totalCal);

  const handleAddMeal = () => {
    if (!newMealName || !newMealCal) return;
    const item = {
      id: Date.now().toString(),
      category: selectedCategory,
      title: newMealName,
      calories: parseFloat(newMealCal) || 0,
      protein: parseFloat(newMealProtein) || 0,
      carbs: 20,
      fat: 5,
    };
    setMeals([...meals, item]);
    setNewMealName('');
    setNewMealCal('');
    setNewMealProtein('');
    setLogModalVisible(false);
  };

  const handleAuthSubmit = () => {
    if (isRegistering) {
      if (!authName || !authPhone || !authPassword) return;
      const newUser = {
        name: authName,
        phone: authPhone,
        password: authPassword,
        goal: 'Personal Protocol',
        targets: { calories: 2000, protein: 140, carbs: 200, fat: 60, water: 2800 }
      };
      setCurrentUser(newUser);
      setMeals([]);
      setWaterMl(0);
      setAuthModalVisible(false);
      setAuthPhone('');
      setAuthPassword('');
      setAuthName('');
    } else {
      const match = DEMO_ACCOUNTS.find(a => (a.phone === authPhone || a.name.toLowerCase() === authPhone.toLowerCase()) && a.password === authPassword);
      if (match) {
        setCurrentUser(match);
        setMeals([]);
        setWaterMl(0);
        setAuthModalVisible(false);
        setAuthPhone('');
        setAuthPassword('');
      } else {
        alert('Invalid phone or password. Use demo buttons or register.');
      }
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now().toString(), sender: 'user', text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');

    setTimeout(() => {
      const aiReply = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Great question, ${currentUser.name}! You've logged ${totalCal} kcal today with ${remainingCal} kcal remaining in your budget.`,
      };
      setMessages(prev => [...prev, aiReply]);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setAuthModalVisible(true)} style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{currentUser.name} ▾</Text>
          <Text style={styles.headerSubtitle}>📱 {currentUser.phone} • {currentUser.goal}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => setLogModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Views */}
      {activeTab === 'home' && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Calorie Ring Card */}
          <View style={styles.macroCard}>
            <Text style={styles.cardHeader}>Daily Energy Budget</Text>
            <View style={styles.calorieRow}>
              <View>
                <Text style={styles.bigNumber}>{totalCal}</Text>
                <Text style={styles.label}>Consumed kcal</Text>
              </View>
              <View style={styles.badgeRemaining}>
                <Text style={styles.remainingVal}>{remainingCal}</Text>
                <Text style={styles.remainingLabel}>Remaining</Text>
              </View>
            </View>

            {/* Macro Breakdown Pills */}
            <View style={styles.macroPillsRow}>
              <View style={[styles.macroPill, { borderColor: '#3b82f6' }]}>
                <Text style={styles.macroPillLabel}>Protein</Text>
                <Text style={styles.macroPillVal}>{totalProtein.toFixed(1)} / {currentUser.targets.protein}g</Text>
              </View>
              <View style={[styles.macroPill, { borderColor: '#f59e0b' }]}>
                <Text style={styles.macroPillLabel}>Carbs</Text>
                <Text style={styles.macroPillVal}>0 / {currentUser.targets.carbs}g</Text>
              </View>
              <View style={[styles.macroPill, { borderColor: '#ef4444' }]}>
                <Text style={styles.macroPillLabel}>Fats</Text>
                <Text style={styles.macroPillVal}>0 / {currentUser.targets.fat}g</Text>
              </View>
            </View>
          </View>

          {/* Hydration Widget */}
          <View style={styles.waterCard}>
            <View style={styles.waterHeader}>
              <Text style={styles.waterTitle}>💧 Cellular Hydration</Text>
              <Text style={styles.waterProgress}>{waterMl} / {currentUser.targets.water} ml</Text>
            </View>
            <View style={styles.waterButtons}>
              <TouchableOpacity style={styles.waterBtn} onPress={() => setWaterMl(w => w + 250)}>
                <Text style={styles.waterBtnText}>+250ml Glass</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.waterBtn} onPress={() => setWaterMl(w => w + 500)}>
                <Text style={styles.waterBtnText}>+500ml Bottle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.waterBtn, { backgroundColor: '#fee2e2' }]} onPress={() => setWaterMl(0)}>
                <Text style={[styles.waterBtnText, { color: '#dc2626' }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Meals Diary List */}
          <Text style={styles.sectionTitle}>Today's Logged Meals ({meals.length})</Text>
          {meals.length === 0 ? (
            <TouchableOpacity style={styles.emptyCard} onPress={() => setLogModalVisible(true)}>
              <Text style={styles.emptyCardText}>+ No meals logged yet. Tap here or '+ Log' above to enter food!</Text>
            </TouchableOpacity>
          ) : (
            meals.map(item => (
              <View key={item.id} style={styles.mealCard}>
                <View style={styles.mealCardTop}>
                  <Text style={styles.mealCategory}>{item.category}</Text>
                  <Text style={styles.mealCalories}>{item.calories} kcal</Text>
                </View>
                <Text style={styles.mealTitle}>{item.title}</Text>
                <Text style={styles.mealMacros}>Protein: {item.protein}g • Carbs: {item.carbs}g • Fat: {item.fat}g</Text>
              </View>
            ))
          )}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* AI Chat Tab */}
      {activeTab === 'chat' && (
        <View style={styles.chatContainer}>
          <ScrollView style={styles.chatScroll}>
            {messages.map(m => (
              <View
                key={m.id}
                style={[
                  styles.messageBubble,
                  m.sender === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text style={m.sender === 'user' ? styles.userMsgText : styles.aiMsgText}>
                  {m.text}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatTextInput}
              placeholder="Ask coach about macros, meals, fasting..."
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabActive]}>📊 Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('chat')}>
          <Text style={[styles.tabLabel, activeTab === 'chat' && styles.tabActive]}>🧠 Coach</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setAuthModalVisible(true)}>
          <Text style={[styles.tabLabel, styles.tabActive]}>👤 Switch User</Text>
        </TouchableOpacity>
      </View>

      {/* Auth / Switch User Modal */}
      <Modal visible={isAuthModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>
              {isRegistering ? 'Register New Athlete' : 'Sign In with Phone & Password'}
            </Text>

            {isRegistering && (
              <TextInput
                style={styles.inputField}
                placeholder="Full Name (e.g. Anurag Anand)"
                value={authName}
                onChangeText={setAuthName}
              />
            )}

            <TextInput
              style={styles.inputField}
              placeholder="Phone Number (e.g. +1 555-0199)"
              value={authPhone}
              onChangeText={setAuthPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.inputField}
              placeholder="Specific Password"
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
            />

            <TouchableOpacity style={[styles.saveBtn, { marginTop: 6 }]} onPress={handleAuthSubmit}>
              <Text style={styles.saveBtnText}>{isRegistering ? 'Create Profile' : 'Sign In'}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
              <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
                <Text style={{ color: '#0284c7', fontSize: 13, fontWeight: '700' }}>
                  {isRegistering ? '← Back to Sign In' : '+ Register New Account'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAuthModalVisible(false)}>
                <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 16, borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6 }}>DEMO ATHLETES:</Text>
              {DEMO_ACCOUNTS.map(a => (
                <TouchableOpacity
                  key={a.phone}
                  style={{ paddingVertical: 4 }}
                  onPress={() => {
                    setCurrentUser(a);
                    setMeals([]);
                    setWaterMl(0);
                    setAuthModalVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '600' }}>
                    ● {a.name} ({a.phone})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Log Meal Modal */}
      <Modal visible={isLogModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Log Food Item</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Food name (e.g. Atlantic Salmon with Asparagus)"
              value={newMealName}
              onChangeText={setNewMealName}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Calories (kcal)"
              keyboardType="numeric"
              value={newMealCal}
              onChangeText={setNewMealCal}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Protein (g)"
              keyboardType="numeric"
              value={newMealProtein}
              onChangeText={setNewMealProtein}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddMeal}>
                <Text style={styles.saveBtnText}>Save Meal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 11, color: '#64748b', marginTop: 2 },
  addBtn: { backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  scrollContent: { flex: 1, padding: 16 },
  macroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  bigNumber: { fontSize: 36, fontWeight: '800', color: '#0f172a' },
  label: { fontSize: 12, color: '#64748b' },
  badgeRemaining: { backgroundColor: '#ecfdf5', padding: 10, borderRadius: 12, alignItems: 'center' },
  remainingVal: { fontSize: 20, fontWeight: '800', color: '#059669' },
  remainingLabel: { fontSize: 10, fontWeight: '600', color: '#059669' },
  macroPillsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  macroPill: { borderWidth: 1, borderRadius: 8, padding: 8, width: '31%', alignItems: 'center' },
  macroPillLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  macroPillVal: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  waterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  waterTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  waterProgress: { fontSize: 14, fontWeight: '800', color: '#06b6d4' },
  waterButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  waterBtn: {
    backgroundColor: '#e0f2fe',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  waterBtnText: { color: '#0284c7', fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginVertical: 12, color: '#0f172a' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyCardText: { color: '#64748b', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  mealCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mealCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  mealCategory: { fontSize: 11, fontWeight: '700', color: '#10b981', textTransform: 'uppercase' },
  mealCalories: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  mealTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  mealMacros: { fontSize: 12, color: '#64748b', marginTop: 4 },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  tabItem: { alignItems: 'center' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabActive: { color: '#10b981', fontWeight: '800' },
  chatContainer: { flex: 1, padding: 16 },
  chatScroll: { flex: 1 },
  messageBubble: { padding: 12, borderRadius: 14, marginBottom: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0f172a' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  userMsgText: { color: '#ffffff', fontSize: 14 },
  aiMsgText: { color: '#0f172a', fontSize: 14 },
  chatInputRow: { flexDirection: 'row', gap: 8, paddingBottom: 70 },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtn: { backgroundColor: '#10b981', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 16 },
  sendBtnText: { color: '#ffffff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalHeading: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  inputField: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  saveBtn: { backgroundColor: '#10b981', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: '700' },
});

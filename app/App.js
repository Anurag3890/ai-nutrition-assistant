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

// --- Sample State for Mobile App ---
const INITIAL_TARGETS = {
  calories: 1850,
  protein: 135,
  carbs: 180,
  fat: 55,
  water: 2500,
};

const INITIAL_MEALS = [
  { id: '1', category: 'Breakfast', title: 'Oatmeal with Whey & Berries', calories: 364, protein: 32.2, carbs: 49.5, fat: 4.5 },
  { id: '2', category: 'Lunch', title: 'Chicken, Rice, Broccoli & Avocado', calories: 557, protein: 53.7, carbs: 53.5, fat: 13.5 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'camera', 'chat', 'profile'
  const [meals, setMeals] = useState(INITIAL_MEALS);
  const [waterMl, setWaterMl] = useState(1600);
  const [isLogModalVisible, setLogModalVisible] = useState(false);

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
      text: "Hi Alex! You've logged 921 calories and 85.9g of protein today. Ready for dinner? Aim for ~49g protein to meet your target!",
    },
  ]);

  // Aggregate Totals
  const totalCal = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const remainingCal = Math.max(0, INITIAL_TARGETS.calories - totalCal);

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

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now().toString(), sender: 'user', text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');

    setTimeout(() => {
      const aiReply = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Great question! You have ${remainingCal} kcal remaining today. Prioritize lean protein and fiber for your next meal.`,
      };
      setMessages(prev => [...prev, aiReply]);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>NutriAI Mobile</Text>
          <Text style={styles.headerSubtitle}>Personalized Nutrition & Coaching</Text>
        </View>
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
                <Text style={styles.macroPillVal}>{totalProtein.toFixed(1)} / {INITIAL_TARGETS.protein}g</Text>
              </View>
              <View style={[styles.macroPill, { borderColor: '#f59e0b' }]}>
                <Text style={styles.macroPillLabel}>Carbs</Text>
                <Text style={styles.macroPillVal}>103 / {INITIAL_TARGETS.carbs}g</Text>
              </View>
              <View style={[styles.macroPill, { borderColor: '#ef4444' }]}>
                <Text style={styles.macroPillLabel}>Fats</Text>
                <Text style={styles.macroPillVal}>18 / {INITIAL_TARGETS.fat}g</Text>
              </View>
            </View>
          </View>

          {/* Hydration Widget */}
          <View style={styles.waterCard}>
            <View style={styles.waterHeader}>
              <Text style={styles.waterTitle}>💧 Hydration Tracker</Text>
              <Text style={styles.waterProgress}>{waterMl} / {INITIAL_TARGETS.water} ml</Text>
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
          <Text style={styles.sectionTitle}>Today's Logged Meals</Text>
          {meals.map(item => (
            <View key={item.id} style={styles.mealCard}>
              <View style={styles.mealCardTop}>
                <Text style={styles.mealCategory}>{item.category}</Text>
                <Text style={styles.mealCalories}>{item.calories} kcal</Text>
              </View>
              <Text style={styles.mealTitle}>{item.title}</Text>
              <Text style={styles.mealMacros}>Protein: {item.protein}g • Carbs: {item.carbs}g • Fat: {item.fat}g</Text>
            </View>
          ))}
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
                style={[styles.messageBubble, m.sender === 'user' ? styles.userBubble : styles.aiBubble]}
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
              placeholder="Ask nutritionist advice..."
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI Food Camera Scanner Tab */}
      {activeTab === 'camera' && (
        <View style={styles.cameraPlaceholderContainer}>
          <Text style={styles.cameraIcon}>📸</Text>
          <Text style={styles.cameraTitle}>AI Food Lens</Text>
          <Text style={styles.cameraDesc}>
            Point camera at your plate. AI Vision analyzes ingredients, calculates calories, and estimates macronutrients automatically.
          </Text>
          <TouchableOpacity 
            style={styles.scanBtn}
            onPress={() => {
              alert("AI Vision: Detected Grilled Salmon & Sweet Potato (480 kcal, 42g Protein)");
            }}
          >
            <Text style={styles.scanBtnText}>Snap & Analyze Plate</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabActive]}>📊 Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('camera')}>
          <Text style={[styles.tabLabel, activeTab === 'camera' && styles.tabActive]}>📸 Scanner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('chat')}>
          <Text style={[styles.tabLabel, activeTab === 'chat' && styles.tabActive]}>🤖 AI Coach</Text>
        </TouchableOpacity>
      </View>

      {/* Log Meal Modal */}
      <Modal visible={isLogModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Log Food</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Food name (e.g. Greek Yogurt & Honey)"
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
                <Text style={styles.saveBtnText}>Save</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 12, color: '#64748b' },
  addBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  scrollContent: { padding: 16 },
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
  cameraPlaceholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  cameraIcon: { fontSize: 60, marginBottom: 16 },
  cameraTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  cameraDesc: { textAlign: 'center', color: '#64748b', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  scanBtn: { backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  scanBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalHeading: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  inputField: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  saveBtn: { backgroundColor: '#10b981', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  saveBtnText: { color: '#ffffff', fontWeight: '700' },
});

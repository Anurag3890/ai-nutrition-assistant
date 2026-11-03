import React, {useState} from 'react';
import {SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';

const API = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const day = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [report, setReport] = useState('');

  async function api(path, method='GET', body, session=token) {
    const response = await fetch(`${API}/api${path}`, {
      method, headers: {'Content-Type':'application/json', ...(session ? {Authorization:`Bearer ${session}`} : {})},
      body:body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      if (response.status === 401 && session) {setUser(null); setToken(''); setSummary(null); setReply(''); setReport('');}
      const error = await response.json().catch(()=>({}));
      throw new Error(typeof error.detail === 'string' ? error.detail : 'Check the entered values and try again.');
    }
    return response.status === 204 ? null : response.json();
  }
  async function run(action) {
    if (busy) return;
    setBusy(true);
    try { await action(); } catch (error) {Alert.alert('NutriAI', error.message);}
    finally {setBusy(false);}
  }
  async function refresh(account=user, session=token) {
    setSummary(await api(`/summary/${account.id}?date_str=${day()}`, 'GET', undefined, session));
  }
  const button = (title, action) => <TouchableOpacity disabled={busy} style={styles.button} onPress={()=>run(action)}><Text style={styles.buttonText}>{title}</Text></TouchableOpacity>;
  const input = (placeholder, value, setter, numeric=false) => <TextInput style={styles.input} placeholder={placeholder} value={value} onChangeText={setter} keyboardType={numeric ? 'decimal-pad' : 'default'}/>;

  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.heading}>NutriAI</Text>
    {busy && <Text accessibilityRole="alert">Saving / loading…</Text>}
    {!user ? <>
      <Text>{registering ? 'Create your account' : 'Sign in'}</Text>
      {registering && input('Full name', name, setName)}
      {input('Phone', phone, setPhone)}
      <TextInput style={styles.input} placeholder="Password (10+ characters for registration)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"/>
      {button(registering ? 'Register' : 'Sign in', async()=>{
        const result = await api(`/auth/${registering ? 'register' : 'login'}`, 'POST', {
          phone, password, ...(registering ? {full_name:name} : {})});
        setToken(result.access_token); setUser(result.user); setPassword(''); setReply(''); setReport('');
        await refresh(result.user, result.access_token);
      })}
      {button(registering ? 'Already registered? Sign in' : 'Create account', async()=>setRegistering(!registering))}
      <Text>Records are saved on the server. Sign in again after restarting the app.</Text>
    </> : <>
      <Text style={styles.title}>{user.full_name}</Text>
      {button('Refresh today', refresh)}
      {summary && <View style={styles.card}>
        <Text style={styles.title}>{summary.macros.calories.consumed} / {summary.macros.calories.target} kcal</Text>
        <Text>Protein {summary.macros.protein_g.consumed} g · Carbs {summary.macros.carbs_g.consumed} g · Fat {summary.macros.fat_g.consumed} g</Text>
        <Text>Water: {summary.hydration.consumed_ml} / {summary.hydration.target_ml} ml</Text>
        {button('Add 250 ml water', async()=>{await api('/hydration','POST',{amount_ml:250,log_date:day()});await refresh();})}
      </View>}
      <Text style={styles.title}>Log a meal</Text>
      <View style={styles.row}>{['breakfast','lunch','dinner','afternoon_snack'].map(type=><TouchableOpacity key={type} disabled={busy} onPress={()=>setMealType(type)}><Text style={mealType===type ? styles.selected : styles.category}>{type.replace('_',' ')}</Text></TouchableOpacity>)}</View>
      {input('Food name', food, setFood)}
      {input('Calories', calories, setCalories, true)}
      {input('Protein (g)', protein, setProtein, true)}
      {input('Carbs (g)', carbs, setCarbs, true)}
      {input('Fat (g)', fat, setFat, true)}
      {button('Save meal', async()=>{
        if (!food.trim() || !calories.trim()) throw new Error('Food name and calories are required.');
        await api('/meals','POST',{food_name:food.trim(),meal_type:mealType,log_date:day(),calories:Number(calories),protein_g:Number(protein),carbs_g:Number(carbs),fat_g:Number(fat)});
        await refresh();setFood('');setCalories('');setProtein('');setCarbs('');setFat('');
      })}
      {summary?.meals_list.map(meal=><View key={meal.id} style={styles.card}>
        <Text>{meal.food_name} · {meal.calories} kcal</Text>
        {button('Delete meal', async()=>{await api(`/meals/${meal.id}`,'DELETE');await refresh();})}
      </View>)}
      <Text style={styles.title}>Coach — local reference guidance</Text>
      {input('Ask a nutrition question',question,setQuestion)}
      {button('Ask',async()=>{const answer=await api('/coach/chat','POST',{message:question});setReply(answer.reply);})}
      <Text>{reply}</Text>
      {button('Past 7 days',async()=>{const result=await api(`/coach/weekly-report/${user.id}`);setReport(`${result.days_with_meals} days with meals. Average on logged days: ${result.average_calories_on_logged_days ?? 'No data'} kcal, ${result.average_protein_on_logged_days ?? 'No data'} g protein. Water logged: ${result.total_water_ml} ml.`);})}
      <Text>{report}</Text>
      <Text>Photo recognition is not configured. Enter and confirm nutrition manually.</Text>
      {button('Sign out',async()=>{await api('/auth/logout','POST');setUser(null);setToken('');setSummary(null);setReply('');setReport('');})}
    </>}
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#f4f7f8'},content:{padding:24,paddingBottom:50,gap:12},
  heading:{fontSize:30,fontWeight:'800',color:'#064e3b'},title:{fontSize:19,fontWeight:'700'},
  input:{backgroundColor:'white',padding:14,borderWidth:1,borderColor:'#cbd5e1',borderRadius:8},
  button:{padding:12,backgroundColor:'#047857',borderRadius:8,marginVertical:4},buttonText:{color:'white',fontWeight:'700',textAlign:'center'},
  card:{backgroundColor:'white',padding:16,borderRadius:10,gap:8},row:{flexDirection:'row',flexWrap:'wrap',gap:12},category:{padding:6},selected:{padding:6,color:'#047857',fontWeight:'800'},
});

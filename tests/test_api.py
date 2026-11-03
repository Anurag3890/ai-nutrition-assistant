"""API regression tests using a new temporary database for every test."""
import tempfile
import time
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from backend.api import create_app
from data.nutrition_data_store import NutritionDataStore


class TrackingAPITest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent)
        self.addCleanup(self.temp.cleanup)
        self.path = str(Path(self.temp.name) / 'test.db')
        self.store = NutritionDataStore(self.path)
        self.client = TestClient(create_app(self.store))
        self.addCleanup(self.client.close)
        self.account = self.register('+919001', 'First Person')
        self.headers = {'Authorization': 'Bearer ' + self.account['access_token']}
        self.user_id = self.account['user']['id']
        self.client.cookies.clear()

    def register(self, phone, name):
        response = self.client.post('/api/auth/register', json={'phone':phone,'password':'Test secret 123!','full_name':name})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def meal(self, **overrides):
        return {'food_name':'Rice and lentils','calories':450,'protein_g':20,'carbs_g':60,'fat_g':10,**overrides}

    def test_passwords_and_session_storage(self):
        with self.store._get_connection() as conn:
            password = conn.execute('SELECT password_hash FROM users WHERE id=?',(self.user_id,)).fetchone()[0]
            token = conn.execute('SELECT token_hash FROM sessions').fetchone()[0]
        self.assertTrue(password.startswith('pbkdf2_sha256$'))
        self.assertNotIn('Test secret', password)
        self.assertNotEqual(token,self.account['access_token'])
        self.assertNotIn('password_hash',self.account['user'])
        self.assertIsNone(self.store.authenticate_user('+919001','wrong'))
        self.assertIsNotNone(self.store.authenticate_user('+919001','Test secret 123!'))

    def test_cookie_session_and_revocation(self):
        response = self.client.post('/api/auth/login',json={'phone':'+919001','password':'Test secret 123!'})
        self.assertEqual(response.status_code,200)
        self.assertIn('HttpOnly',response.headers['set-cookie'])
        self.assertEqual(self.client.get('/api/auth/me').status_code,200)
        token = response.json()['access_token']
        self.assertEqual(self.client.post('/api/auth/logout').status_code,204)
        self.assertEqual(self.client.get('/api/auth/me',headers={'Authorization':'Bearer '+token}).status_code,401)

    def test_expired_and_missing_sessions(self):
        self.assertEqual(self.client.get('/api/meals').status_code,401)
        with self.store._get_connection() as conn:
            conn.execute('UPDATE sessions SET expires_at=?',(time.time()-1,))
        self.assertEqual(self.client.get('/api/meals',headers=self.headers).status_code,401)

    def test_account_isolation(self):
        meal = self.client.post('/api/meals',headers=self.headers,json=self.meal()).json()
        other = self.register('+919002','Other Person')
        headers = {'Authorization':'Bearer '+other['access_token']}
        self.assertEqual(self.client.get('/api/summary/'+self.user_id,headers=headers).status_code,403)
        self.assertEqual(self.client.get('/api/coach/weekly-report/'+self.user_id,headers=headers).status_code,403)
        self.assertEqual(self.client.delete('/api/meals/'+meal['id'],headers=headers).status_code,404)
        self.assertEqual(self.client.put('/api/meals/'+meal['id'],headers=headers,json=self.meal()).status_code,404)
        self.assertEqual(self.client.get('/api/meals',headers=headers).json(),[])
        users = self.client.get('/api/users',headers=headers).json()
        self.assertEqual([u['id'] for u in users],[other['user']['id']])

    def test_crud_hydration_and_restart(self):
        response = self.client.post('/api/meals',headers=self.headers,json=self.meal())
        self.assertEqual(response.status_code,201,response.text)
        meal_id = response.json()['id']
        self.client.post('/api/hydration',headers=self.headers,json={'amount_ml':250})
        self.client.put('/api/meals/'+meal_id,headers=self.headers,json=self.meal(calories=500))
        with TestClient(create_app(NutritionDataStore(self.path))) as restarted:
            summary = restarted.get('/api/summary/'+self.user_id,headers=self.headers).json()
        self.assertEqual(summary['macros']['calories']['consumed'],500)
        self.assertEqual(summary['hydration']['consumed_ml'],250)
        self.assertEqual(self.client.delete('/api/meals/'+meal_id,headers=self.headers).status_code,204)
        self.assertEqual(self.client.delete('/api/hydration',headers=self.headers).status_code,204)
        summary = self.client.get('/api/summary/'+self.user_id,headers=self.headers).json()
        self.assertEqual(summary['macros']['calories']['consumed'],0)
        self.assertEqual(summary['hydration']['consumed_ml'],0)

    def test_validation_and_registration_cannot_overwrite(self):
        for invalid in [self.meal(calories=-1), self.meal(food_name=' '), self.meal(user_id='victim'), self.meal(calories=float('inf'))]:
            if invalid['calories'] == float('inf'):
                response=self.client.post('/api/meals',headers={**self.headers,'Content-Type':'application/json'},content='{"food_name":"x","calories":1e999}')
            else:
                response=self.client.post('/api/meals',headers=self.headers,json=invalid)
            self.assertEqual(response.status_code,422,response.text)
        self.assertEqual(self.client.post('/api/hydration',headers=self.headers,json={'amount_ml':-250}).status_code,422)
        response=self.client.post('/api/auth/register',json={'phone':'+919001','password':'different secret','full_name':'Overwrite'})
        self.assertEqual(response.status_code,409)
        response=self.client.post('/api/auth/register',json={'phone':'+919099','password':'different secret','full_name':'Overwrite','id':self.user_id})
        self.assertEqual(response.status_code,422)

    def test_biometrics_and_targets_preserve_password(self):
        for quality in [2,9]:
            response=self.client.put('/api/biometrics',headers=self.headers,json={'weight_kg':70,'sleep_quality':quality})
            self.assertEqual(response.status_code,200,response.text)
            self.assertEqual(response.json()['sleep_quality'],quality)
        response=self.client.put('/api/profile/targets',headers=self.headers,json={'daily_calorie_target':2200,'daily_protein_target_g':150,'daily_carbs_target_g':250,'daily_fat_target_g':70,'daily_water_target_ml':2600})
        self.assertEqual(response.status_code,200,response.text)
        self.assertIsNotNone(self.store.authenticate_user('+919001','Test secret 123!'))
        self.assertNotIn('password_hash',response.json())

    def test_report_does_not_invent_history(self):
        report=self.client.get('/api/coach/weekly-report/'+self.user_id,headers=self.headers).json()
        self.assertEqual(report['days_with_meals'],0)
        self.assertIsNone(report['average_calories_on_logged_days'])
        self.client.post('/api/meals',headers=self.headers,json=self.meal())
        report=self.client.get('/api/coach/weekly-report/'+self.user_id,headers=self.headers).json()
        self.assertEqual(report['average_calories_on_logged_days'],450)
        self.assertEqual(report['days_with_meals'],1)

    def test_cross_origin_mutation_rejected(self):
        self.assertEqual(self.client.post('/api/hydration',headers={**self.headers,'Origin':'https://untrusted.example'},json={'amount_ml':250}).status_code,403)

    def test_authentication_throttle(self):
        for _ in range(9):
            self.assertEqual(self.client.post('/api/auth/login',json={'phone':'+919001','password':'wrong'}).status_code,401)
        blocked=self.client.post('/api/auth/login',json={'phone':'+919001','password':'Test secret 123!'})
        self.assertEqual(blocked.status_code,429)
        self.assertEqual(blocked.headers['retry-after'],'300')

    def test_blank_legacy_password_does_not_authenticate(self):
        self.store.create_or_update_user({'id':'blank','phone_number':'blank'})
        self.assertIsNone(self.store.authenticate_user('blank','anything'))

    def test_legacy_password_migration(self):
        with self.store._get_connection() as conn:
            conn.execute('UPDATE users SET password_hash=? WHERE id=?',('Legacy123!',self.user_id))
        migrated=NutritionDataStore(self.path)
        self.assertIsNotNone(migrated.authenticate_user('+919001','Legacy123!'))
        with migrated._get_connection() as conn:
            value=conn.execute('SELECT password_hash FROM users WHERE id=?',(self.user_id,)).fetchone()[0]
        self.assertTrue(value.startswith('pbkdf2_sha256$'))


if __name__ == '__main__':
    unittest.main()

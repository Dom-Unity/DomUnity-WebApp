"""
End-to-end REST API tests for the DomUnity Python backend.

Boots the real HTTP API (the same APIHandler the frontend talks to) against a
throwaway MongoDB database and exercises the HTTP contract: auth, profile,
apartment, entrances, residents, issues and payments — mirroring the Node.js
suite so the two backends stay contract-compatible.

When the gRPC stack is not installed (e.g. local Python without grpcio), the
gRPC modules are stubbed — only the REST layer is under test here.

Skips gracefully when MongoDB is not available.
"""
import json
import os
import sys
import types
import logging
import unittest
import urllib.error
import urllib.request
from unittest.mock import MagicMock

# Environment must be set before importing the server module.
os.environ['MONGODB_URI'] = os.getenv('TEST_API_MONGODB_URI', 'mongodb://localhost:27017/domunity_pyapi_test')
os.environ['JWT_SECRET'] = 'api-test-secret'

sys.path.insert(0, os.path.dirname(__file__))

# Stub the gRPC stack when it is unavailable; the REST layer does not need it.
try:
    import grpc  # noqa: F401
    import domunity_pb2  # noqa: F401
    import domunity_pb2_grpc  # noqa: F401
except Exception:
    sys.modules['grpc'] = MagicMock()
    sys.modules['grpc_reflection'] = MagicMock()
    sys.modules['grpc_reflection.v1alpha'] = MagicMock()
    sys.modules['domunity_pb2'] = MagicMock()
    _pb2_grpc = types.ModuleType('domunity_pb2_grpc')
    for _name in (
        'AuthServiceServicer', 'UserServiceServicer', 'BuildingServiceServicer',
        'FinancialServiceServicer', 'EventServiceServicer', 'ContactServiceServicer',
        'HealthServiceServicer',
    ):
        # Real (empty) classes so the servicer class definitions can subclass them.
        setattr(_pb2_grpc, _name, type(_name, (), {}))
    sys.modules['domunity_pb2_grpc'] = _pb2_grpc

import pymongo  # noqa: E402

import server  # noqa: E402  (imports APIHandler + start_http_api_server)

logging.disable(logging.INFO)  # keep test output readable

PORT = 18130
BASE = f'http://127.0.0.1:{PORT}'
DB_NAME = os.environ['MONGODB_URI'].rsplit('/', 1)[-1]


def req(method, path, body=None, token=None):
    """Make an HTTP request to the test server; returns (status, json)."""
    request = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode('utf-8') if body is not None else None,
        method=method,
    )
    request.add_header('Content-Type', 'application/json')
    if token:
        request.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(request, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode('utf-8'))
        except Exception:
            return e.code, None


def login(email, password):
    status, data = req('POST', '/api/auth/login', {'email': email, 'password': password})
    token = data.get('access_token') if isinstance(data, dict) else None
    return status, data, token


class TestRestApi(unittest.TestCase):
    """Ordered end-to-end flow against the seeded sample data."""

    httpd = None
    db = None

    @classmethod
    def setUpClass(cls):
        # Verify MongoDB is reachable, then start from a clean database.
        try:
            probe = pymongo.MongoClient(os.environ['MONGODB_URI'], serverSelectionTimeoutMS=2000)
            probe.admin.command('ping')
            probe.drop_database(DB_NAME)
            probe.close()
        except Exception:
            raise unittest.SkipTest('Test database (MongoDB) not available')

        cls.db = server.Database()  # seeds sample data on the empty DB
        cls.httpd = server.start_http_api_server(PORT, cls.db)

    @classmethod
    def tearDownClass(cls):
        if cls.httpd:
            cls.httpd.shutdown()
        if cls.db:
            client = pymongo.MongoClient(os.environ['MONGODB_URI'])
            client.drop_database(DB_NAME)
            client.close()
            cls.db.close()

    # ---- Health & auth ----

    def test_01_health(self):
        status, data = req('GET', '/health')
        self.assertEqual(status, 200)
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['database'], 'connected')

    def test_02_login_success_returns_role(self):
        status, data, _ = login('ivan.ivanov@example.com', 'test123')
        self.assertEqual(status, 200)
        self.assertTrue(data['success'])
        self.assertTrue(data['access_token'])
        self.assertEqual(data['user']['role'], 'user')

    def test_03_login_wrong_password(self):
        status, data, _ = login('ivan.ivanov@example.com', 'WRONG')
        self.assertEqual(status, 401)
        self.assertFalse(data['success'])

    def test_04_login_deactivated_blocked(self):
        # petar.petrov is seeded with is_active: False
        status, data, _ = login('petar.petrov@example.com', 'test123')
        self.assertEqual(status, 403)
        self.assertFalse(data['success'])

    def test_05_register_and_duplicate(self):
        status, data = req('POST', '/api/auth/register',
                           {'email': 'fresh@test.bg', 'password': 'freshpass1', 'full_name': 'Fresh User'})
        self.assertEqual(status, 201)
        self.assertTrue(data['success'])

        status, data = req('POST', '/api/auth/register',
                           {'email': 'fresh@test.bg', 'password': 'freshpass1'})
        self.assertEqual(status, 400)
        self.assertIn('already registered', data['message'])

    def test_06_change_password_flow(self):
        req('POST', '/api/auth/register', {'email': 'pwuser@test.bg', 'password': 'origpass1'})
        _, _, token = login('pwuser@test.bg', 'origpass1')

        status, _ = req('POST', '/api/user/password',
                        {'old_password': 'WRONG', 'new_password': 'newpass99'}, token)
        self.assertEqual(status, 400)

        status, _ = req('POST', '/api/user/password',
                        {'old_password': 'origpass1', 'new_password': 'newpass99'}, token)
        self.assertEqual(status, 200)

        self.assertEqual(login('pwuser@test.bg', 'origpass1')[0], 401)
        self.assertEqual(login('pwuser@test.bg', 'newpass99')[0], 200)

    def test_07_forgot_password(self):
        status, data = req('POST', '/api/auth/forgot', {'name': 'Ivan', 'email': 'ivan.ivanov@example.com'})
        self.assertEqual(status, 200)
        self.assertTrue(data['success'])

    # ---- Profile & apartment ----

    def test_10_profile_requires_auth(self):
        self.assertEqual(req('GET', '/api/user/profile')[0], 401)

    def test_11_profile_content(self):
        _, _, token = login('ivan.ivanov@example.com', 'test123')
        status, data = req('GET', '/api/user/profile', token=token)
        self.assertEqual(status, 200)
        self.assertEqual(data['user']['email'], 'ivan.ivanov@example.com')
        self.assertTrue(data['building']['address'])
        self.assertEqual(data['apartment']['number'], 1)
        self.assertGreater(len(data['payments']), 0)
        self.assertIn('financial_summary', data)

    def test_12_apartment_details_with_payment_ids(self):
        _, _, token = login('ivan.ivanov@example.com', 'test123')
        status, data = req('GET', '/api/user/apartment', token=token)
        self.assertEqual(status, 200)
        self.assertEqual(data['apartmentInfo']['number'], '1')
        self.assertGreater(len(data['payments']), 0)
        self.assertTrue(data['payments'][0]['id'])
        self.assertIsInstance(data['maintenance'], list)

    def test_13_apartment_404_for_user_without_one(self):
        _, _, token = login('fresh@test.bg', 'freshpass1')
        status, data = req('GET', '/api/user/apartment', token=token)
        self.assertEqual(status, 404)
        self.assertEqual(data['error'], 'No apartment found for user')

    def test_14_building_apartments_legacy_numeric_id(self):
        # Regression: this used to crash with ObjectId('1') after the Mongo migration.
        _, _, token = login('ivan.ivanov@example.com', 'test123')
        status, data = req('GET', '/api/building/1/apartments', token=token)
        self.assertEqual(status, 200)
        self.assertEqual(data['building']['entrance'], 'Б')
        self.assertGreater(len(data['floors']), 0)

    # ---- Admin: residents & entrances ----

    def test_20_residents_auth_levels(self):
        self.assertEqual(req('GET', '/api/admin/residents')[0], 401)
        _, _, ivan = login('ivan.ivanov@example.com', 'test123')
        self.assertEqual(req('GET', '/api/admin/residents', token=ivan)[0], 403)

        _, _, admin = login('admin@domunity.bg', 'test123')
        status, data = req('GET', '/api/admin/residents', token=admin)
        self.assertEqual(status, 200)
        ivan_row = next(r for r in data['residents'] if r['email'] == 'ivan.ivanov@example.com')
        self.assertEqual(ivan_row['entrance'], 'Б')
        self.assertEqual(ivan_row['apartment'], '1')

    def test_21_create_entrance_sequential_numbering(self):
        _, _, admin = login('admin@domunity.bg', 'test123')
        status, data = req('POST', '/api/admin/entrances',
                           {'address': 'API Street 1', 'entrance': 'T',
                            'floorsCount': 3, 'apartmentsPerFloor': 2}, admin)
        self.assertEqual(status, 201)
        nums = sorted(a['number'] for f in data['entrance']['floors'] for a in f['apartments'])
        self.assertEqual(nums, [1, 2, 3, 4, 5, 6])
        top = next(f for f in data['entrance']['floors'] if f['floor'] == 3)
        self.assertEqual(sorted(a['number'] for a in top['apartments']), [5, 6])

    def test_22_entrance_duplicate_and_forbidden(self):
        _, _, admin = login('admin@domunity.bg', 'test123')
        status, _ = req('POST', '/api/admin/entrances',
                        {'address': 'API Street 1', 'entrance': 'T',
                         'floorsCount': 1, 'apartmentsPerFloor': 1}, admin)
        self.assertEqual(status, 409)

        _, _, ivan = login('ivan.ivanov@example.com', 'test123')
        status, _ = req('POST', '/api/admin/entrances',
                        {'address': 'API Street 2', 'entrance': 'A',
                         'floorsCount': 1, 'apartmentsPerFloor': 1}, ivan)
        self.assertEqual(status, 403)

    def test_23_create_resident_with_temp_password(self):
        _, _, admin = login('admin@domunity.bg', 'test123')
        status, data = req('POST', '/api/admin/residents',
                           {'name': 'API Resident', 'email': 'apires@test.bg',
                            'building': 'API Street 1', 'entrance': 'T', 'apartment': '3',
                            'residentsCount': 2, 'clientNumber': 'C-100', 'balance': 5}, admin)
        self.assertEqual(status, 201)
        self.assertTrue(data['temp_password'])

        status, _, token = login('apires@test.bg', data['temp_password'])
        self.assertEqual(status, 200)

        status, apt = req('GET', '/api/user/apartment', token=token)
        self.assertEqual(status, 200)
        self.assertEqual(apt['apartmentInfo']['number'], '3')
        self.assertEqual(apt['apartmentInfo']['clientNumber'], 'C-100')

    def test_24_manager_role_mapping_and_staff_access(self):
        _, _, admin = login('admin@domunity.bg', 'test123')
        status, data = req('POST', '/api/admin/residents',
                           {'name': 'API Manager', 'email': 'apimgr@test.bg',
                            'building': 'API Street 1', 'entrance': 'T', 'apartment': '4',
                            'residentsCount': 1, 'role': 'Домоуправител'}, admin)
        self.assertEqual(status, 201)

        status, login_data, mgr = login('apimgr@test.bg', data['temp_password'])
        self.assertEqual(status, 200)
        self.assertEqual(login_data['user']['role'], 'manager')

        self.assertEqual(req('GET', '/api/admin/issues', token=mgr)[0], 200)
        self.assertEqual(req('GET', '/api/admin/residents', token=mgr)[0], 403)

    def test_25_update_resident_preserves_role(self):
        _, _, admin = login('admin@domunity.bg', 'test123')
        _, data = req('GET', '/api/admin/residents', token=admin)
        mgr_row = next(r for r in data['residents'] if r['email'] == 'apimgr@test.bg')
        self.assertEqual(mgr_row['role'], 'manager')

        status, _ = req('PUT', f"/api/admin/residents/{mgr_row['id']}",
                        {'name': 'API Manager Renamed', 'balance': 1}, admin)  # no role sent
        self.assertEqual(status, 200)

        _, data = req('GET', '/api/admin/residents', token=admin)
        after = next(r for r in data['residents'] if r['email'] == 'apimgr@test.bg')
        self.assertEqual(after['role'], 'manager')
        self.assertEqual(after['name'], 'API Manager Renamed')

    def test_26_entrance_grow_shrink_preserves_data(self):
        _, _, admin = login('admin@domunity.bg', 'test123')
        _, data = req('GET', '/api/admin/entrances', token=admin)
        ent = next(e for e in data['entrances'] if e['entrance'] == 'T')

        status, grown = req('PUT', f"/api/admin/entrances/{ent['id']}",
                            {'entrance': 'T', 'address': 'API Street 1',
                             'floorsCount': 4, 'apartmentsPerFloor': 2}, admin)
        self.assertEqual(status, 200)
        apts = [a for f in grown['entrance']['floors'] for a in f['apartments']]
        self.assertEqual(len(apts), 8)
        self.assertEqual(next(a for a in apts if a['number'] == 3)['family'], 'API Resident')

        status, shrunk = req('PUT', f"/api/admin/entrances/{ent['id']}",
                             {'entrance': 'T', 'address': 'API Street 1',
                              'floorsCount': 2, 'apartmentsPerFloor': 2}, admin)
        self.assertEqual(status, 200)
        apts = [a for f in shrunk['entrance']['floors'] for a in f['apartments']]
        self.assertEqual(sorted(a['number'] for a in apts), [1, 2, 3, 4])
        self.assertEqual(next(a for a in apts if a['number'] == 3)['family'], 'API Resident')

    # ---- Issues ----

    def test_30_issue_lifecycle(self):
        _, _, ivan = login('ivan.ivanov@example.com', 'test123')
        _, _, admin = login('admin@domunity.bg', 'test123')

        # Resident creates and lists
        status, created = req('POST', '/api/issues',
                              {'title': 'API leak', 'description': 'Water on floor 1',
                               'category': 'plumbing'}, ivan)
        self.assertEqual(status, 201)
        issue_id = created['id']

        status, mine = req('GET', '/api/issues', token=ivan)
        self.assertEqual(status, 200)
        found = next(i for i in mine['issues'] if i['id'] == issue_id)
        self.assertEqual(found['status'], 'new')

        # Validation + auth
        self.assertEqual(req('POST', '/api/issues', {'title': '  '}, ivan)[0], 400)
        self.assertEqual(req('GET', '/api/issues')[0], 401)
        self.assertEqual(req('GET', '/api/admin/issues', token=ivan)[0], 403)

        # Staff view includes resident + location
        status, all_issues = req('GET', '/api/admin/issues', token=admin)
        self.assertEqual(status, 200)
        row = next(i for i in all_issues['issues'] if i['id'] == issue_id)
        self.assertEqual(row['resident_name'], 'Иван Иванов')
        self.assertEqual(row['apartment'], '1')

        # Status workflow
        self.assertEqual(req('PUT', f'/api/admin/issues/{issue_id}/status',
                             {'status': 'nonsense'}, admin)[0], 400)
        self.assertEqual(req('PUT', f'/api/admin/issues/{issue_id}/status',
                             {'status': 'in_progress'}, admin)[0], 200)

        status, filtered = req('GET', '/api/admin/issues?status=in_progress', token=admin)
        self.assertEqual(status, 200)
        self.assertIn(issue_id, [i['id'] for i in filtered['issues']])
        self.assertTrue(all(i['status'] == 'in_progress' for i in filtered['issues']))

        # Replies: staff + owner allowed, others forbidden
        self.assertEqual(req('POST', f'/api/issues/{issue_id}/reply',
                             {'message': 'Plumber scheduled.'}, admin)[0], 200)
        self.assertEqual(req('POST', f'/api/issues/{issue_id}/reply',
                             {'message': 'Thank you!'}, ivan)[0], 200)
        _, _, maria = login('m.georgieva@example.com', 'test123')
        self.assertEqual(req('POST', f'/api/issues/{issue_id}/reply',
                             {'message': 'intruding'}, maria)[0], 403)

        _, mine = req('GET', '/api/issues', token=ivan)
        issue = next(i for i in mine['issues'] if i['id'] == issue_id)
        self.assertEqual(issue['status'], 'in_progress')
        self.assertEqual(len(issue['replies']), 2)
        self.assertEqual(issue['replies'][0]['author_role'], 'admin')

    # ---- Meetings ----

    def test_35_meetings(self):
        _, _, ivan = login('ivan.ivanov@example.com', 'test123')
        _, _, admin = login('admin@domunity.bg', 'test123')

        # Auth required; seeded built-in meeting present
        self.assertEqual(req('GET', '/api/meetings')[0], 401)
        status, data = req('GET', '/api/meetings', token=ivan)
        self.assertEqual(status, 200)
        seeded = next(m for m in data['meetings'] if m['online_provider'] == 'jitsi')
        self.assertTrue(seeded['online_url'].startswith('https://meet.jit.si/'))

        # Non-staff cannot create
        self.assertEqual(req('POST', '/api/admin/meetings', {'title': 'nope'}, ivan)[0], 403)

        # Built-in meeting auto-generates a Jitsi room
        status, created = req('POST', '/api/admin/meetings',
                              {'title': 'Extraordinary assembly', 'online_provider': 'jitsi',
                               'date': '2026-07-01T18:00:00+00:00'}, admin)
        self.assertEqual(status, 201)
        self.assertTrue(created['meeting']['online_url'].startswith('https://meet.jit.si/DomUnity-'))

        # External provider link stored verbatim and visible to residents
        status, zoom = req('POST', '/api/admin/meetings',
                           {'title': 'Zoom call', 'online_provider': 'zoom',
                            'online_url': 'https://zoom.us/j/123'}, admin)
        self.assertEqual(status, 201)
        self.assertEqual(zoom['meeting']['online_url'], 'https://zoom.us/j/123')

        _, listing = req('GET', '/api/meetings', token=ivan)
        self.assertIn(zoom['id'], [m['id'] for m in listing['meetings']])

        # Delete: residents blocked, staff allowed
        self.assertEqual(req('DELETE', f"/api/admin/meetings/{zoom['id']}", token=ivan)[0], 403)
        self.assertEqual(req('DELETE', f"/api/admin/meetings/{zoom['id']}", token=admin)[0], 200)
        _, after = req('GET', '/api/meetings', token=ivan)
        self.assertNotIn(zoom['id'], [m['id'] for m in after['meetings']])

    # ---- Payments ----

    def test_40_pay_own_invoice_only(self):
        _, _, ivan = login('ivan.ivanov@example.com', 'test123')
        _, _, maria = login('m.georgieva@example.com', 'test123')

        _, apt = req('GET', '/api/user/apartment', token=ivan)
        pending = next(p for p in apt['payments'] if p['status'] != 'paid')

        # Maria cannot pay Ivan's invoice
        self.assertEqual(req('POST', '/api/payments/pay',
                             {'payment_id': pending['id']}, maria)[0], 404)

        # Ivan can
        self.assertEqual(req('POST', '/api/payments/pay',
                             {'payment_id': pending['id']}, ivan)[0], 200)

        _, after = req('GET', '/api/user/apartment', token=ivan)
        self.assertEqual(next(p for p in after['payments'] if p['id'] == pending['id'])['status'], 'paid')


if __name__ == '__main__':
    unittest.main()

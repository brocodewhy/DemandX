import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

from app import main


class ProfileTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.storage_patch = patch.object(main, "STORAGE", Path(self.temp_dir.name))
        self.storage_patch.start()
        self.user = {
            "sub": "verified-google-subject",
            "email": "person@example.com",
            "name": "Google Name",
            "picture": "https://example.com/profile.png",
        }

    def tearDown(self):
        self.storage_patch.stop()
        self.temp_dir.cleanup()

    def test_profile_updates_persist_without_changing_google_identity(self):
        updated = main.update_me(
            main.ProfileUpdate(display_name="DemandX User", organization="Northwind"),
            self.user,
        )
        self.assertEqual(updated["name"], "DemandX User")
        self.assertEqual(updated["organization"], "Northwind")
        self.assertEqual(updated["email"], self.user["email"])
        self.assertEqual(updated["picture"], self.user["picture"])

        root = main.user_root(self.user)
        saved = json.loads((root / "profile.json").read_text(encoding="utf-8"))
        self.assertEqual(saved, {"display_name": "DemandX User", "organization": "Northwind"})
        self.assertEqual(main.me(self.user), updated)

    def test_profile_endpoints_are_protected_by_verified_user_dependency(self):
        profile_routes = [
            route for route in main.app.routes
            if getattr(route, "path", None) == "/api/me"
        ]
        self.assertEqual({method for route in profile_routes for method in route.methods}, {"GET", "PUT"})
        for route in profile_routes:
            self.assertTrue(any(dependency.call is main.current_user for dependency in route.dependant.dependencies))

        with patch.object(main, "GOOGLE_CLIENT_ID", "test-client-id"):
            with self.assertRaises(HTTPException) as error:
                main.current_user(authorization=None)
        self.assertEqual(error.exception.status_code, 401)

    def test_blank_display_name_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            main.update_me(main.ProfileUpdate(display_name="   "), self.user)
        self.assertEqual(error.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()

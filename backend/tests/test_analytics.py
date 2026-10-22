import json
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

import pandas as pd

from app import main


class AnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.storage_patch = patch.object(main, "STORAGE", Path(self.temp_dir.name))
        self.storage_patch.start()
        self.user = {"sub": "analytics-user"}
        self.dataset_id = str(uuid.uuid4())
        dataset_root = main.user_root(self.user) / "datasets" / self.dataset_id
        dataset_root.mkdir(parents=True)
        pd.DataFrame({
            "date": ["2025-01-03", "2025-01-01", "2025-01-03", "2025-01-01", "invalid"],
            "quantity": [4, 2, 1, 2, 9],
            "product": ["A", "A", "B", "A", "A"],
        }).to_csv(dataset_root / "data.csv", index=False)
        (dataset_root / "meta.json").write_text(json.dumps({"date_col": "date"}), encoding="utf-8")

    def tearDown(self):
        self.storage_patch.stop()
        self.temp_dir.cleanup()

    def test_analytics_returns_sorted_deduplicated_daily_totals_and_daily_weekday_means(self):
        result = main.analytics(
            self.dataset_id,
            main.AnalyticsRequest(date_col="date", target_col="quantity", product_col="product"),
            self.user,
        )

        self.assertEqual(result["measure"], "quantity")
        self.assertEqual([row["date"] for row in result["daily"]], ["2025-01-01", "2025-01-02", "2025-01-03"])
        self.assertEqual([row["demand"] for row in result["daily"]], [2.0, 0.0, 5.0])
        self.assertEqual(result["summary"]["total_demand"], 7.0)
        self.assertAlmostEqual(result["summary"]["average_demand"], 7 / 3)
        self.assertEqual(result["summary"]["rows"], 3)
        self.assertEqual(result["summary"]["duplicate_rows_excluded"], 1)
        self.assertEqual(result["weekday"][2], {"day": "Wednesday", "demand": 2.0, "measure": "quantity"})
        self.assertEqual(result["weekday"][4], {"day": "Friday", "demand": 5.0, "measure": "quantity"})
        self.assertEqual(result["products"], [
            {"name": "A", "demand": 6.0, "measure": "quantity"},
            {"name": "B", "demand": 1.0, "measure": "quantity"},
        ])


if __name__ == "__main__":
    unittest.main()

import unittest

import pandas as pd

from app.data_cleaner import clean_dataset


class CleaningTests(unittest.TestCase):
    def test_outliers_are_reported_but_not_silently_removed(self):
        frame = pd.DataFrame({"demand": [1, 2, 3, 4, 5, 6, 1000]})
        cleaned, report = clean_dataset(frame, target_col="demand")

        self.assertEqual(report["target_outliers_flagged"], 1)
        self.assertIn(1000, cleaned["demand"].tolist())
        self.assertTrue(any("retained them unchanged" in action for action in report["actions"]))


if __name__ == "__main__":
    unittest.main()

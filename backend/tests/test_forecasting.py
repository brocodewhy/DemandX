import unittest
import numpy as np
import pandas as pd
from datetime import date, timedelta
from fastapi import HTTPException
from app.main import daily_series, evaluate_series, features_for_series, validate_forecast_date

class ForecastingTests(unittest.TestCase):
    def setUp(self):
        dates = pd.date_range('2025-01-01', periods=75, freq='D')
        self.frame = pd.DataFrame({
            'date': list(dates) * 2,
            'product': ['Tea'] * 75 + ['Coffee'] * 75,
            'quantity': [int(8 + (i % 7) + (i // 14)) for i in range(75)] + [int(4 + (i % 5) + (i // 18)) for i in range(75)],
        })

    def test_daily_series_filters_product(self):
        series = daily_series(self.frame, 'date', 'quantity', 'product', 'Tea')
        self.assertEqual(len(series), 75)
        self.assertEqual(float(series.iloc[0]), 8.0)

    def test_daily_series_sorts_dates_deduplicates_and_fills_gaps(self):
        frame = pd.DataFrame({
            'date': ['2025-01-03', '2025-01-01', '2025-01-03', 'invalid'],
            'quantity': [4, 2, 4, 10],
        })
        series = daily_series(frame, 'date', 'quantity')
        self.assertEqual(list(series.index.strftime('%Y-%m-%d')), ['2025-01-01', '2025-01-02', '2025-01-03'])
        self.assertEqual(series.tolist(), [2.0, 0.0, 4.0])

    def test_features_have_lags_and_drop_warmup(self):
        series = daily_series(self.frame, 'date', 'quantity', 'product', 'Tea')
        features = features_for_series(series)
        self.assertIn('lag_7', features.columns)
        self.assertIn('rolling_14', features.columns)
        self.assertLess(len(features), len(series))

    def test_evaluation_returns_real_metrics_and_holdout_predictions(self):
        series = daily_series(self.frame, 'date', 'quantity', 'product', 'Tea')
        metrics, predictions = evaluate_series(series, 'gradient_boosting')
        self.assertGreaterEqual(metrics['mae'], 0)
        self.assertGreaterEqual(metrics['rmse'], 0)
        self.assertTrue(predictions)
        self.assertIn('actual', predictions[0])
        self.assertIn('predicted', predictions[0])
        self.assertIn('baseline', metrics)
        self.assertGreaterEqual(metrics['baseline']['mae'], 0)
        self.assertIsNotNone(metrics['mape_percent'])

    def test_mape_is_reported_only_when_actual_values_are_nonzero(self):
        series = pd.Series(
            [0.0 if i == 70 else float(i + 1) for i in range(75)],
            index=pd.date_range('2025-01-01', periods=75, freq='D'),
        )
        metrics, _ = evaluate_series(series, 'gradient_boosting')
        self.assertIsNone(metrics['mape_percent'])

    def test_order_count_forecasts_are_rounded_to_whole_counts(self):
        series = pd.Series(
            [float(7 + (i % 5) + (i // 12)) for i in range(75)],
            index=pd.date_range('2025-01-01', periods=75, freq='D'),
        )
        _, predictions = evaluate_series(series, 'gradient_boosting', 'orders')
        self.assertTrue(all(row['predicted'].is_integer() for row in predictions))

    def test_forecast_date_must_be_after_history_and_within_horizon(self):
        latest = date(2025, 3, 1)
        validate_forecast_date(latest + timedelta(days=1), latest)
        with self.assertRaises(HTTPException):
            validate_forecast_date(latest, latest)
        with self.assertRaises(HTTPException):
            validate_forecast_date(latest + timedelta(days=181), latest)

if __name__ == '__main__':
    unittest.main()

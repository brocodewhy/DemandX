import pandas as pd
import numpy as np


def clean_dataset(df, date_col=None, target_col=None):
    out = df.copy()
    before_rows = len(out)
    before_missing = int(out.isna().sum().sum())
    before_duplicates = int(out.duplicated().sum())
    actions = []
    target_outliers_flagged = 0

    if before_duplicates:
        out = out.drop_duplicates().copy()
        actions.append(f"Removed {before_duplicates} exact duplicate rows.")

    if date_col and date_col in out.columns:
        parsed = pd.to_datetime(out[date_col], errors="coerce", format="mixed")
        invalid = int(parsed.isna().sum())
        out[date_col] = parsed
        if invalid:
            actions.append(f"Converted the detected date column and found {invalid} invalid/missing date values.")
            if target_col and target_col in out.columns:
                before = len(out)
                out = out.dropna(subset=[date_col]).copy()
                removed = before - len(out)
                if removed:
                    actions.append(f"Removed {removed} rows with unusable dates because the date is needed for analysis/modeling.")

    # Convert numeric-looking object columns conservatively.
    for col in list(out.columns):
        if col == date_col:
            continue
        if out[col].dtype == "object":
            converted = pd.to_numeric(out[col], errors="coerce")
            if converted.notna().mean() >= 0.90:
                out[col] = converted
                actions.append(f"Converted numeric-looking column '{col}' to numeric.")

    # Target missing values are excluded from model-ready data.
    if target_col and target_col in out.columns:
        target_numeric = pd.to_numeric(out[target_col], errors="coerce").replace([np.inf, -np.inf], np.nan)
        out[target_col] = target_numeric
        missing_target = int(out[target_col].isna().sum())
        if missing_target:
            out = out.dropna(subset=[target_col]).copy()
            actions.append(f"Removed {missing_target} rows with missing/invalid target values instead of imputing the target.")
        if not out.empty:
            q1, q3 = out[target_col].quantile([0.25, 0.75])
            iqr = q3 - q1
            if pd.notna(iqr) and iqr > 0:
                target_outliers_flagged = int(((out[target_col] < q1 - 1.5 * iqr) | (out[target_col] > q3 + 1.5 * iqr)).sum())
                if target_outliers_flagged:
                    actions.append(f"Flagged {target_outliers_flagged} statistical outlier value(s) in '{target_col}' and retained them unchanged for review.")

    # Impute remaining feature columns sensibly.
    for col in out.columns:
        if col == target_col or col == date_col:
            continue
        if out[col].isna().sum() == 0:
            continue
        if pd.api.types.is_numeric_dtype(out[col]):
            median = out[col].median()
            if pd.notna(median):
                out[col] = out[col].fillna(median)
                actions.append(f"Filled missing numeric values in '{col}' with its median.")
            else:
                out[col] = out[col].fillna(0)
                actions.append(f"Filled unusable numeric values in '{col}' with 0 because no median was available.")
        else:
            mode = out[col].mode(dropna=True)
            fill_value = mode.iloc[0] if not mode.empty else "Unknown"
            out[col] = out[col].fillna(fill_value)
            actions.append(f"Filled missing categorical values in '{col}' with '{fill_value}'.")

    after_rows = len(out)
    after_missing = int(out.isna().sum().sum())
    after_duplicates = int(out.duplicated().sum())

    return out, {
        "before_rows": before_rows,
        "before_missing": before_missing,
        "before_duplicates": before_duplicates,
        "after_rows": after_rows,
        "after_missing": after_missing,
        "after_duplicates": after_duplicates,
        "target_outliers_flagged": target_outliers_flagged,
        "actions": actions,
    }

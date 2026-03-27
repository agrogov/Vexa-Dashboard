# build_image.sh — File Permission Change

## Summary

Changed `build_image.sh` file mode from `100644` (non-executable) to `100755` (executable).

## Why

The script needs to be directly executable (`./build_image.sh`) without requiring an explicit `bash build_image.sh` invocation. This is a permission-only change with no content modifications.

## Files Changed

- `build_image.sh` — mode `100644` → `100755`

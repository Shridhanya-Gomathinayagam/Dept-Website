# Stop the local development PostgreSQL server.
$root = Split-Path -Parent $PSScriptRoot
& "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" stop -D (Join-Path $root ".pgdata") -m fast

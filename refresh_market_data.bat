@echo off
REM Yhdistää kaikki c:\temp\scripts\autotalli\parsed_car_data_YYYY-MM-DD.json -tiedostot
REM ja päivittää data\merged_parsed.json, data\price_timeseries.json, data\market_stats.json
cd /d "%~dp0"
node scripts\run_merge_and_build.mjs %*
if errorlevel 1 exit /b 1

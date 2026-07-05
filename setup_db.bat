@echo off
echo ===================================================
echo CineMatch Database Setup
echo ===================================================
echo Make sure you have created the 'cinematch_user' in MySQL Workbench first!
echo.
set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
set USERNAME=cinematch_user
set PASSWORD=password123

echo Loading Schema...
%MYSQL_PATH% -u %USERNAME% -p%PASSWORD% < database\schema.sql
echo Loading Tables...
%MYSQL_PATH% -u %USERNAME% -p%PASSWORD% < database\tables.sql
echo Loading Functions...
%MYSQL_PATH% -u %USERNAME% -p%PASSWORD% < database\functions.sql
echo Loading Triggers...
%MYSQL_PATH% -u %USERNAME% -p%PASSWORD% < database\triggers.sql
echo Loading Constraints...
%MYSQL_PATH% -u %USERNAME% -p%PASSWORD% < database\constraints.sql
echo Loading Indexes...
%MYSQL_PATH% -u %USERNAME% -p%PASSWORD% < database\indexes.sql
echo Loading Views...
%MYSQL_PATH% -u %USERNAME% -p%PASSWORD% < database\views.sql
echo Loading Procedures...
%MYSQL_PATH% -u %USERNAME% -p%PASSWORD% < database\procedures.sql
echo Loading Sample Data...
%MYSQL_PATH% -u %USERNAME% -p%PASSWORD% < database\sample_data.sql

echo.
echo ===================================================
echo Database setup completed successfully!
echo ===================================================
pause

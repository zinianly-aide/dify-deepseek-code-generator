SELECT COUNT(*) AS late_count 
FROM attendance 
WHERE DATE(attendance_date) = CURDATE() 
AND arrival_time > '09:00:00';
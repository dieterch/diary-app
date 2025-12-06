-- Setzt den Autoincrement-Zähler der Tabelle Entry
-- auf die höchste existierende ID zurück.

UPDATE sqlite_sequence
SET seq = (SELECT MAX(id) FROM Entry)
WHERE name = 'Entry';
